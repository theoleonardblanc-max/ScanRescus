from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Header, Query
from starlette.responses import Response as StarletteResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import re
import json
import base64
import logging
import uuid
import secrets
import requests
import bcrypt
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
APP_NAME = "compo-scan"
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_AUTH_SESSION = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---------- Object storage ----------
storage_key = None


def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=120)
    resp.raise_for_status()
    return resp.json()


def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------- Auth helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def set_session_cookie(response: Response, token: str):
    response.set_cookie(key="session_token", value=token, httponly=True, secure=True,
                        samesite="none", max_age=7 * 24 * 3600, path="/")


async def create_session(user_id: str) -> str:
    token = secrets.token_urlsafe(32)
    await db.user_sessions.insert_one({
        "session_token": token,
        "user_id": user_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return token


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Session invalide")
    exp = session["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expirée")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user


# ---------- Models ----------
class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class AnalyzeRequest(BaseModel):
    image_base64: str


class AnalysisUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price_estimate: Optional[str] = None
    description: Optional[str] = None
    is_favorite: Optional[bool] = None


# ---------- Auth routes ----------
@api_router.post("/auth/register")
async def register(body: RegisterInput, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    await db.users.insert_one({
        "user_id": user_id, "email": email, "name": body.name,
        "password_hash": hash_password(body.password), "picture": "",
        "auth_provider": "email", "created_at": datetime.now(timezone.utc).isoformat(),
    })
    token = await create_session(user_id)
    set_session_cookie(response, token)
    return {"user_id": user_id, "email": email, "name": body.name, "picture": "", "session_token": token}


@api_router.post("/auth/login")
async def login(body: LoginInput, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    token = await create_session(user["user_id"])
    set_session_cookie(response, token)
    return {"user_id": user["user_id"], "email": user["email"], "name": user["name"],
            "picture": user.get("picture", ""), "session_token": token}


@api_router.post("/auth/google/session")
async def google_session(response: Response, x_session_id: str = Header(None)):
    if not x_session_id:
        raise HTTPException(status_code=400, detail="session_id manquant")
    r = requests.get(EMERGENT_AUTH_SESSION, headers={"X-Session-ID": x_session_id}, timeout=30)
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Session Google invalide")
    data = r.json()
    email = data["email"].lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": data.get("name", existing["name"]), "picture": data.get("picture", "")}})
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id, "email": email, "name": data.get("name", email),
            "password_hash": "", "picture": data.get("picture", ""),
            "auth_provider": "google", "created_at": datetime.now(timezone.utc).isoformat(),
        })
    session_token = data.get("session_token") or secrets.token_urlsafe(32)
    await db.user_sessions.insert_one({
        "session_token": session_token, "user_id": user_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    set_session_cookie(response, session_token)
    return {"user_id": user_id, "email": email, "name": data.get("name", email), "picture": data.get("picture", ""), "session_token": session_token}


@api_router.get("/auth/me")
async def me(request: Request):
    return await get_current_user(request)


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"success": True}


# ---------- AI ----------
SYSTEM_PROMPT = (
    "Tu es un expert en composants électroniques et pièces informatiques. "
    "À partir d'une photo, identifie le composant principal visible. "
    "Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, avec ces clés exactes : "
    "\"name\" (nom précis du composant en français), "
    "\"category\" (ex: 'Composant électronique' ou 'Pièce informatique'), "
    "\"price_estimate\" (estimation réaliste du prix en euros, ex: '15 - 25 €'), "
    "\"description\" (2 à 4 phrases expliquant à quoi sert ce composant), "
    "\"confidence\" (niveau de confiance: 'Élevée', 'Moyenne' ou 'Faible'). "
    "Si aucun composant n'est identifiable, mets name='Composant inconnu'."
)

OFFERS_PROMPT = (
    "Tu es un comparateur de prix pour composants électroniques et informatiques. "
    "Pour le composant donné, propose 4 offres d'achat réalistes et variées (neuf/reconditionné, différentes qualités). "
    "Réponds UNIQUEMENT avec un JSON valide: une liste de 4 objets avec les clés: "
    "\"seller\" (nom du vendeur/marque, ex: Amazon, LDLC, Cdiscount, TopAchat), "
    "\"price\" (prix en euros, ex: '19,99 €'), "
    "\"quality\" (ex: 'Neuf', 'Reconditionné A+', 'Occasion', 'Premium'), "
    "\"rating\" (note sur 5, ex: '4.5'), "
    "\"note\" (courte phrase sur l'offre, ex: 'Meilleur rapport qualité/prix'). "
    "Trie du meilleur rapport qualité/prix au moins bon."
)


def _extract_json(text: str):
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    else:
        m2 = re.search(r"[\{\[].*[\}\]]", text, re.DOTALL)
        if m2:
            text = m2.group(0)
    return json.loads(text)


def _strip_data_url(b64: str) -> str:
    return b64.split(",", 1)[-1] if b64.startswith("data:") else b64


def parse_price(text: str) -> float:
    if not text:
        return 0.0
    nums = re.findall(r"\d+(?:[.,]\d+)?", text.replace("\u202f", "").replace(" ", ""))
    vals = [float(n.replace(",", ".")) for n in nums]
    if not vals:
        return 0.0
    return round(sum(vals) / len(vals), 2)


DEMO_IMAGE_URL = "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?crop=entropy&cs=srgb&fm=jpg&w=1000&q=80"


async def _llm_call(system: str, text: str, image_b64: str = None):
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"s-{uuid.uuid4()}", system_message=system).with_model("openai", "gpt-5.4")
    files = [ImageContent(image_base64=_strip_data_url(image_b64))] if image_b64 else None
    msg = UserMessage(text=text, file_contents=files) if files else UserMessage(text=text)
    return await chat.send_message(msg)


async def _run_analysis(image_full_b64: str, user: dict) -> dict:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="Clé IA non configurée")
    clean = _strip_data_url(image_full_b64)
    try:
        raw = await _llm_call(SYSTEM_PROMPT, "Identifie le composant sur cette photo et renvoie le JSON demandé.", image_full_b64)
    except Exception as e:
        logger.exception("Erreur IA")
        raise HTTPException(status_code=502, detail=f"Erreur d'analyse IA: {str(e)}")

    raw = raw if isinstance(raw, str) else str(raw)
    try:
        parsed = _extract_json(raw)
    except Exception:
        parsed = {"name": "Composant inconnu", "category": "", "price_estimate": "", "description": raw[:400], "confidence": "Faible"}

    image_url = ""
    storage_path = ""
    try:
        img_bytes = base64.b64decode(clean)
        storage_path = f"{APP_NAME}/uploads/{user['user_id']}/{uuid.uuid4().hex}.jpg"
        put_object(storage_path, img_bytes, "image/jpeg")
        image_url = f"/api/files/{storage_path}"
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")

    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "name": parsed.get("name", "Composant inconnu"),
        "category": parsed.get("category", ""),
        "price_estimate": parsed.get("price_estimate", ""),
        "price_value": parse_price(parsed.get("price_estimate", "")),
        "description": parsed.get("description", ""),
        "confidence": parsed.get("confidence", ""),
        "storage_path": storage_path,
        "image_url": image_url,
        "offers": [],
        "is_favorite": False,
        "share_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.analyses.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.post("/analyze")
async def analyze(req: AnalyzeRequest, request: Request):
    user = await get_current_user(request)
    return await _run_analysis(req.image_base64, user)


@api_router.post("/analyze/demo")
async def analyze_demo(request: Request):
    user = await get_current_user(request)
    try:
        r = requests.get(DEMO_IMAGE_URL, timeout=30)
        r.raise_for_status()
        b64 = base64.b64encode(r.content).decode("utf-8")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Impossible de charger l'exemple: {str(e)}")
    return await _run_analysis(f"data:image/jpeg;base64,{b64}", user)


@api_router.get("/stats")
async def get_stats(request: Request):
    user = await get_current_user(request)
    docs = await db.analyses.find({"user_id": user["user_id"]}, {"_id": 0, "price_value": 1, "is_favorite": 1, "category": 1}).to_list(1000)
    total_value = round(sum(d.get("price_value", 0) or 0 for d in docs), 2)
    favorites = sum(1 for d in docs if d.get("is_favorite"))
    categories = {}
    for d in docs:
        c = d.get("category") or "Autre"
        categories[c] = categories.get(c, 0) + 1
    return {"count": len(docs), "total_value": total_value, "favorites": favorites, "categories": categories}


@api_router.get("/history")
async def get_history(request: Request):
    user = await get_current_user(request)
    docs = await db.analyses.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@api_router.put("/analysis/{analysis_id}")
async def update_analysis(analysis_id: str, update: AnalysisUpdate, request: Request):
    user = await get_current_user(request)
    fields = {k: v for k, v in update.model_dump().items() if v is not None}
    if "price_estimate" in fields:
        fields["price_value"] = parse_price(fields["price_estimate"])
    if fields:
        await db.analyses.update_one({"id": analysis_id, "user_id": user["user_id"]}, {"$set": fields})
    doc = await db.analyses.find_one({"id": analysis_id, "user_id": user["user_id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Analyse introuvable")
    return doc


@api_router.post("/analysis/{analysis_id}/share")
async def share_analysis(analysis_id: str, request: Request):
    user = await get_current_user(request)
    doc = await db.analyses.find_one({"id": analysis_id, "user_id": user["user_id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Analyse introuvable")
    share_id = doc.get("share_id")
    if not share_id:
        share_id = uuid.uuid4().hex[:10]
        await db.analyses.update_one({"id": analysis_id, "user_id": user["user_id"]}, {"$set": {"share_id": share_id}})
    return {"share_id": share_id}


@api_router.get("/public/component/{share_id}")
async def public_component(share_id: str):
    doc = await db.analyses.find_one({"share_id": share_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Fiche introuvable")
    return {
        "name": doc.get("name"), "category": doc.get("category"),
        "price_estimate": doc.get("price_estimate"), "description": doc.get("description"),
        "confidence": doc.get("confidence"), "offers": doc.get("offers", []),
        "image_url": f"/api/public/image/{share_id}" if doc.get("storage_path") else "",
    }


@api_router.get("/public/image/{share_id}")
async def public_image(share_id: str):
    doc = await db.analyses.find_one({"share_id": share_id}, {"_id": 0, "storage_path": 1})
    if not doc or not doc.get("storage_path"):
        raise HTTPException(status_code=404, detail="Image introuvable")
    try:
        data, content_type = get_object(doc["storage_path"])
    except Exception:
        raise HTTPException(status_code=404, detail="Image introuvable")
    return StarletteResponse(content=data, media_type=content_type)


@api_router.delete("/analysis/{analysis_id}")
async def delete_analysis(analysis_id: str, request: Request):
    user = await get_current_user(request)
    res = await db.analyses.delete_one({"id": analysis_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Analyse introuvable")
    return {"success": True}


@api_router.post("/analysis/{analysis_id}/offers")
async def get_offers(analysis_id: str, request: Request):
    user = await get_current_user(request)
    doc = await db.analyses.find_one({"id": analysis_id, "user_id": user["user_id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Analyse introuvable")
    try:
        raw = await _llm_call(OFFERS_PROMPT, f"Composant: {doc['name']} ({doc['category']}). Prix estimé: {doc['price_estimate']}. Propose les offres.")
        raw = raw if isinstance(raw, str) else str(raw)
        offers = _extract_json(raw)
        if isinstance(offers, dict):
            offers = offers.get("offers", [])
    except Exception as e:
        logger.exception("Erreur offres IA")
        raise HTTPException(status_code=502, detail=f"Erreur génération des offres: {str(e)}")
    await db.analyses.update_one({"id": analysis_id, "user_id": user["user_id"]}, {"$set": {"offers": offers}})
    return {"offers": offers}


@api_router.get("/files/{path:path}")
async def download_file(path: str, request: Request, auth: str = Query(None)):
    # auth via cookie (img same-origin) or ?auth= token fallback
    token = request.cookies.get("session_token") or auth
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Session invalide")
    try:
        data, content_type = get_object(path)
    except Exception:
        raise HTTPException(status_code=404, detail="Fichier introuvable")
    return StarletteResponse(content=data, media_type=content_type)


@api_router.get("/")
async def root():
    return {"message": "ScanRescue API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id")
    await db.user_sessions.create_index("session_token")
    await db.analyses.create_index("user_id")
    try:
        init_storage()
        logger.info("Storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
