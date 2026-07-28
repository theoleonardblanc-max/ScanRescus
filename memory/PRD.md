# CompoScan — PRD

## Problem Statement (original, FR)
"Salut cree moi un site qui permet de détecter à partir d'une ia professionnelle chaque composant à partir d'une photo et qui donne une estimation correct du prix de l'objet avec une description de à quoi sert le composant je veut pouvoir le modifier et que tt en bah du site c'est écrit fait par theo pour le bac 2026-2027"

## User Choices
- Cible: composants électroniques + pièces informatiques
- IA: OpenAI GPT vision (gpt-5.4) via EMERGENT_LLM_KEY
- Résultats modifiables (nom, prix, description)
- Historique sauvegardé (par utilisateur)
- Style: gaming néon RGB (cyan/violet/rose cyberpunk)
- Auth: email/mot de passe + Google (les deux)
- Recherche de prix: offres générées par IA + boutons de recherche Amazon/LDLC/Google Shopping
- Détection multi-composants: NON
- Export PDF: OUI
- Stockage images: object storage (pas de base64 en DB)

## Architecture
- Backend: FastAPI + MongoDB (Motor). emergentintegrations LlmChat gpt-5.4 (vision + offres). Emergent Object Storage. Auth par session_token (cookie httpOnly + Bearer fallback), bcrypt, Google via Emergent Auth.
- Frontend: React 19 + Tailwind + shadcn/ui + framer-motion + sonner + jsPDF. Fonts Unbounded / Orbitron / JetBrains Mono. Thème néon RGB.

## Endpoints
- Auth: POST /api/auth/register, /api/auth/login, /api/auth/google/session, GET /api/auth/me, POST /api/auth/logout
- POST /api/analyze (vision + upload storage)
- GET /api/history (scoped user)
- PUT /api/analysis/{id}, DELETE /api/analysis/{id}
- POST /api/analysis/{id}/offers (offres IA)
- GET /api/files/{path} (image depuis storage)

## User Personas
- Theo (lycéen, projet bac) et utilisateurs voulant identifier/estimer/comparer des composants via photo.

## Implemented
### 2026-07-28 (MVP)
- Upload photo → analyse IA (nom/prix/description/confiance), résultat éditable, historique, footer credit.
### 2026-07-28 (Iteration 2)
- Comptes utilisateurs: email/mot de passe + Google login.
- Refonte visuelle gaming néon RGB (blobs animés, glow, scanline, grille).
- Import de FICHIER en plus de la photo.
- Recherche du meilleur prix: 4 offres générées par IA + boutons Amazon/LDLC/Google Shopping.
- Export PDF de la fiche composant (jsPDF).
- Images stockées en object storage (image_url servi via /api/files).
- Historique isolé par utilisateur. Testé 100% (22/22 backend, 9/9 frontend).

## Backlog
- P2: /api/files auth via URL signée courte au lieu de ?auth= (le token apparaît dans les logs).
- P2: logout delete_cookie avec secure/samesite/path identiques.
- P2: init_storage sous asyncio.Lock; passer requests -> httpx async.
- P3: gestion multi-pages PDF pour longues descriptions.

## Next Tasks
- Selon retours de Theo (comparaison de plusieurs composants, partage de fiche, dashboard stats).
