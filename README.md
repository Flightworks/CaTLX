# CaTLX — NASA-TLX Workload Assessment

CaTLX est une application web moderne pour conduire des évaluations de charge de travail selon le protocole **NASA Task Load Index (TLX)**. Elle permet aux administrateurs de gérer des études, des évaluateurs et des MTEs (Mission Task Elements), et aux évaluateurs de soumettre leurs ratings de charge perçue.

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Routing | react-router-dom v7 |
| i18n | i18next + react-i18next (EN/FR) |
| PWA | vite-plugin-pwa (offline, installable) |
| Backend actuel | Node.js, Express, better-sqlite3 (SQLite) |
| Auth actuelle | JWT + bcryptjs |
| Cible en ligne | Firebase Hosting, Firebase Authentication, Cloud Firestore, Security Rules |
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

Le build est généré dans `dist/`. Le mode normal utilise la racine `/`; le workflow historique GitHub Pages utilise explicitement le mode `github-pages` avec le base path `/CaTLX/`.

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

L'application propose quatre modes au login :

| Mode | Description | Persistance |
|------|-------------|-------------|
| **Demo** | Données d'exemple en mémoire, idéal pour découvrir l'outil. | Aucune (reset à chaque refresh) |
| **Local** | Données sauvegardées dans le navigateur (localStorage). | Local à l'appareil |
| **API** (auto-hébergé) | Connecté au backend Express + SQLite avec JWT. | Serveur, partagé entre utilisateurs |
| **Firebase** | Firebase Authentication + Firestore, avec règles par rôle et par étude. | Cloud Firebase ou émulateurs locaux |

Le mode Firebase est intégré derrière `IDataSource`, mais reste désactivé tant que la configuration Firebase n'est pas fournie. Le catalogue MTE global ne sera jamais accessible à un évaluateur : celui-ci recevra uniquement les snapshots MTE des études qui lui sont affectées.

Les émulateurs locaux utilisent le projet virtuel `demo-catlx`, Firebase Auth sur `9099` et Firestore sur `8081` (le port `8080` est déjà utilisé localement par qBittorrent).

Commandes disponibles : `npm run emulators`, `npm run test:rules`, `npm run seed:firebase`, `npm run export:sqlite`, `npm run validate:export -- <export.json>`, `npm run import:firebase -- <export.json> <uid-map.json>`. L'import Firebase est volontairement limité à l'émulateur, exige une correspondance explicite entre anciens identifiants et UID Firebase, et importe les comptes en `pending` par défaut ; aucune commande du dépôt n'importe vers un projet Google réel.

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
├── docs/                      # ADR et matrice d'accès Firebase
├── public/locales/            # Traductions EN/FR
└── vite.config.ts             # Configuration Vite + PWA
```

## Backend API

Le backend expose une API REST sur `/api` :

- `POST /api/auth/login` — Authentification (JWT)
- `POST /api/auth/register` — Bootstrap du premier administrateur ; désactivé ensuite.
- `GET/POST/PUT/DELETE /api/projects` — Projets
- `GET/POST/PUT/DELETE /api/evaluators` — Évaluateurs
- `GET/POST/PUT/DELETE /api/studies` — Études
- `GET/POST/PUT/DELETE /api/mtes` — Catalogue MTE
- `POST /api/ratings` — Soumettre un rating
- `POST /api/pairwise-comparisons` — Soumettre une comparaison paire-à-paire

La base SQLite est initialisée automatiquement au premier démarrage.

## Déploiement

- **Frontend** : `npm run build` puis servir `dist/` (GitHub Pages, Netlify, etc.)
- **Backend + frontend** : `docker compose up -d --build` (frontend sur `http://localhost:3000`, backend sur `http://localhost:8099` dans la configuration CaTLX)

### Cible Firebase Spark

La cible en ligne sera déployée progressivement avec Firebase Hosting, Firebase Authentication et Cloud Firestore. Le développement et les tests de règles se font d'abord avec Firebase Local Emulator Suite. Le premier projet doit rester sur le plan Spark, sans moyen de paiement, sans Blaze et avec un projet de staging séparé du projet de production.

Voir :

- `docs/architecture/ADR-003-firebase-spark.md` — décision d'architecture ;
- `docs/security/access-control-matrix.md` — rôles et permissions ;
- `docs/operations/firebase-spark-deployment.md` — staging et garde-fous de déploiement.

En production du mode API, définir un `JWT_SECRET` long et aléatoire dans un fichier `.env` avant le premier démarrage. Le backend refuse de démarrer sans ce secret. Le port `8080` est réservé localement à qBittorrent ; la configuration API CaTLX utilise `8099`.

## Licence

Projet interne — développé par Mlr.
