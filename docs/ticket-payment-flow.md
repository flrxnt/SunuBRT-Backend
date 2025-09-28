# Flux de Paiement et Création de Tickets

## Vue d'ensemble

Ce document décrit le nouveau flux de paiement et de création de tickets dans l'application SunuBRT. Les modifications ont été apportées pour que les tickets soient créés automatiquement après un paiement réussi, plutôt qu'avant le paiement.

## Changements principaux

### 1. Tickets créés après paiement réussi

**Ancien flux :**
1. Création d'un ticket avec statut `PENDING`
2. Création d'un paiement lié au ticket
3. Mise à jour du ticket vers `PAID` après paiement réussi

**Nouveau flux :**
1. Création d'un paiement sans ticket existant
2. Création automatique du ticket avec statut `PAID` après paiement réussi
3. Liaison du ticket au paiement

### 2. Un ticket = Un seul voyageur

Le champ `passengers` a été supprimé du modèle `Ticket` car chaque ticket correspond désormais à un seul voyageur. Pour plusieurs voyageurs, il faut créer plusieurs tickets séparés.

### 3. Nouvelles API endpoints

#### Création d'un paiement de ticket
```
POST /api/v1/payments/ticket
```

**Body :**
```json
{
  "tripId": 1,
  "pricingId": 2,
  "seatNumber": "A15",
  "notes": "Voyage familial",
  "provider": "PAYDUNYA",
  "paymentMethod": "MOBILE_MONEY",
  "customerName": "Amadou Diallo",
  "customerEmail": "amadou@example.com",
  "customerPhone": "+221701234567",
  "promoCode": "NOEL2024"
}
```

**Réponse :**
```json
{
  "paymentId": 123,
  "paymentUrl": "https://app.paydunya.com/checkout/...",
  "paymentToken": "token_abc123",
  "amount": 500,
  "currency": "XOF",
  "status": "PENDING",
  "tripInfo": {
    "id": 1,
    "routeName": "Dakar - Guédiawaye",
    "startTime": "2024-01-20T08:00:00Z",
    "busNumber": "BRT001",
    "availableSeats": 45
  },
  "pricingInfo": {
    "id": 2,
    "name": "Standard",
    "type": "STANDARD",
    "originalPrice": 500,
    "finalPrice": 500,
    "discountPercent": 0,
    "validityDuration": 24,
    "validityPeriodType": "HOURS"
  },
  "reservedSeat": "A15",
  "reservationValidityMinutes": 15,
  "reservationExpiresAt": "2024-01-20T10:45:00Z"
}
```

## Flux détaillé

### 1. Initiation du paiement

L'utilisateur fait une demande de paiement de ticket via :
- `POST /api/v1/payments/ticket` (nouvelle méthode)
- `POST /api/v1/tickets/purchase` (mise à jour pour utiliser la nouvelle méthode)

### 2. Traitement du paiement

1. **Validation des données** : Vérification du voyage, tarification, disponibilité des places
2. **Calcul du prix** : Application des remises et codes promo
3. **Création du paiement** : Stockage en base avec statut `PENDING`
4. **Intégration PayDunya** : Génération de l'URL de paiement
5. **Réponse à l'utilisateur** : Redirection vers l'interface de paiement

### 3. Callback de paiement

Quand PayDunya confirme le paiement via le webhook :

1. **Réception du callback** : `POST /api/v1/payments/paydunya/callback`
2. **Vérification du paiement** : Validation de la signature et des données
3. **Mise à jour du paiement** : Changement du statut vers `COMPLETED`
4. **Création automatique du ticket** :
   - Génération d'un QR code unique
   - Calcul de la date de validité
   - Création avec statut `PAID`
   - Liaison au paiement
5. **Notifications** : WebSocket et éventuellement email/SMS

### 4. Gestion des erreurs

- **Paiement échoué** : Le paiement reste à `FAILED`, aucun ticket créé
- **Paiement annulé** : Le paiement passe à `CANCELLED`, aucun ticket créé
- **Données manquantes** : Erreur lors de la création du ticket

## Structure des données

### Payment (modifié)
```javascript
{
  id: number,
  ticketId?: number, // Optionnel, renseigné après création du ticket
  userId: string,
  amount: number,
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED",
  customData: {
    tripId: number,
    pricingId: number,
    seatNumber?: string,
    notes?: string,
    routeName: string,
    startTime: string,
    busNumber: string
  },
  // ... autres champs
}
```

### Ticket (modifié)
```javascript
{
  id: number,
  userId: string,
  tripId: number,
  pricingId: number,
  seatNumber?: string,
  qrCode: string,
  status: "PAID" | "USED" | "CANCELLED" | "EXPIRED",
  purchaseDate: Date,
  validUntil?: Date,
  notes?: string,
  // passengers: SUPPRIMÉ - toujours 1 voyageur par ticket
}
```

## Migration des données

### Script de migration
```sql
-- Les tickets existants avec passengers > 1 doivent être traités manuellement
-- Ou divisés en plusieurs tickets individuels

-- Suppression du champ passengers (après vérification)
ALTER TABLE tickets DROP COLUMN passengers;
```

### Validation post-migration
- Vérifier que tous les tickets ont un paiement associé
- Contrôler que les QR codes restent uniques
- Valider les dates de validité

## Tests

### Tests unitaires
- `PaymentsService.createTicketPayment()`
- `PaymentsService.handlePaydunyaCallback()` avec création de ticket
- Validation des données de voyage et tarification

### Tests d'intégration
- Flux complet : création paiement → callback → création ticket
- Gestion des erreurs à chaque étape
- Notifications WebSocket

### Tests de charge
- Création simultanée de multiples paiements
- Callbacks simultanés
- Performance de la création de tickets

## Surveillance et monitoring

### Métriques importantes
- Taux de succès des paiements → création de tickets
- Temps de traitement des callbacks
- Nombre de tickets créés automatiquement vs manuellement

### Logs à surveiller
- Erreurs dans `handlePaydunyaCallback`
- Échecs de création de tickets après paiement réussi
- Données manquantes dans `customData`

## Impacts sur les clients

### Applications mobiles/web
- Mise à jour des interfaces pour gérer le nouveau flux
- Adaptation des notifications push
- Gestion des états transitoires

### API externe
- Nouvelle endpoint `/api/v1/payments/ticket`
- Changements dans les webhooks de notification
- Structure modifiée des réponses

## Rollback

En cas de problème majeur :

1. **Réactivation de l'ancien flux** : Remettre la création de tickets avant paiement
2. **Migration des données** : Traitement des paiements en cours
3. **Notifications aux utilisateurs** : Information sur les éventuels retards

## Conclusion

Ces modifications simplifient le flux de paiement en garantissant qu'un ticket n'existe que si le paiement est réellement effectué. Cela élimine les tickets en attente non payés et assure une cohérence des données.

Le système devient plus robuste et facilite la gestion des remboursements et annulations.