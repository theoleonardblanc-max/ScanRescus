# CompoScan — PRD

## Problem Statement (original, FR)
"Salut cree moi un site qui permet de détecter à partir d'une ia professionnelle chaque composant à partir d'une photo et qui donne une estimation correct du prix de l'objet avec une description de à quoi sert le composant je veut pouvoir le modifier et que tt en bah du site c'est écrit fait par theo pour le bac 2026-2027"

## User Choices
- Cible: composants électroniques + pièces informatiques
- IA: OpenAI GPT vision (gpt-5.4) via EMERGENT_LLM_KEY
- "Modifier": pouvoir modifier les résultats de l'IA (nom, prix, description)
- Historique sauvegardé: oui
- Style: moderne / high-tech (sombre, néon)

## Architecture
- Backend: FastAPI + MongoDB (Motor). emergentintegrations LlmChat, modèle openai gpt-5.4 vision.
- Frontend: React 19 + Tailwind + shadcn/ui + framer-motion + sonner. Police Unbounded/JetBrains Mono.
- Pas d'authentification (outil public).

## Endpoints
- POST /api/analyze  -> analyse image base64, renvoie & sauvegarde {name, category, price_estimate, description, confidence, image_base64}
- GET /api/history   -> liste des analyses (récentes d'abord)
- PUT /api/analysis/{id} -> édition des champs
- DELETE /api/analysis/{id} -> suppression

## User Personas
- Theo (lycéen, projet bac) et toute personne voulant identifier/estimer un composant à partir d'une photo.

## Implemented (2026-07-28)
- Upload/drag&drop + capture photo, analyse IA temps réel avec animation de scan.
- Résultat éditable inline (nom, catégorie, prix, description) avec sauvegarde.
- Historique en grille cliquable (recharge le résultat).
- Footer: "fait par theo pour le bac 2026-2027".
- Testé de bout en bout: 100% backend + frontend.

## Backlog
- P1: Stocker l'image en object storage/thumbnail au lieu de base64 en DB (réponses /history volumineuses).
- P2: Pagination de l'historique.
- P2: DELETE -> 404 si id inexistant.
- P2: Restreindre CORS_ORIGINS.

## Next Tasks
- Selon retours de Theo (améliorations UI, export PDF, comparaison de prix, multi-composants par photo).
