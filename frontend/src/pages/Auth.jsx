from datetime import datetime, timezone, timedelta
import base64
import json
import logging
import os
from pathlib import Path
import re
import secrets
import uuid

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, Header, HTTPException, Query, Request, Response
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import Response as StarletteResponse

# Import des outils d'Emergent Integrations
from emergentintegrations.llm.chat import ImageContent, LlmChat, UserMessage
from motor.motor_asyncio import AsyncIOMotorClient
import requests
import bcrypt

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Initialisation MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Configuration IA et Storage
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
APP_NAME = 'compo-scan'
STORAGE_URL = 'https://integrations.emergentagent.com/objstore/api/v1/storage'
EMERGENT_AUTH_SESSION = (
    'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data'
)

app = FastAPI()
api_router = APIRouter(prefix='/api')

# ---------- Object storage ----------
storage_key = None


def init_storage():
  global storage_key
  if storage_key:
    return storage_key
  if not EMERGENT_LLM_KEY:
    raise Exception('EMERGENT_LLM_KEY non configurée')
  resp = requests.post(
      f'{STORAGE_URL}/init',
      json={'emergent_key': EMERGENT_LLM_KEY},
      timeout=30,
  )
  resp.raise_for_status()
  storage_key = resp.json()['storage_key']
  return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
  key = init_storage()
  resp = requests.put(
      f'{STORAGE_URL}/objects/{path}',
      headers={'X-Storage-Key': key, 'Content-Type': content_type},
      data=data,
      timeout=120,
  )
  resp.raise_for_status()
  return resp.json()


def get_object(path: str):
  key = init_storage()
  resp = requests.get(
      f'{STORAGE_URL}/objects/{path}',
      headers={'X-Storage-Key': key},
      timeout=60,
  )
  resp.raise_for_status()
  return resp.content, resp.headers.get(
      'Content-Type', 'application/octet-stream'
  )


# ---------- Auth helpers ----------
def hash_password(password: str) -> str:
  return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode(
      'utf-8'
  )


def verify_password(plain: str, hashed: str) -> bool:
  try:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
  except Exception:
    return False


def set_session_cookie(response: Response, token: str):
  response.set_cookie(
      key='session_token',
      value=token,
      httponly=True,
      secure=True,
      samesite='none',
      max_age=7 * 24 * 3600,
      path='/',
  )


async def create_session(user_id: str) -> str:
  token = secrets.token_urlsafe(32)
  await db.user_sessions.insert_one({
      'session_token': token,
      'user_id': user_id,
      'expires_at': (
          datetime.now(timezone.utc) + timedelta(days=7)
      ).isoformat(),
      'created_at': datetime.now(timezone.utc).isoformat(),
  })
  return token


async def get_current_user(request: Request) -> dict:
  token = request.cookies.get('session_token')
  if not token:
    auth = request.headers.get('Authorization', '')
    if auth.startswith('Bearer '):
      token = auth[7:]
  if not token:
    raise HTTPException(status_code=401, detail='Non authentifié')
  session = await db.user_sessions.find_one(
      {'session_token': token}, {'_id': 0}
  )
  if not session:
    raise HTTPException(status_code=401, detail='Session invalide')
  exp = session['expires_at']
  if isinstance(exp, str):
    exp = datetime.fromisoformat(exp)
  if exp.tzinfo is None:
    exp = exp.replace(tzinfo=timezone.utc)
  if exp < datetime.now(timezone.utc):
    raise HTTPException(status_code=401, detail='Session expirée')
  user = await db.users.find_one(
      {'user_id': session['user_id']}, {'_id': 0, 'password_hash': 0}
  )
  if not user:
    raise HTTPException(status_code=401, detail='Utilisateur introuvable')
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
@api_router.post('/auth/register')
async def register(body: RegisterInput, response: Response):
  email = body.email.lower()
  if await db.users.find_one({'email': email}):
    raise HTTPException(status_code=400, detail='Cet email est déjà utilisé')
  user_id = f'user_{uuid.uuid4().hex[:12]}'
  await db.users.insert_one({
      'user_id': user_id,
      'email': email,
      'name': body.name,
      'password_hash': hash_password(body.password),
      'picture': '',
      'auth_provider': 'email',
      'created_at': datetime.now(timezone.utc).isoformat(),
  })
  token = await create_session(user_id)
  set_session_cookie(response, token)
  return {
      'user_id': user_id,
      'email': email,
      'name': body.name,
      'picture': '',
      'session_token': token,
  }


@api_router.post('/auth/login')
async def login(body: LoginInput, response: Response):
  email = body.email.lower()
  user = await db.users.find_one({'email': email})
  if (
      not user
      or not user.get('password_hash')
      or not verify_password(body.password, user['password_hash'])
  ):
    raise HTTPException(
        status_code=401, detail='Email ou mot de passe incorrect'
    )
  token = await create_session(user['user_id'])
  set_session_cookie(response, token)
  return {
      'user_id': user['user_id'],
      'email': user['email'],
      'name': user['name'],
      'picture': user.get('picture', ''),
      'session_token': token,
  }


@api_router.post('/auth/google/session')
async def google_session(response: Response, x_session_id: str = Header(None)):
  if not x_session_id:
    raise HTTPException(status_code=400, detail='session_id manquant')
  r = requests.get(
      EMERGENT_AUTH_SESSION, headers={'X-Session-ID': x_session_id}, timeout=30
  )
  if r.status_code != 200:
    raise HTTPException(status_code=401, detail='Session Google invalide')
  data = r.json()
  email = data['email'].lower()
  existing = await db.users.find_one({'email': email})
  if existing:
    user_id = existing['user_id']
    await db.users.update_one(
        {'user_id': user_id},
        {
            '$set': {
                'name': data.get('name', existing['name']),
                'picture': data.get('picture', ''),
            }
        },
    )
  else:
    user_id = f'user_{uuid.uuid4().hex[:12]}'
    await db.users.insert_one({
        'user_id': user_id,
        'email': email,
        'name': data.get('name', email),
        'password_hash': '',
        'picture': data.get('picture', ''),
        'auth_provider': 'google',
        'created_at': datetime.now(timezone.utc).isoformat(),
    })
  session_token = data.get('session_token') or secrets.token_urlsafe(32)
  await db.user_sessions.insert_one({
      'session_token': session_token,
      'user_id': user_id,
      'expires_at': (
          datetime.now(timezone.utc) + timedelta(days=7)
      ).isoformat(),
      'created_at': datetime.now(timezone.utc).isoformat(),
  })
  set_session_cookie(response, session_token)
  return {
      'user_id': user_id,
      'email': email,
      'name': data.get('name', email),
      'picture': data.get('picture', ''),
      'session_token': session_token,
  }


@api_router.get('/auth/me')
async def me(request: Request):
  return await get_current_user(request)


@api_router.post('/auth/logout')
async def logout(request: Request, response: Response):
  token = request.cookies.get('session_token')
  if token:
    await db.user_sessions.delete_one({'session_token': token})
  response.delete_cookie('session_token', path='/')
  return {'success': True}


# ---------- AI (OpenAI GPT-5.4 Vision) ----------

SYSTEM_PROMPT = (
    'Tu es OpenAI GPT-5.4 (version vision), un expert mondialement reconnu en'
    " matériel informatique, composants de PC (processeurs, cartes graphiques,"
    " cartes mères, RAM, SSD, alimentations, ventirads, etc.) et en"
    " composants électroniques. À partir de la photo fournie, analyse et"
    ' identifie avec une précision chirurgicale le composant visible. Réponds'
    ' UNIQUEMENT avec un objet JSON valide, sans texte autour, respectant'
    ' strictement ces clés exactes : "name" (nom précis et commercial du'
    " composant en français), \"category\" (ex: 'Processeur', 'Carte"
    " graphique', 'Mémoire RAM', 'Carte mère', 'Stockage SSD', etc.),"
    ' "price_estimate" (estimation réaliste du prix actuel du marché en euros,'
    " ex: '250 - 300 €'), \"description\" (2 à 4 phrases détaillant les"
    ' caractéristiques principales et l'utilité de ce composant),'
    ' "confidence" (niveau de confiance de l'analyse : 'Élevée', 'Moyenne' ou'
    " 'Faible'). Si aucun composant informatique ou électronique n'est"
    " identifiable, mets name='Composant inconnu'."
)

OFFERS_PROMPT = (
    'Tu es un comparateur de prix intelligent pour composants informatiques.'
    ' Pour le composant donné, propose 4 offres d'achat réalistes et variées'
    " (neuf, occasion, reconditionné auprès de e-commerçants reconnus comme"
    ' Amazon, LDLC, TopAchat, Rue du Commerce, etc.). Réponds UNIQUEMENT avec'
    ' un JSON valide sous forme de liste de 4 objets avec les clés : '
    ' "seller" (nom du vendeur), "price" (prix en euros, ex: '199,99 €'),'
    ' "quality" (ex: 'Neuf', 'Reconditionné', 'Occasion'), "rating" (note sur 5,'
    " ex: '4.7'), \"note\" (courte description de l'offre). Trie du meilleur"
    ' rapport qualité/prix au moins bon.'
)


def _extract_json(text: str):
  text = text.strip()
  m = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL)
  if m:
    text = m.group(1)
  else:
    m2 = re.search(r'[\{\[].*[\}\]]', text, re.DOTALL)
    if m2:
      text = m2.group(0)
  return json.loads(text)


def _strip_data_url(b64: str) -> str:
  return b64.split(',', 1)[-1] if b64.startswith('data:') else b64


def parse_price(text: str) -> float:
  if not text:
    return 0.0
  nums = re.findall(r'\d+(?:[.,]\d+)?', text.replace('\u202f', '').replace(' ', ''))
  vals = [float(n.replace(',', '.')) for n in nums]
  if not vals:
    return 0.0
  return round(sum(vals) / len(vals), 2)


DEMO_IMAGE_URL = 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?crop=entropy&cs=srgb&fm=jpg&w=1000&q=80'


async def _llm_call(system: str, text: str, image_b64: str = None):
  chat = (
      LlmChat(
          api_key=EMERGENT_LLM_KEY,
          session_id=f's-{uuid.uuid4()}',
          system_message=system,
      )
      .with_model('openai', 'gpt-5.4')
  )
  files = (
      [ImageContent(image_base64=_strip_data_url(image_b64))]
      if image_b64
      else None
  )
  msg = (
      UserMessage(text=text, file_contents=files)
      if files
      else UserMessage(text=text)
  )
  return await chat.send_message(msg)


async def detecter_composant(image_base64: str) -> dict:
  chat = (
      LlmChat(
          api_key=EMERGENT_LLM_KEY,
          session_id=f'detect-{uuid.uuid4()}',
          system_message=SYSTEM_PROMPT,
      )
      .with_model('openai', 'gpt-5.4')
  )

  image = ImageContent(image_base64=_strip_data_url(image_base64))
  message = UserMessage(
      text=(
          'Analyse cette photo, identifie le composant de PC ou l'élément'
          ' électronique présent, et renvoie le JSON demandé.'
      ),
      file_contents=[image],
  )

  try:
    raw = await chat.send_message(message)
    raw = raw if isinstance(raw, str) else str(raw)
    logger.info(
        f"Réponse brute de l'IA (OpenAI GPT-5.4 Vision) : {raw[:150]}..."
    )
    return _extract_json(raw)
  except Exception as e:
    logger.error(f'Erreur critique lors de l'analyse avec GPT-5.4 Vision : {e}')
    return {
        'name': 'Composant non analysé (Erreur GPT-5.4)',
        'category': 'Erreur d'analyse IA',
        'price_estimate': 'Non disponible',
        'description': (
            'L'analyse visuelle par OpenAI GPT-5.4 Vision a rencontré une'
            ' erreur technique ou l'image est illisible.'
        ),
        'confidence': 'Faible',
    }
