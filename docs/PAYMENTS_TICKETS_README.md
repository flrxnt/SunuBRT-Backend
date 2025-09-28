# Système de Paiement et de Tickets - SunuBRT

Cette documentation couvre l'implémentation complète du système de paiement et de tickets pour SunuBRT, incluant l'intégration PayDunya et l'architecture extensible pour d'autres moyens de paiement.

## Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture du Système](#architecture-du-système)
- [Module Tickets](#module-tickets)
- [Module Paiements](#module-paiements)
- [Intégration PayDunya](#intégration-paydunya)
- [Système de Tarification](#système-de-tarification)
- [Codes QR et Validation](#codes-qr-et-validation)
- [Notifications Temps Réel](#notifications-temps-réel)
- [Sécurité et Permissions](#sécurité-et-permissions)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Exemples d'Usage](#exemples-dusage)
- [Tests](#tests)
- [Déploiement](#déploiement)

## Vue d'ensemble

Le système de paiement et de tickets de SunuBRT est conçu pour être :

- **Sécurisé** : Validation stricte, chiffrement des données sensibles
- **Extensible** : Architecture modulaire pour supporter plusieurs fournisseurs de paiement
- **Fiable** : Gestion robuste des erreurs et réconciliation automatique
- **Temps réel** : Notifications WebSocket pour les mises à jour instantanées
- **Administratif** : Outils complets de gestion et de reporting

### Fonctionnalités Principales

✅ **Gestion des Tickets**
- Création et achat de tickets
- Codes QR sécurisés pour validation
- Gestion des places et sièges
- Annulation et remboursement

✅ **Système de Paiement**
- Intégration PayDunya complète
- Architecture extensible pour autres fournisseurs
- Callbacks sécurisés et webhooks
- Réconciliation automatique

✅ **Tarification Flexible**
- Tarifs par ligne, route ou globaux
- Promotions et codes promo
- Tarifs spéciaux (étudiants, seniors, etc.)
- Validité configurable des tickets

✅ **Administration Complète**
- Tableaux de bord statistiques
- Gestion des remboursements
- Export des données
- Monitoring en temps réel

## Architecture du Système

### Structure des Modules

```
src/
├── tickets/
│   ├── dto/
│   │   ├── create-ticket.dto.ts          # Création de tickets
│   │   ├── validate-ticket.dto.ts        # Validation par QR
│   │   └── ticket-pricing.dto.ts         # Tarification
│   ├── tickets.controller.ts             # API endpoints
│   ├── tickets.service.ts                # Logique métier
│   └── tickets.module.ts                 # Configuration module
├── payments/
│   ├── dto/
│   │   ├── create-payment.dto.ts         # Création paiements
│   │   └── paydunya-callback.dto.ts      # Callbacks PayDunya
│   ├── payments.controller.ts            # API endpoints
│   ├── payments.service.ts               # Logique métier
│   └── payments.module.ts                # Configuration module
├── config/
│   └── paydunya.config.ts                # Configuration PayDunya
└── websockets/
    ├── websockets.gateway.ts             # Notifications temps réel
    └── websockets.module.ts              # Configuration WebSocket
```

### Modèles de Données

#### Ticket
```typescript
interface Ticket {
  id: number;
  userId: string;              // Propriétaire du ticket
  tripId: number;              // Voyage associé
  seatNumber?: string;         // Numéro de siège (optionnel)
  qrCode: string;              // Code QR unique
  status: TicketStatus;        // PENDING, PAID, USED, CANCELLED, EXPIRED
  purchaseDate: Date;          // Date d'achat
  validUntil?: Date;           // Date d'expiration
  usedAt?: Date;               // Date d'utilisation
  passengers: number;          // Nombre de passagers (défaut: 1)
  notes?: string;              // Notes utilisateur
  validationNotes?: string;    // Notes de validation
  validationLocation?: string; // Coordonnées de validation
}
```

#### Payment
```typescript
interface Payment {
  id: number;
  ticketId: number;            // Ticket associé
  userId: string;              // Utilisateur
  amount: number;              // Montant final
  originalAmount?: number;     // Montant original (avant remise)
  discountAmount: number;      // Montant de remise
  currency: string;            // Devise (XOF par défaut)
  provider: PaymentProvider;   // PAYDUNYA, ORANGE_MONEY, etc.
  status: PaymentStatus;       // PENDING, COMPLETED, FAILED, CANCELLED
  
  // Informations client
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  
  // Références externes
  externalToken?: string;      // Token du fournisseur
  externalReference?: string;  // Référence externe
  transactionReference?: string; // Ref de transaction
  externalData: Json;          // Données du fournisseur
  
  // Frais et montants
  fees: number;                // Frais de transaction
  netAmount?: number;          // Montant net reçu
  
  // Dates
  paidAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### TicketPricing
```typescript
interface TicketPricing {
  id: number;
  name: string;                // Nom de la tarification
  type: TicketPricingType;     // STANDARD, EXPRESS, PREMIUM, STUDENT
  price: number;               // Prix en FCFA
  validityDuration: number;    // Durée de validité
  validityPeriodType: string;  // HOURS, DAYS, WEEKS, MONTHS
  lineId?: number;             // Ligne spécifique (optionnel)
  routeId?: number;            // Route spécifique (optionnel)
  description?: string;
  discountPercent: number;     // Pourcentage de remise
  validFrom?: Date;            // Date de début
  validTo?: Date;              // Date de fin
  isActive: boolean;           // Tarification active
  maxTickets?: number;         // Limite de tickets
  specialConditions?: string;  // Conditions spéciales
}
```

## Module Tickets

### Fonctionnalités Principales

#### 1. Création de Tickets
```typescript
// Endpoint: POST /api/v1/tickets
{
  "tripId": 1,
  "seatNumber": "A15",         // Optionnel
  "passengers": 2,             // Défaut: 1
  "notes": "Voyage familial"   // Optionnel
}
```

**Validations effectuées :**
- Vérification de l'existence du voyage
- Vérification de la disponibilité des places
- Vérification du siège spécifique si demandé
- Application de la tarification appropriée
- Génération d'un code QR unique

#### 2. Génération de Codes QR
```typescript
// Endpoint: GET /api/v1/tickets/{id}/qr-code
// Retourne une image QR code en base64
{
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "qrCodeData": "SUNUBRT-1234567890-ABC12345",
  "ticketData": { /* infos complètes du ticket */ },
  "expiresAt": "2024-01-20T23:59:59Z"
}
```

**Contenu du QR Code :**
```json
{
  "ticketId": 123,
  "userId": "user-uuid",
  "tripId": 456,
  "qrCode": "SUNUBRT-1234567890-ABC12345",
  "validUntil": "2024-01-20T23:59:59Z",
  "passengers": 2,
  "generatedAt": "2024-01-15T10:30:00Z"
}
```

#### 3. Validation de Tickets
```typescript
// Endpoint: POST /api/v1/tickets/validate
// Réservé aux conducteurs et admins
{
  "qrCode": "SUNUBRT-1234567890-ABC12345",
  "latitude": 14.6937,         // Optionnel
  "longitude": -17.4441,       // Optionnel
  "notes": "Validation à bord" // Optionnel
}
```

**Réponse de validation :**
```json
{
  "isValid": true,
  "message": "Ticket validé avec succès",
  "ticket": {
    "id": 123,
    "passengerName": "Amadou Diallo",
    "tripInfo": {
      "routeName": "Dakar Centre → Guédiawaye",
      "startTime": "2024-01-15T08:00:00Z",
      "busNumber": "BRT-001"
    }
  }
}
```

### Système de Tarification

#### Configuration des Tarifs (Admin)
```typescript
// Endpoint: POST /api/v1/tickets/pricing
{
  "name": "Tarif Standard Ligne 1",
  "type": "STANDARD",
  "price": 500,
  "validityDuration": 24,
  "validityPeriodType": "HOURS",
  "lineId": 1,                 // Spécifique à la ligne
  "description": "Tarif standard valable 24h",
  "discountPercent": 0,
  "isActive": true
}
```

#### Types de Tarification
- **STANDARD** : Tarif de base
- **EXPRESS** : Tarif express (bus rapide)
- **PREMIUM** : Tarif premium (services additionnels)
- **STUDENT** : Tarif étudiant (avec justificatif)
- **SENIOR** : Tarif senior (65+ ans)
- **DISABLED** : Tarif personne à mobilité réduite

#### Hiérarchie des Tarifs
1. **Route spécifique** : Tarif défini pour une route précise
2. **Ligne spécifique** : Tarif pour toute la ligne
3. **Standard général** : Tarif par défaut du système
4. **Prix du voyage** : Si aucune tarification trouvée

## Module Paiements

### Architecture des Fournisseurs

Le système utilise un pattern Factory pour supporter plusieurs fournisseurs :

```typescript
interface PaymentProviderInterface {
  createPayment(paymentData: any): Promise<any>;
  verifyPayment(token: string): Promise<any>;
  handleCallback(callbackData: any): Promise<any>;
  refundPayment?(paymentData: any, amount: number): Promise<any>;
}
```

#### Fournisseurs Supportés
- ✅ **PayDunya** : Implémentation complète
- 🚧 **Orange Money** : Prévu
- 🚧 **Wave** : Prévu  
- 🚧 **Free Money** : Prévu

### Flux de Paiement

#### 1. Création du Paiement
```typescript
// Endpoint: POST /api/v1/payments
{
  "ticketId": 123,
  "provider": "PAYDUNYA",
  "customerName": "Amadou Diallo",
  "customerEmail": "amadou@example.com",
  "customerPhone": "+221701234567",
  "returnUrl": "https://app.sunubrt.com/payment-success",
  "cancelUrl": "https://app.sunubrt.com/payment-cancel",
  "promoCode": "NOEL2024"        // Optionnel
}
```

**Réponse :**
```json
{
  "payment": {
    "id": 456,
    "amount": 400,               // Prix après remise
    "originalAmount": 500,       // Prix original
    "discountAmount": 100,       // Montant de remise
    "status": "PENDING"
  },
  "paymentUrl": "https://app.paydunya.com/sandbox-checkout/...",
  "token": "paydunya_token_abc123",
  "expiresAt": "2024-01-15T11:00:00Z"
}
```

#### 2. Traitement du Callback
```typescript
// Endpoint: POST /api/v1/payments/paydunya/callback
// Appelé automatiquement par PayDunya
{
  "data": {
    "hash": "security_hash_from_paydunya",
    "status": "completed",
    "invoice": {
      "token": "paydunya_token_abc123",
      "total_amount": 400
    },
    "customer": {
      "name": "Amadou Diallo",
      "email": "amadou@example.com",
      "payment_method": "orange-money-senegal"
    },
    "transaction_id": "TXN_123456789",
    "amount_paid": 400,
    "fees": 20,
    "net_amount": 380
  }
}
```

### Gestion des Remboursements

#### Initier un Remboursement (Admin)
```typescript
// Endpoint: POST /api/v1/payments/admin/{paymentId}/refund
{
  "amount": 50000,             // En centimes (500 FCFA)
  "reason": "Voyage annulé par la compagnie",
  "adminNotes": "Approuvé par superviseur",
  "sendEmail": true
}
```

**Statuts de Remboursement :**
- **PENDING** : En attente de traitement
- **COMPLETED** : Remboursé automatiquement
- **MANUAL** : Remboursement manuel requis
- **FAILED** : Échec du remboursement

## Intégration PayDunya

### Configuration
```env
# Variables d'environnement PayDunya
PAYDUNYA_MODE=test                    # test ou live
PAYDUNYA_MASTER_KEY=your_master_key
PAYDUNYA_PRIVATE_KEY=your_private_key
PAYDUNYA_TOKEN=your_token
```

### Endpoints PayDunya
- **Création** : `/sandbox-api/v1/checkout-invoice/create`
- **Vérification** : `/sandbox-api/v1/checkout-invoice/confirm/{token}`
- **Callback** : URL configurée dans le payload de création

### Sécurité PayDunya
- **Hash de vérification** : SHA512 du master key
- **Tokens uniques** : Chaque paiement a un token unique
- **Timeout** : Les factures expirent après 30 minutes
- **Webhooks** : Support des événements temps réel

### Statuts PayDunya → SunuBRT
```typescript
const mapPaydunyaStatus = (status: string): PaymentStatus => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'success':
      return PaymentStatus.COMPLETED;
    case 'cancelled':
    case 'canceled':
      return PaymentStatus.CANCELLED;
    case 'failed':
    case 'error':
      return PaymentStatus.FAILED;
    case 'pending':
    default:
      return PaymentStatus.PENDING;
  }
};
```

## Codes QR et Validation

### Format des Codes QR
```
SUNUBRT-{timestamp}-{uuid_8_chars}
Exemple: SUNUBRT-1705312200-A1B2C3D4
```

### Contenu Chiffré du QR
```json
{
  "ticketId": 123,
  "userId": "user-uuid",
  "tripId": 456,
  "qrCode": "SUNUBRT-1705312200-A1B2C3D4",
  "validUntil": "2024-01-20T23:59:59Z",
  "passengers": 2,
  "generatedAt": "2024-01-15T10:30:00Z"
}
```

### Processus de Validation

1. **Scan du QR** par le conducteur/contrôleur
2. **Vérification de l'existence** du ticket
3. **Validation du statut** (PAID requis)
4. **Vérification de l'expiration**
5. **Contrôle d'usage unique**
6. **Vérification du bus** (pour conducteurs)
7. **Marquage comme utilisé**
8. **Notification au passager**

### Contrôles de Sécurité
- Codes QR uniques et non-prédictibles
- Vérification de l'intégrité des données
- Contrôle d'ownership pour les conducteurs
- Logging de toutes les validations
- Protection contre le replay d'attaques

## Notifications Temps Réel

### WebSocket Events

#### Côté Client
```javascript
// Connexion avec authentification JWT
const socket = io('/notifications', {
  auth: { token: 'jwt_token_here' }
});

// Écouter les événements
socket.on('ticket:created', (data) => {
  console.log('Nouveau ticket:', data.ticket);
});

socket.on('payment:completed', (data) => {
  console.log('Paiement confirmé:', data.payment);
});

socket.on('ticket:validated', (data) => {
  console.log('Ticket validé:', data.validation);
});
```

#### Événements Émis
- **ticket:created** : Ticket créé avec succès
- **payment:completed** : Paiement confirmé
- **payment:failed** : Paiement échoué
- **ticket:validated** : Ticket validé par conducteur
- **ticket:cancelled** : Ticket annulé
- **refund:initiated** : Remboursement initié
- **system:alert** : Alerte système (admins)

### Salles WebSocket
- `user:{userId}` : Notifications personnelles
- `role:admin` : Notifications administrateurs
- `role:driver` : Notifications conducteurs
- `notification:{type}` : Types spécifiques

## Sécurité et Permissions

### Matrice des Permissions

| Endpoint | USER | DRIVER | ADMIN | Description |
|----------|------|--------|-------|-------------|
| `POST /tickets` | ✅ | ✅ | ✅ | Créer un ticket |
| `GET /tickets/my-tickets` | ✅ | ✅ | ✅ | Mes tickets |
| `GET /tickets/{id}/qr-code` | ✅ | ✅ | ✅ | Générer QR (propriétaire) |
| `POST /tickets/validate` | ❌ | ✅ | ✅ | Valider un ticket |
| `POST /tickets/scan` | ❌ | ✅ | ✅ | Scanner sans valider |
| `POST /tickets/pricing` | ❌ | ❌ | ✅ | Créer tarification |
| `POST /payments` | ✅ | ✅ | ✅ | Créer paiement |
| `POST /payments/paydunya/callback` | Public | Public | Public | Callback PayDunya |
| `POST /payments/admin/{id}/refund` | ❌ | ❌ | ✅ | Remboursement |
| `GET /payments/admin/statistics` | ❌ | ❌ | ✅ | Statistiques |

### Contrôles de Sécurité
- **Authentification JWT** sur tous les endpoints protégés
- **Validation d'ownership** : utilisateurs ne voient que leurs données
- **Validation de rôle** : conducteurs limités à leur bus
- **Rate limiting** sur les endpoints critiques
- **Validation stricte** de tous les inputs
- **Chiffrement** des données sensibles
- **Audit trail** complet des actions

## API Endpoints

### Tickets

#### Endpoints Utilisateurs
```http
POST   /api/v1/tickets                    # Créer un ticket
GET    /api/v1/tickets/my-tickets         # Mes tickets
GET    /api/v1/tickets/{id}               # Détails d'un ticket
GET    /api/v1/tickets/{id}/qr-code       # Générer QR code
PATCH  /api/v1/tickets/{id}/cancel        # Annuler ticket
```

#### Endpoints Conducteurs/Contrôleurs
```http
POST   /api/v1/tickets/validate           # Valider un ticket
POST   /api/v1/tickets/scan               # Scanner pour infos
```

#### Endpoints Administration
```http
GET    /api/v1/tickets/statistics         # Statistiques globales
GET    /api/v1/tickets/admin/all          # Tous les tickets
GET    /api/v1/tickets/admin/export       # Export données
POST   /api/v1/tickets/admin/{id}/force-validate  # Validation forcée
```

#### Endpoints Tarification
```http
POST   /api/v1/tickets/pricing            # Créer tarification
GET    /api/v1/tickets/pricing            # Lister tarifications
PATCH  /api/v1/tickets/pricing/{id}       # Modifier tarification
DELETE /api/v1/tickets/pricing/{id}       # Supprimer tarification
PATCH  /api/v1/tickets/pricing/bulk-update # Mise à jour en lot
POST   /api/v1/tickets/pricing/apply-discount # Appliquer promotion
```

### Paiements

#### Endpoints Utilisateurs
```http
POST   /api/v1/payments                   # Créer paiement
GET    /api/v1/payments/my-payments       # Mes paiements
GET    /api/v1/payments/{id}/status       # Statut paiement
GET    /api/v1/payments/{id}              # Détails paiement
PATCH  /api/v1/payments/{id}/cancel       # Annuler paiement
```

#### Endpoints Publics (Callbacks)
```http
POST   /api/v1/payments/paydunya/callback # Callback PayDunya
POST   /api/v1/payments/paydunya/webhook  # Webhook PayDunya
```

#### Endpoints Vérification
```http
POST   /api/v1/payments/verify            # Vérifier paiement
```

#### Endpoints Administration
```http
GET    /api/v1/payments/admin/all         # Tous les paiements
GET    /api/v1/payments/admin/statistics  # Statistiques
POST   /api/v1/payments/admin/{id}/refund # Remboursement
GET    /api/v1/payments/admin/refunds     # Liste remboursements
GET    /api/v1/payments/admin/export      # Export données
GET    /api/v1/payments/admin/reconciliation # Rapport réconciliation
```

## Configuration

### Variables d'Environnement

#### PayDunya
```env
PAYDUNYA_MODE=test
PAYDUNYA_MASTER_KEY=wQzk9ZwR-Qq9m-0hD0-zpud-je5coGC3FHKW
PAYDUNYA_PRIVATE_KEY=test_private_rMIdJM3PLLhLjyArx9tF3VURAF5
PAYDUNYA_PUBLIC_KEY=test_public_kb9Wo0Qpn8vNWMvMZOwwpvuTUja-OSDNhUqKoaTI4wc
PAYDUNYA_TOKEN=IivOiOxGJuWhc5znlIiK
```

#### URLs de Retour
```env
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3001
```

#### WebSocket
```env
WEBSOCKET_CORS_ORIGIN=http://localhost:3001
```

### Configuration Prisma

Appliquer les migrations :
```bash
npx prisma generate
npx prisma migrate dev
```

Modèles ajoutés :
- `TicketPricing` : Tarifications
- `Refund` : Remboursements
- `PromoCode` : Codes promotionnels
- Champs étendus sur `Ticket` et `Payment`

## Exemples d'Usage

### Achat Complet d'un Ticket

#### 1. Créer le Ticket
```bash
curl -X POST http://localhost:3000/api/v1/tickets \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tripId": 1,
    "seatNumber": "A15",
    "passengers": 1,
    "notes": "Voyage professionnel"
  }'
```

#### 2. Créer le Paiement
```bash
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": 123,
    "provider": "PAYDUNYA",
    "customerName": "Amadou Diallo",
    "customerEmail": "amadou@example.com",
    "customerPhone": "+221701234567"
  }'
```

#### 3. Redirection vers PayDunya
L'utilisateur est redirigé vers l'URL retournée pour effectuer le paiement.

#### 4. Callback Automatique
PayDunya appelle automatiquement notre callback pour confirmer le paiement.

#### 5. Générer le QR Code
```bash
curl -X GET http://localhost:3000/api/v1/tickets/123/qr-code \
  -H "Authorization: Bearer $USER_TOKEN"
```

#### 6. Validation du Ticket (Conducteur)
```bash
curl -X POST http://localhost:3000/api/v1/tickets/validate \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qrCode": "SUNUBRT-1705312200-A1B2C3D4",
    "latitude": 14.6937,
    "longitude": -17.4441
  }'
```

### Gestion Administrative

#### Créer une Tarification
```bash
curl -X POST http://localhost:3000/api/v1/tickets/pricing \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tarif Étudiant Ligne 1",
    "type": "STUDENT",
    "price": 250,
    "validityDuration": 12,
    "validityPeriodType": "HOURS",
    "lineId": 1,
    "discountPercent": 50,
    "specialConditions": "Carte étudiante requise"
  }'
```

#### Statistiques des Paiements
```bash
curl -X GET "http://localhost:3000/api/v1/payments/admin/statistics?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### Initier un Remboursement
```bash
curl -X POST http://localhost:3000/api/v1/payments/admin/456/refund \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "reason": "Voyage annulé en raison de grève",
    "adminNotes": "Remboursement approuvé par le superviseur",
    "sendEmail": true
  }'
```

## Tests

### Tests Unitaires
```bash
# Tests des services
npm test src/tickets/tickets.service.spec.ts
npm test src/payments/payments.service.spec.ts

# Tests des contrôleurs
npm test src/tickets/tickets.controller.spec.ts
npm test src/payments/payments.controller.spec.ts
```

### Tests d'Intégration
```bash
# Tests E2E complets
npm run test:e2e -- --grep "Payment Flow"
npm run test:e2e -- --grep "Ticket Validation"
```

### Tests avec PayDunya Sandbox
```bash
# Variables d'environnement de test
export PAYDUNYA_MODE=test
export PAYDUNYA_MASTER_KEY=test_master_key
export PAYDUNYA_PRIVATE_KEY=test_private_key
export PAYDUNYA_TOKEN=test_token

# Lancer les tests PayDunya
npm run test:paydunya
```

### Script de Test Complet
```bash
# Test du flux complet
node scripts/test-payment-flow.js
```

## Déploiement

### Prérequis de Production

#### 1. Configuration PayDunya Live
```env
PAYDUNYA_MODE=live
PAYDUNYA_MASTER_KEY=live_master_key_here
PAYDUNYA_PRIVATE_KEY=live_private_key_here
PAYDUNYA_TOKEN=live_token_here
```

#### 2. Base de Données
```bash
# Appliquer les migrations en production
npx prisma migrate deploy

# Seeder les tarifications par défaut
npx prisma db seed
```

#### 3. Variables de Production
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db:5432/sunubrt
JWT_SECRET=super-secure-jwt-secret-256-bits
BASE_URL=https://api.sunubrt.com
FRONTEND_URL=https://app.sunubrt.com
REDIS_URL=redis://redis:6379
```

#### 4. Monitoring
```env
# Logs et monitoring
LOG_LEVEL=info
SENTRY_DSN=https://your-sentry-dsn
METRICS_ENABLED=true
```

### Processus de Déploiement

#### 1. Build et Test
```bash
npm run build
npm run test
npm run test:e2e
```

#### 2. Migration Base de Données
```bash
npx prisma migrate deploy
```

#### 3. Démarrage des Services
```bash
# Avec Docker
docker-compose up -d

# Ou directement
npm run start:prod
```

#### 4. Vérification Santé
```bash
curl https://api.sunubrt.com/health
curl https://api.sunubrt.com/api/v1/payments/health
```

### Monitoring de Production

#### Métriques Importantes
- Taux de succès des paiements
- Temps de réponse des callbacks
- Nombre de tickets validés
- Erreurs de validation QR
- Usage des WebSockets

#### Alertes Critiques
- Échecs PayDunya > 5%
- Callbacks non reçus > 2min
- Base de données indisponible
- WebSocket déconnexions massives

#### Tableaux de Bord
- Revenus journaliers/mensuels
- Statistiques de validation
- Performance des conducteurs
- Utilisation par ligne/route

## Sécurité de Production

### Bonnes Pratiques Implémentées
- 
