from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response
from starlette.responses import Response as StarletteResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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
from datetime import datetime, timezone, timedelta

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'scanrescuse_db')]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
APP_NAME = "scanrescuse"
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"

app = FastAPI()
api_router = APIRouter(prefix="/api")

storage_key = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    if not EMERGENT_LLM_KEY:
        return None
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=10)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init error: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        return {}
    resp = requests.put(f"{STORAGE_URL}/objects/{path}",
                        headers={"X-Storage-Key": key, "Content-Type": content_type},
                        data=data, timeout=60)
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    if not key:
        raise Exception("Storage non initialisé")
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def set_session_cookie(response: Response, token: str):
    response.set_cookie(key="scanrescuse_token", value=token, httponly=True, secure=True,
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
    token = request.cookies.get("scanrescuse_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Session invalide")
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    return user

class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)

class LoginInput(BaseModel):
    email: EmailStr
    password: str

class AnalyzeRequest(BaseModel):
    image_base64: str

@api_router.post("/auth/register")
async def register(body: RegisterInput, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    await db.users.insert_one({
        "user_id": user_id, "email": email, "name": body.name,
        "password_hash": hash_password(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    token = await create_session(user_id)
    set_session_cookie(response, token)
    return {"user_id": user_id, "email": email, "name": body.name, "session_token": token}

@api_router.post("/auth/login")
async def login(body: LoginInput, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    token = await create_session(user["user_id"])
    set_session_cookie(response, token)
    return {"user_id": user["user_id"], "email": user["email"], "name": user["name"], "session_token": token}

@api_router.get("/auth/me")
async def me(request: Request):
    return await get_current_user(request)

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("scanrescuse_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("scanrescuse_token", path="/")
    return {"success": True}

SYSTEM_PROMPT = (
    "Tu es un expert en composants électroniques. Analyse l'image fournie et réponds "
    "strictement et uniquement sous ce format textuel :\n"
    "NOM: [Nom exact du composant]\n"
    "CATEGORIE: [Catégorie]\n"
    "PRIX: [Prix estimé en euros, ex: 15 €]\n"
    "DESCRIPTION: [Explication détaillée du rôle et des fonctions du composant]"
)

def _parse_ai_response(text: str):
    name = "Composant électronique"
    category = "Électronique générale"
    price_estimate = "20 €"
    description = text if text else "Composant analysé avec succès."

    match_name = re.search(r"NOM\s*:\s*(.*)", text, re.IGNORECASE)
    if match_name:
        name = match_name.group(1).split("\n")[0].strip()

    match_cat = re.search(r"CATEGORIE\s*:\s*(.*)", text, re.IGNORECASE)
    if match_cat:
        category = match_cat.group(1).split("\n")[0].strip()

    match_price = re.search(r"PRIX\s*:\s*(.*)", text, re.IGNORECASE)
    if match_price:
        price_estimate = match_price.group(1).split("\n")[0].strip()

    match_desc = re.search(r"DESCRIPTION\s*:\s*(.*)", text, re.DOTALL | re.IGNORECASE)
    if match_desc:
        description = match_desc.group(1).strip()

    return {
        "name": name or "Composant électronique",
        "category": category or "Électronique",
        "price_estimate": price_estimate or "20 €",
        "description": description or text,
        "confidence": "Élevée"
    }

def _strip_data_url(b64: str) -> str:
    return b64.split(",", 1)[-1] if b64.startswith("data:") else b64

@api_router.post("/analyze")
async def analyze(req: AnalyzeRequest, request: Request):
    user = await get_current_user(request)
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="Clé IA non configurée")

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"scan-{uuid.uuid4()}",
            system_message=SYSTEM_PROMPT,
        ).with_model("openai", "gpt-4o")

        clean_b64 = _strip_data_url(req.image_base64)
        image_content = ImageContent(image_base64=clean_b64)
        
        message = UserMessage(
            text="Analyse cette image et donne-moi les informations demandées au format NOM: ..., CATEGORIE: ..., PRIX: ..., DESCRIPTION: ...",
            file_contents=[image_content]
        )

        raw = await chat.send_message(message)
        raw_str = raw if isinstance(raw, str) else str(raw)
        logger.info(f"RAW LLM RESPONSE: {raw_str}")
        
        parsed = _parse_ai_response(raw_str)

        storage_path = ""
        image_url = ""
        try:
            img_bytes = base64.b64decode(clean_b64)
            storage_path = f"{APP_NAME}/uploads/{user['user_id']}/{uuid.uuid4().hex}.jpg"
            put_object(storage_path, img_bytes, "image/jpeg")
            image_url = f"/api/files/{storage_path}"
        except Exception as ex:
            logger.error(f"Erreur stockage image: {ex}")

        return {
            "name": parsed["name"],
            "category": parsed["category"],
            "price_estimate": parsed["price_estimate"],
            "description": parsed["description"],
            "confidence": parsed["confidence"],
            "image_url": image_url or req.image_base64
        }
    except Exception as e:
        logger.exception("Erreur analyse IA")
        raise HTTPException(status_code=502, detail=f"Erreur IA: {str(e)}")

@api_router.get("/files/{path:path}")
async def download_file(path: str, request: Request):
    token = request.cookies.get("scanrescuse_token")
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        data, content_type = get_object(path)
        return StarletteResponse(content=data, media_type=content_type)
    except Exception:
        raise HTTPException(status_code=404, detail="Fichier introuvable")

@api_router.get("/")
async def root():
    return {"message": "ScanRescuse API Active"}

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
