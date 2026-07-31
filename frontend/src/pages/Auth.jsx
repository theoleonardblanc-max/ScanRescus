from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Header, Query
from starlette.responses import Response as StarletteResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
# Import Emergent pour la vision
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
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


# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialisation MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configuration IA
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
    if not EMERGENT_LLM_KEY:
        raise Exception("EMERGENT_LLM_KEY non configurée")
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


# ---- NOUVELLE FONCTION DE NETTOYAGE ROBUSTE ----
def _extract_and_parse_json(text: str):
    """
    Extrait et parse le JSON d'une réponse potentiellement polluée par l'IA.
    Tolère le markdown ```json et le texte autour de l'objet.
    """
    text = text.strip()
    
    # Tente de trouver un bloc JSON entre ``` (avec ou sans l'étiquette json)
    json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if json_match:
        clean_text = json_match.group(1)
    else:
        # Tente de trouver le premier '{' et le dernier '}' si pas de markdown
        braces_match = re.search(r'(\{.*?\})', text, re.DOTALL)
        if braces_match:
            clean_text = braces_match.group(1)
        else:
            clean_text = text # Laisse tel quel, provoquera une erreur de parsing

    try:
        return json.loads(clean_text)
    except json.JSONDecodeError as e:
        logger.error(f"Erreur de parsing JSON. Texte brut (tronqué): {text[:100]}... Erreur: {e}")
        # Retourne un objet d'erreur standardisé au lieu de planter
        return {
            "name": "Erreur d'analyse de l'IA",
            "category": "Erreur",
            "price_estimate": "N/A",
            "description": f"L'IA a répondu mais n'a pas fourni un format JSON valide. Réponse brute: {text[:200]}...",
            "confidence": "Faible"
        }
# --------------------------------------------------


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
    
    try:
        raw = await _llm_call(SYSTEM_PROMPT, "Identifie le composant sur cette photo et renvoie le JSON demandé.", image_full_b64)
    except Exception as e:
        logger.exception("Erreur appel IA API")
        raise HTTPException(status_code=502, detail=f"Erreur de communication avec l'IA: {str(e)}")

    raw = raw if isinstance(raw, str) else str(raw)
    logger.info(f"Réponse brute de l'IA (GPT-5.4) : {raw[:150]}...")

    # UTILISATION DU NETTOYEUR ICI
    parsed = _extract_and_parse_json(raw)

    image_url = ""
    storage_path = ""
    clean = _strip_data_url(image_full_b64)
    try:
        img_bytes = base64.b64
