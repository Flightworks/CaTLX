# CaTLX — NASA-TLX Workload Assessment

CaTLX est une application web moderne pour conduire des évaluations de charge de travail selon le protocole **NASA Task Load Index (TLX)**. Elle permet aux administrateurs de gérer des études, des évaluateurs et des MTEs (Mission Task Elements), et aux évaluateurs de soumettre leurs ratings de charge perçue.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Routing | react-router-dom v7 |
| i18n | i18next + react-i18next (EN/FR) |
| PWA | vite-plugin-pwa (offline, installable) |
| Backend | Node.js, Express, better-sqlite3 (SQLite) |
| Auth | JWT + bcryptjs |
| Tests | Vitest, Testing Library, jsdom |

## Lancement en local

### Prérequis
- Node.js 20+
- npm

### Installation

```bash
npm install
```

### Développement (frontend seul, données mockées)

```bash
npm run dev
```

L'application démarre sur `http://localhost:3000`.

### Développement (frontend + backend API)

1. **Backend** (dans un terminal) :

```bash
cd backend
npm install
npm run dev   # ou: node server.js
```

Le backend démarre sur `http://localhost:8099` pour éviter le port 8080 occupé sur la machine de développement. Pour utiliser un autre port : `PORT=8099 node server.js`.

2. **Frontend** (dans un autre terminal) :

```bash
npm run dev
```

Pour connecter le frontend au backend local, créer `.env.local` :

```dotenv
VITE_API_BASE_URL=http://localhost:8099/api
```

### Build production

```bash
npm run build
```

Le build est généré dans `dist/` avec le base path `/CaTLX/` (configuré pour GitHub Pages).

### Tests

```bash
npm test        # lance Vitest en mode run
npm run test:watch  # mode watch (si configuré)
```

### Vérification TypeScript

```bash
npx tsc --noEmit
```

## Modes de fonctionnement

L'application propose trois modes au login :

| Mode | Description | Persistance |
|------|-------------|-------------|
| **Demo** | Données d'exemple en mémoire, idéal pour découvrir l'outil. | Aucune (reset à chaque refresh) |
| **Local** | Données sauvegardées dans le navigateur (localStorage). | Local à l'appareil |
| **API** (auto-hébergé) | Connecté au backend Express + SQLite avec JWT. | Serveur, partagé entre utilisateurs |

## Structure du projet

```
catlx/
├── App.tsx                    # Point d'entrée React + routing
├── pages/
│   ├── AdminDashboardPage.tsx # Dashboard admin (onglets: stats, études, évaluateurs, MTEs)
│   ├── EvaluatorPage.tsx      # Interface évaluateur (rating, pairwise comparison)
│   ├── LoginPage.tsx          # Sélection du mode + connexion API
│   └── QuickRatingPage.tsx    # Calcul TLX rapide sans sauvegarde
├── pages/admin/
│   ├── ViewStats.tsx          # Statistiques agrégées par MTE
│   ├── ManageStudies.tsx      # CRUD études
│   ├── ManageEvaluators.tsx   # CRUD évaluateurs
│   └── ManageMTEs.tsx         # Catalogue MTE
├── contexts/AppContext.tsx    # Auth, Data, Session contexts
├── hooks/
│   ├── useMockData.ts         # Source de données demo
│   ├── useLocalStorageData.ts # Source de données locale
│   └── useApiData.ts          # Source de données API (backend)
├── components/                # UI réutilisable (Card, Select, Button, Modal, charts)
├── backend/
│   ├── server.js              # API Express (JWT, SQLite)
│   └── Dockerfile             # Image backend (Node 20 Alpine)
├── public/locales/            # Traductions EN/FR
└── vite.config.ts             # Configuration Vite + PWA
```

## Backend API

Le backend expose une API REST sur `/api` :

- `POST /api/auth/login` — Authentification (JWT)
- `POST /api/auth/register` — Bootstrap du premier administrateur (ensuite désactivé, sauf avec `x-bootstrap-key`)
- `GET/POST/PUT/DELETE /api/projects` — Projets
- `GET/POST/PUT/DELETE /api/evaluators` — Évaluateurs
- `GET/POST/PUT/DELETE /api/studies` — Études
- `GET/POST/PUT/DELETE /api/mtes` — Catalogue MTE
- `POST /api/ratings` — Soumettre un rating
- `POST /api/pairwise-comparisons` — Soumettre une comparaison paire-à-paire

La base SQLite est initialisée automatiquement au premier démarrage.

## Déploiement

- **Frontend** : `npm run build` puis servir `dist/` (GitHub Pages, Netlify, etc.)
- **Backend + frontend** : `docker compose up -d --build` (frontend sur `http://localhost:3000`, backend sur `http://localhost:8080`)

En production, définir au minimum `JWT_SECRET` et, si nécessaire, `BOOTSTRAP_ADMIN_KEY` dans un fichier `.env` avant le premier démarrage.

## Licence

Projet interne — développé par Mlr.
