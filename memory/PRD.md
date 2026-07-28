# ScanRescue — PRD

## Problem Statement (original, FR)
"Salut cree moi un site qui permet de détecter à partir d'une ia professionnelle chaque composant à partir d'une photo et qui donne une estimation correct du prix de l'objet avec une description de à quoi sert le composant je veut pouvoir le modifier et que tt en bah du site c'est écrit fait par theo pour le bac 2026-2027"

## Nom du produit : ScanRescue (スキャンレスキュー)

## User Choices
- Cible: composants électroniques + pièces informatiques
- IA: OpenAI gpt-5.4 (vision + offres) via EMERGENT_LLM_KEY
- Résultats modifiables ; historique par utilisateur
- Auth: email/mot de passe + Google
- Recherche prix: offres IA + boutons Amazon/LDLC/Google Shopping
- Multi-composants par photo: NON ; Export PDF: OUI ; Stockage: object storage
- Design: néon + Japon (Tokyo cyberpunk). Fonts Zen Dots / Rajdhani / Outfit / IBM Plex Mono.
- Fonctions ajoutées (toutes): stats, favoris, recherche/filtres, comparateur, mode démo, partage, sons néon.

## Architecture
- Backend: FastAPI + MongoDB (Motor), emergentintegrations LlmChat gpt-5.4, Emergent Object Storage, auth session_token (cookie httpOnly + Bearer), bcrypt, Emergent Google Auth.
- Frontend: React 19 + Tailwind + shadcn/ui + framer-motion + sonner + jsPDF + Web Audio (sfx). Thème Tokyo néon.

## Endpoints
- Auth: register, login, google/session, me, logout
- POST /api/analyze, POST /api/analyze/demo
- GET /api/history, GET /api/stats
- PUT /api/analysis/{id} (edit + is_favorite), DELETE /api/analysis/{id}
- POST /api/analysis/{id}/offers, POST /api/analysis/{id}/share
- GET /api/public/component/{share_id}, GET /api/public/image/{share_id} (publics)
- GET /api/files/{path}

## Implemented
### 2026-07-28 MVP
- Upload photo → analyse IA éditable, historique, footer credit.
### 2026-07-28 Iteration 2
- Comptes email+Google, refonte néon RGB, import fichier, offres IA + shops, export PDF, object storage.
### 2026-07-28 Iteration 3 (design Tokyo + features)
- Rebrand ScanRescue + design Tokyo cyberpunk (auth split image, kanji/katakana, néon, glass, scanline).
- Dashboard stats (nombre, valeur totale, favoris, catégories).
- Favoris + filtre favoris ; recherche + filtre catégorie + tri.
- Comparateur (2-3 composants côte à côte).
- Mode démo (analyse d'un exemple serveur).
- Partage: lien public /c/{share_id} + page publique lecture seule.
- Effets sonores néon (toggle son).
- Testé 100% : 34/34 backend, 19/19 flux frontend.

## Backlog
- P2: /api/files via URL signée courte (token en query actuellement).
- P2: rate-limit routes publiques /public/*.
- P2: init_storage sous asyncio.Lock ; requests -> httpx async.
- P3: PDF multi-pages ; cache image démo en storage ; cleanup fixture tests.

## Next Tasks
- Selon retours de Theo.
