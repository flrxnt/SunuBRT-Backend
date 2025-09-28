# SunuBRT Backend – API REST du système BRT de Dakar

Plateforme backend modulaire pour la billetterie, le suivi temps réel et la gestion opérationnelle du réseau SunuBRT. Construite avec NestJS, Prisma et PostgreSQL, avec intégration paiement (PayDunya), WebSockets et sécurité renforcée.

- API interactive (Swagger): http://localhost:3000/api
- OpenAPI JSON: `docs/api-json.json`
- Documentation détaillée: répertoire `docs/`

---

## Sommaire

- [Aperçu & principales fonctionnalités](#aperçu--principales-fonctionnalités)
- [Stack technique](#stack-technique)
- [Architecture du projet](#architecture-du-projet)
- [Modules clés](#modules-clés)
- [Flux Paiement & Tickets (nouveau)](#flux-paiement--tickets-nouveau)
- [Installation](#installation)
- [Configuration (.env)](#configuration-env)
- [Lancer le projet](#lancer-le-projet)
- [Docker (optionnel)](#docker-optionnel)
- [Tests](#tests)
- [Endpoints essentiels (extraits)](#endpoints-essentiels-extraits)
- [Sécurité](#sécurité)
- [Temps réel (WebSockets)](#temps-réel-websockets)
- [Migrations & Seed](#migrations--seed)
- [Dépannage](#dépannage)
- [Documentation complète](#documentation-complète)
- [Contribuer](#contribuer)
- [Licence](#licence)

---

## Aperçu & principales fonctionnalités

- Authentification et gestion utilisateurs (JWT, rôles, permissions)
- Lignes, itinéraires GPS et voyages (Lines, Routes, Trips) avec calculs distance/durée
- Gestion des bus et de la position temps réel (drivers)
- Tarification et billetterie avec QR codes sécurisés
- Intégration Paiements (PayDunya), webhooks, remboursements (admin)
- Tickets réutilisables et abonnements (journalier/hebdo/mensuel/annuel)
- WebSockets: notifications en temps réel (paiements, validations, tracking)
- Swagger/OpenAPI, validations robustes, logs d’accès et traçabilité

Points saillants 2024.12:
- Ticket créé automatiquement après paiement réussi
- Un ticket = un seul voyageur (champ `passengers` retiré du modèle de ticket)
- Nouveaux endpoints et guides de migration complets

Réfs:
- `docs/ticket-payment-flow.md`
- `docs/flux-achat-tickets.md`
- `docs/migration-nouveau-flux.md`
- `docs/TICKET_SUBSCRIPTION_SYSTEM.md`

---

## Stack technique

- Node.js 18+, TypeScript
- NestJS (API, modules, guards/interceptors/pipes)
- Prisma ORM + PostgreSQL
- Redis (cache/sessions – optionnel)
- PayDunya (intégration paiements)
- WebSockets (Gateway NestJS)
- Swagger (OpenAPI)
- Docker/Docker Compose (optionnel)

---

## Architecture du projet

Voir l’arborescence détaillée:
- `docs/PROJECT_ARCHITECTURE.md`

Extrait simplifié:
```/dev/null/tree.txt#L1-40
sunubrt-backend/
├── prisma/              # Prisma schema, migrations, seed
├── src/
│   ├── auth/            # Auth, JWT, stratégies, DTOs
│   ├── users/           # Gestion des utilisateurs
│   ├── lines/           # Lignes de transport
│   ├── routes/          # Itinéraires & points GPS
│   ├── trips/           # Voyages programmés
│   ├── buses/           # Bus & positions
│   ├── tickets/         # Tickets & validation
│   ├── payments/        # Paiements & intégrations
│   ├── websockets/      # Notifications temps réel
│   └── common/          # Guards, decorators, utils
└── docs/                # Documentation fonctionnelle & technique
```

---

## Modules clés

- Auth & Users
  - JWT + refresh, RBAC (USER, DRIVER, ADMIN), profil, reset/change password
  - Réf: `docs/AUTH_USERS_README.md`

- Lines, Routes & Trips
  - CRUD complet, points GPS, calcul Haversine, stats & recherche
  - 33 endpoints documentés
  - Réfs: `docs/LINES_ROUTES_TRIPS_README.md`, `docs/IMPLEMENTATION_SUMMARY.md`

- Buses
  - CRUD, position temps réel (conducteurs), statistiques
  - Réf: `docs/BUSES_README.md`

- Tickets & Paiements
  - Tarification, achat, QR code, validation conducteur
  - Intégration PayDunya (webhook, vérification, remboursements)
  - Tickets réutilisables et abonnements
  - Réfs: `docs/PAYMENTS_TICKETS_README.md`, `docs/api-guide-achat-tickets.md`, `docs/TICKET_SUBSCRIPTION_SYSTEM.md`

- Sécurité
  - Guards, rôles, permissions, interceptors de log d’accès
  - Réf: `docs/SECURITY_ARCHITECTURE.md`

---

## Flux Paiement & Tickets (nouveau)

- Le ticket n’est plus créé avant paiement
- Le paiement est initié → callback validé → le ticket est généré automatiquement (statut `PAID`)
- Simplification: un ticket = un voyageur

Réfs:
- `docs/ticket-payment-flow.md`
- `docs/flux-achat-tickets.md`
- `docs/migration-nouveau-flux.md`

Exemple d’initiation d’achat:
```/dev/null/http.json#L1-30
POST /api/v1/tickets/purchase
{
  "tripId": 1,
  "pricingId": 1,
  "seatNumber": "A15",
  "provider": "PAYDUNYA",
  "paymentMethod": "MOBILE_MONEY",
  "customerName": "Amadou Diallo",
  "customerEmail": "amadou@example.com",
  "customerPhone": "+221701234567"
}
```

Après callback PayDunya confirmé, le ticket est créé automatiquement (voir docs ci-dessus).

---

## Installation

Prérequis:
- Node.js >= 18
- PostgreSQL >= 14
- Redis (optionnel)
- Compte PayDunya (sandbox/production)

Installation:
```/dev/null/terminal.sh#L1-20
git clone <repository-url>
cd SunuBRT-Backend
npm install

# Prisma
npx prisma generate
npx prisma migrate dev
```

---

## Configuration (.env)

Créez un fichier `.env` à partir de `.env.example` et renseignez vos valeurs.

```SunuBRT-Backend/.env.example#L1-40
# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sunubrt"

# JWT
JWT_SECRET="change-me-in-prod"
JWT_EXPIRES_IN="24h"
JWT_REFRESH_SECRET="change-me-in-prod-refresh"
JWT_REFRESH_EXPIRES_IN="7d"

# Security
BCRYPT_ROUNDS=12

# PayDunya (Sandbox par défaut)
PAYDUNYA_MASTER_KEY="your-paydunya-master-key"
PAYDUNYA_PRIVATE_KEY="your-paydunya-private-key"
PAYDUNYA_TOKEN="your-paydunya-token"
PAYDUNYA_BASE_URL="https://app.paydunya.com/sandbox-api/v1"

# Redis (optionnel)
REDIS_URL="redis://localhost:6379"

# Email (optionnel)
MAIL_HOST="smtp.gmail.com"
MAIL_PORT=587
MAIL_USER="your-email@gmail.com"
MAIL_PASS="your-app-password"
EMAIL_FROM="noreply@sunubrt.com"
```

---

## Lancer le projet

Scripts courants:
```/dev/null/terminal.sh#L1-20
# Développement (hot reload)
npm run start:dev

# Production
npm run build
npm run start:prod

# Debug
npm run start:debug
```

- API: http://localhost:3000
- Swagger: http://localhost:3000/api

---

## Docker (optionnel)

Des fichiers `Dockerfile` et `docker-compose.yml` sont fournis.

Exemple de workflow:
```/dev/null/terminal.sh#L1-20
# Construire l'image
docker build -t sunubrt-backend .

# Lancer avec docker-compose (DB + API + Redis*)
docker compose up -d
```

Adaptation des variables d’environnement requise pour la prod (secrets, URLs, DB managée, etc.).

---

## Tests

```/dev/null/terminal.sh#L1-20
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
```

Voir aussi:
- `docs/QUICK_START_GUIDE.md` (tests rapides & curl)
- `docs/IMPLEMENTATION_SUMMARY.md` (scénarios et scripts)

---

## Endpoints essentiels (extraits)

Authentification:
```/dev/null/http.txt#L1-10
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/auth/profile
```

Paiements & Tickets:
```/dev/null/http.txt#L1-10
POST /api/v1/tickets/purchase                # Initier un achat (paiement)
POST /api/v1/payments/paydunya/callback      # Webhook PayDunya
GET  /api/v1/tickets/pricing/:tripId         # Tarifs disponibles
GET  /api/v1/tickets/my-tickets              # Mes tickets
POST /api/v1/tickets/validate                # Validation (driver/admin)
```

Transport:
```/dev/null/http.txt#L1-10
GET  /api/v1/lines                           # Lignes
GET  /api/v1/routes                          # Routes
GET  /api/v1/trips                           # Voyages
GET  /api/v1/buses                           # Bus
PATCH/GET /api/v1/buses/:id/position         # Position (driver/admin)
```

La liste exhaustive est disponible dans:
- Swagger UI: http://localhost:3000/api
- OpenAPI JSON: `docs/api-json.json`

---

## Sécurité

- AuthGuard (JWT), RolesGuard (RBAC), PermissionsGuard (permissions granulaires)
- Décorateurs `@Public()`, `@Roles()`, `@CurrentUser()`, permissions dédiées
- AccessLogInterceptor (log d’accès/audit)
- Validation d’inputs (class-validator), sanitation
- Bonnes pratiques: principe du moindre privilège, défense en profondeur

Réf: `docs/SECURITY_ARCHITECTURE.md`

---

## Temps réel (WebSockets)

- Événements en temps réel: paiement terminé, ticket validé, suivi bus/ligne
- Salles par ressource (utilisateur, bus, ligne)
- Stats admin WebSocket disponibles

Réfs: `docs/PAYMENTS_TICKETS_README.md`, `docs/IMPLEMENTATION_SUMMARY.md`

---

## Migrations & Seed

Prisma:
```/dev/null/terminal.sh#L1-20
npx prisma generate
npx prisma migrate dev
# production
npx prisma migrate deploy
```

Seeds:
```/dev/null/terminal.sh#L1-20
# Seed standard
npm run prisma:seed

# Seed étendu Lines/Routes/Trips (si présent)
npx tsx prisma/seed-lines-routes-trips.ts
```

Guides:
- `docs/QUICK_START_GUIDE.md`
- `docs/IMPLEMENTATION_SUMMARY.md`

---

## Dépannage

- Typescript & compilation: `docs/typescript-fixes.md`
- Flux paiement/tickets: `docs/flux-achat-tickets.md`, `docs/api-guide-achat-tickets.md`
- Migration vers le nouveau flux: `docs/migration-nouveau-flux.md`

Exemples:
```/dev/null/checklist.txt#L1-20
1) Vérifier .env (JWT, DB, PayDunya, PORT)
2) Vérifier la connectivité PostgreSQL
3) npx prisma generate && npx prisma migrate dev
4) npm run start:dev et surveiller les logs
5) Tester GET /api/v1/lines et /api pour Swagger
```

---

## Documentation complète

- Auth & Users: `docs/AUTH_USERS_README.md`
- Buses: `docs/BUSES_README.md`
- Lines/Routes/Trips (API & résumé): `docs/LINES_ROUTES_TRIPS_README.md`, `docs/IMPLEMENTATION_SUMMARY.md`
- Paiements & Tickets: `docs/PAYMENTS_TICKETS_README.md`, `docs/api-guide-achat-tickets.md`
- Tickets réutilisables & abonnements: `docs/TICKET_SUBSCRIPTION_SYSTEM.md`
- Architecture sécurité: `docs/SECURITY_ARCHITECTURE.md`
- Quick Start: `docs/QUICK_START_GUIDE.md`
- OpenAPI JSON: `docs/api-json.json`

---

## Contribuer

- Respecter la structure modulaire et les conventions NestJS
- Ajouter des tests (unitaires/E2E) pour toute nouvelle fonctionnalité
- Mettre à jour la documentation dans `docs/`
- Types stricts TypeScript et validations DTO

---

## Licence

Consultez le fichier `LICENSE` du dépôt (s’il est présent) pour les termes de licence.