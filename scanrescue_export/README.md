# 🔧 ScanRescue — Détection de composants par IA (스�ンレスキュー)

Projet complet : **FastAPI (backend) + React (frontend) + MongoDB**.
Fait par Theo pour le bac 2026-2027.

---

## 📁 Structure
```
scanrescue/
├── backend/
│   ├── server.py            # API FastAPI (auth, IA, offres, partage, stockage)
│   ├── requirements.txt     # dépendances Python
│   └── .env                 # à créer depuis .env.example
└── frontend/
    ├── src/                 # code React
    ├── public/
    ├── package.json
    ├── craco.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── jsconfig.json
    └── .env                 # à créer depuis .env.example
```

---

## ✅ Prérequis (à installer une seule fois)
1. **Node.js 18+** → https://nodejs.org
2. **Yarn** → dans un terminal : `npm install -g yarn`
3. **Python 3.10+** → https://python.org
4. **MongoDB** (base de données) :
   - Option simple : installe **MongoDB Community** en local → https://www.mongodb.com/try/download/community
   - Ou crée une base gratuite sur **MongoDB Atlas** → https://www.mongodb.com/atlas (tu obtiens une URL `mongodb+srv://...`)

---

## 🚀 Démarrage

### 1) Backend
Ouvre un terminal dans le dossier `backend/` :
```bash
cd backend
python -m venv venv
# Windows :
venv\Scripts\activate
# Mac/Linux :
source venv/bin/activate

pip install -r requirements.txt
```
Crée le fichier `backend/.env` (copie `.env.example`) et remplis-le :
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="scanrescue"
CORS_ORIGINS="http://localhost:3000"
EMERGENT_LLM_KEY=ta_cle_ici
```
Lance le serveur :
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
➡️ API dispo sur http://localhost:8001/api

### 2) Frontend
Ouvre un **autre** terminal dans `frontend/` :
```bash
cd frontend
yarn install
```
Crée `frontend/.env` (copie `.env.example`) :
```
REACT_APP_BACKEND_URL=http://localhost:8001
```
Lance l'app :
```bash
yarn start
```
➡️ Site sur http://localhost:3000

---

## 🔑 La clé IA (EMERGENT_LLM_KEY)
L'analyse d'image, les offres et le stockage utilisent la clé **EMERGENT_LLM_KEY**
(fournie par la plateforme Emergent). Mets-la dans `backend/.env`.
Sans cette clé, l'analyse IA renverra une erreur.

---

## ⚠️ Cookies en local (auth)
Le code utilise des cookies sécurisés (`secure=True, samesite="none"`) adaptés au HTTPS.
En **pur local (http://localhost)**, si la connexion ne "reste" pas, ouvre `backend/server.py`,
cherche la fonction `set_session_cookie` et remplace :
```python
response.set_cookie(key="session_token", value=token, httponly=True, secure=True,
                    samesite="none", max_age=7*24*3600, path="/")
```
par (pour le dev local) :
```python
response.set_cookie(key="session_token", value=token, httponly=True, secure=False,
                    samesite="lax", max_age=7*24*3600, path="/")
```

---

## 🧩 Fonctionnalités
- Connexion / inscription (email+mot de passe) + Google
- Analyse IA d'un composant depuis une photo/fichier (nom, prix, description, confiance)
- Édition des résultats
- Tableau de bord (stats), favoris, recherche/filtres/tri
- Comparateur (2-3 composants)
- Mode démo, meilleures offres IA + liens Amazon/LDLC/Google Shopping
- Export PDF, partage par lien public
- Design Tokyo néon cyberpunk + effets sonores

Bonne chance pour le bac ! 🎓
