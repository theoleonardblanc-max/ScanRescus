from datetime import datetime, timezone, timedelta
import json
import logging
import os
from pathlib import Path
import re
import secrets
import uuid
from typing import Optional, List

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, Header, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field
from starlette.middleware.cors import CORSMiddleware

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
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'composcan')]

# Configuration IA et Storage
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
APP_NAME = 'compo-scan'
STORAGE_URL = 'https://integrations.emergentagent.com/objstore/api/v1/storage'
EMERGENT_AUTH_SESSION = (
    'https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data'
)

# IMPORTANT : mets ici la ou les URL réelles de ton frontend (ex: en local
# et en prod). Ne JAMAIS combiner allow_origins=["*"] avec
# allow_credentials=True : les navigateurs bloquent alors les cookies.
ALLOWED_ORIGINS = os.environ.get(
    'ALLOWED_ORIGINS', 'http://localhost:3000'
).split(',')

app = FastAPI(title="Compo-Scan API", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
# ---------- AI (Vision) ----------
# ATTENTION: vérifie que le nom de modèle ci-dessous est bien un identifiant
# valide accepté par ta version de la librairie emergentintegrations /
# du fournisseur "openai". Un nom de modèle invalide ou inexistant fera
# planter chaque appel et retombera systématiquement sur le message
# d'erreur générique plus bas (ce qui ressemble à "ça ne trouve jamais le
# bon composant").
AI_PROVIDER = 'openai'
AI_MODEL = os.environ.get('AI_MODEL', 'gpt-4o') # à adapter selon ce que ta lib supporte réellement

SYSTEM_PROMPT = (
    "Tu es un expert mondialement reconnu en matériel informatique, "
async def _llm_call(system: str, text: str, image_b64: str = None):
  chat = (
      LlmChat(
          api_key=EMERGENT_LLM_KEY,
          session_id=f's-{uuid.uuid4()}',
          system_message=system,
      )
      .with_model(AI_PROVIDER, AI_MODEL)
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
      .with_model(AI_PROVIDER, AI_MODEL)
  )

  image = ImageContent(image_base64=_strip_data_url(image_base64))
  message = UserMessage(
      text=(
          'Analyse cette photo, identifie précisément le composant de PC ou '
          'l\'élément électronique présent, et renvoie le JSON demandé.'
      ),
      file_contents=[image],
  )

  try:
    raw = await chat.send_message(message)
    raw = raw if isinstance(raw, str) else str(raw)
    logger.info(f'Réponse brute de l\'IA : {raw[:150]}...')
    return _extract_json(raw)
  except Exception as e:
    logger.error(f'Erreur critique lors de l\'analyse IA : {e}')
    return {
        'name': 'Composant non analysé (erreur IA)',
        'category': 'Erreur d\'analyse IA',
        'price_estimate': 'Non disponible',
        'description': (
            "L'analyse visuelle a rencontré une erreur technique, le nom de "
            "modèle est invalide, ou l'image est illisible."
        ),
        'confidence': 'Faible',
    }


# ---------- Analyse routes ----------
@api_router.post('/analyze')
async def analyze_component(body: AnalyzeRequest, request: Request):
  user = await get_current_user(request)
  analysis_result = await detecter_composant(body.image_base64)
