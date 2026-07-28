from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, BeforeValidator
from typing import List, Optional, Annotated, Any
from bson import ObjectId
import uuid
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

app = FastAPI()
api_router = APIRouter(prefix="/api")


def _validate_object_id(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    return str(v)


PyObjectId = Annotated[str, BeforeValidator(_validate_object_id)]


class Analysis(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str
    category: str = ""
    price_estimate: str = ""
    description: str = ""
    confidence: str = ""
    image_base64: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @classmethod
    def from_mongo(cls, doc):
        if not doc:
            return None
        return cls(**doc)

    def to_mongo(self):
        data = self.model_dump(by_alias=True, exclude_none=True)
        data.pop("_id", None)
        return data


class AnalyzeRequest(BaseModel):
    image_base64: str


class AnalysisUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price_estimate: Optional[str] = None
    description: Optional[str] = None


SYSTEM_PROMPT = (
    "Tu es un expert en composants électroniques et pièces informatiques. "
    "À partir d'une photo, identifie le composant principal visible. "
    "Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, avec ces clés exactes : "
    "\"name\" (nom précis du composant en français), "
    "\"category\" (ex: 'Composant électronique' ou 'Pièce informatique'), "
    "\"price_estimate\" (estimation réaliste du prix en euros, ex: '15 - 25 €'), "
    "\"description\" (2 à 4 phrases expliquant à quoi sert ce composant), "
    "\"confidence\" (niveau de confiance: 'Élevée', 'Moyenne' ou 'Faible'). "
    "Si aucun composant n'est identifiable, mets name='Composant inconnu' et explique-le dans description."
)


def _strip_data_url(b64: str) -> str:
    if b64.startswith("data:"):
        return b64.split(",", 1)[-1]
    return b64


def _extract_json(text: str) -> dict:
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    else:
        m2 = re.search(r"\{.*\}", text, re.DOTALL)
        if m2:
            text = m2.group(0)
    return json.loads(text)


@api_router.get("/")
async def root():
    return {"message": "Component Detector API"}


@api_router.post("/analyze", response_model=Analysis, response_model_by_alias=False)
async def analyze(req: AnalyzeRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="Clé IA non configurée")

    clean_b64 = _strip_data_url(req.image_base64)

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"detect-{uuid.uuid4()}",
        system_message=SYSTEM_PROMPT,
    ).with_model("openai", "gpt-5.4")

    image = ImageContent(image_base64=clean_b64)
    message = UserMessage(
        text="Identifie le composant sur cette photo et renvoie le JSON demandé.",
        file_contents=[image],
    )

    try:
        response = await chat.send_message(message)
    except Exception as e:
        logger.exception("Erreur IA")
        raise HTTPException(status_code=502, detail=f"Erreur d'analyse IA: {str(e)}")

    raw = response if isinstance(response, str) else str(response)

    try:
        parsed = _extract_json(raw)
    except Exception:
        parsed = {
            "name": "Composant inconnu",
            "category": "",
            "price_estimate": "",
            "description": raw[:500],
            "confidence": "Faible",
        }

    analysis = Analysis(
        name=parsed.get("name", "Composant inconnu"),
        category=parsed.get("category", ""),
        price_estimate=parsed.get("price_estimate", ""),
        description=parsed.get("description", ""),
        confidence=parsed.get("confidence", ""),
        image_base64=req.image_base64,
    )

    result = await db.analyses.insert_one(analysis.to_mongo())
    analysis.id = str(result.inserted_id)
    return analysis


@api_router.get("/history", response_model=List[Analysis], response_model_by_alias=False)
async def get_history():
    docs = await db.analyses.find().sort("created_at", -1).to_list(200)
    return [Analysis.from_mongo(d) for d in docs]


@api_router.put("/analysis/{analysis_id}", response_model=Analysis, response_model_by_alias=False)
async def update_analysis(analysis_id: str, update: AnalysisUpdate):
    try:
        oid = ObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID invalide")

    fields = {k: v for k, v in update.model_dump().items() if v is not None}
    if fields:
        await db.analyses.update_one({"_id": oid}, {"$set": fields})

    doc = await db.analyses.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Analyse introuvable")
    return Analysis.from_mongo(doc)


@api_router.delete("/analysis/{analysis_id}")
async def delete_analysis(analysis_id: str):
    try:
        oid = ObjectId(analysis_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID invalide")
    await db.analyses.delete_one({"_id": oid})
    return {"success": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
