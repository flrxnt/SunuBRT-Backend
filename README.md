<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

SunuBRT Backend - API REST pour le système de transport en commun SunuBRT du Sénégal, développée avec [NestJS](https://github.com/nestjs/nest).

### Fonctionnalités principales

- **Gestion des utilisateurs** : Authentification JWT, profils utilisateur, rôles (passager, conducteur, admin)
- **Système de paiement** : Intégration PayDunya, gestion des tickets, remboursements
- **Gestion des trajets** : Planification des voyages, suivi en temps réel des bus
- **Tickets intelligents** : QR codes, validation, tarification flexible
- **Géolocalisation** : Suivi GPS des bus, localisation des arrêts
- **Notifications** : WebSocket en temps réel, notifications push

### Nouvelles fonctionnalités (v2024.12)

#### Flux de paiement optimisé
- **Création automatique de tickets** : Les tickets sont créés automatiquement après un paiement réussi
- **Un ticket = Un voyageur** : Simplification du modèle, suppression du champ `passengers`
- **Paiements sans pré-réservation** : Possibilité de payer sans créer de ticket préalable
- **Nouvelle API** : `POST /api/v1/payments/ticket` pour initier un paiement direct

#### Améliorations techniques
- **Transactions atomiques** : Garantie de cohérence entre paiements et tickets
- **Gestion d'erreurs renforcée** : Rollback automatique en cas d'échec
- **Notifications WebSocket** : Événements en temps réel pour les paiements et tickets
- **Documentation complète** : Guide détaillé du nouveau flux dans `/docs`

## Installation et configuration

### Prérequis

- Node.js >= 18.x
- PostgreSQL >= 14
- Redis (pour le cache et sessions)
- Compte PayDunya (pour les paiements)

### Installation

```bash
# Cloner le repository
$ git clone <repository-url>
$ cd SunuBRT-Backend

# Installer les dépendances
$ npm install

# Configurer la base de données
$ cp .env.example .env
# Éditer .env avec vos configurations

# Exécuter les migrations Prisma
$ npx prisma migrate dev
$ npx prisma generate

# (Optionnel) Seed de la base avec des données de test
$ npx prisma db seed
```

### Configuration environnement

Créer un fichier `.env` avec les variables suivantes :

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sunubrt"

# JWT
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# PayDunya
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
```

## Lancement du projet

```bash
# Développement
$ npm run start

# Mode watch (redémarrage automatique)
$ npm run start:dev

# Mode production
$ npm run start:prod

# Mode debug
$ npm run start:debug
```

L'API sera accessible sur `http://localhost:3000`

Documentation Swagger : `http://localhost:3000/api`

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## API Endpoints principaux

### Authentification
- `POST /api/v1/auth/register` - Inscription
- `POST /api/v1/auth/login` - Connexion
- `POST /api/v1/auth/refresh` - Renouvellement du token

### Paiements (Nouveau flux)
- `POST /api/v1/payments/ticket` - Créer un paiement de ticket
- `POST /api/v1/payments/paydunya/callback` - Webhook PayDunya
- `GET /api/v1/payments/my-payments` - Mes paiements

### Tickets
- `GET /api/v1/tickets/pricing/:tripId` - Tarifications disponibles
- `GET /api/v1/tickets/my-tickets` - Mes tickets
- `POST /api/v1/tickets/:id/validate` - Valider un ticket

### Trajets
- `GET /api/v1/trips` - Liste des trajets
- `GET /api/v1/trips/:id` - Détails d'un trajet
- `GET /api/v1/trips/:id/availability` - Places disponibles

## Documentation

- **Guide complet** : `/docs/ticket-payment-flow.md`
- **API Documentation** : `http://localhost:3000/api` (Swagger)
- **Migrations** : `/prisma/migrations/`
- **Scripts de test** : `/test/`

## Architecture

```
src/
├── auth/           # Authentification JWT
├── payments/       # Gestion des paiements
├── tickets/        # Gestion des tickets
├── trips/          # Gestion des trajets
├── buses/          # Gestion des bus
├── websockets/     # Communication temps réel
├── database/       # Configuration Prisma
└── common/         # Utilitaires partagés
```

## Migration vers le nouveau flux

Si vous migrez depuis une version antérieure, exécutez :

```bash
# Sauvegarder la base de données
$ pg_dump sunubrt > backup_$(date +%Y%m%d).sql

# Exécuter la migration
$ psql sunubrt < prisma/migrations/20241220_payment_ticket_flow_update.sql

# Vérifier la migration
$ psql sunubrt -c "SELECT * FROM migration_logs WHERE migration_name = '20241220_payment_ticket_flow_update';"
```

## Ressources

- [Documentation NestJS](https://docs.nestjs.com)
- [Documentation Prisma](https://www.prisma.io/docs)
- [API PayDunya](https://paydunya.com/developers/api)
- [PostgreSQL Guide](https://www.postgresql.org/docs/)

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
