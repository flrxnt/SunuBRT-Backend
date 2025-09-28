# Flux d'achat de tickets avec paiement obligatoire

## Vue d'ensemble

Le nouveau flux d'achat de tickets SunuBRT impose le paiement avant la création du ticket, garantissant ainsi que tous les tickets générés correspondent à des transactions confirmées.

## Étapes du flux

### 1. Consultation des tarifications disponibles

**Endpoint:** `GET /api/v1/tickets/pricing/{tripId}`

**Paramètres:**
- `tripId`: ID du voyage
- `passengers` (optionnel): Nombre de passagers (défaut: 1)

**Exemple de réponse:**
```json
[
  {
    "id": 1,
    "name": "Tarif Standard",
    "type": "STANDARD",
    "description": "Tarif standard pour tous les voyageurs",
    "originalPrice": 500,
    "finalPrice": 500,
    "totalPrice": 500,
    "discountPercent": 0,
    "validityDuration": 24,
    "validityPeriodType": "HOURS",
    "specialConditions": null,
    "maxTickets": null
  },
  {
    "id": 2,
    "name": "Tarif Étudiant",
    "type": "STUDENT",
    "description": "Tarif réduit pour les étudiants",
    "originalPrice": 500,
    "finalPrice": 350,
    "totalPrice": 350,
    "discountPercent": 30,
    "validityDuration": 12,
    "validityPeriodType": "HOURS",
    "specialConditions": "Présentation de la carte étudiante requise",
    "maxTickets": 100
  }
]
```

### 2. Initiation de l'achat avec paiement

**Endpoint:** `POST /api/v1/tickets/purchase`

**Payload:**
```json
{
  "tripId": 1,
  "pricingId": 1,
  "seatNumber": "A15",
  "passengers": 1,
  "notes": "Voyage pour rendez-vous médical",
  "provider": "PAYDUNYA",
  "paymentMethod": "MOBILE_MONEY",
  "customerName": "Amadou Diallo",
  "customerEmail": "amadou.diallo@example.com",
  "customerPhone": "+221701234567",
  "promoCode": "NOEL2024"
}
```

**Réponse:**
```json
{
  "paymentId": 123,
  "paymentUrl": "https://app.paydunya.com/sandbox-checkout/checkout-invoice/token123",
  "paymentToken": "paydunya_token_abc123",
  "amount": 500,
  "currency": "XOF",
  "status": "PENDING",
  "tripInfo": {
    "id": 1,
    "routeName": "Ligne 1 - Dakar Centre → Guédiawaye",
    "startTime": "2024-01-20T10:30:00Z",
    "busNumber": "BUS001",
    "availableSeats": 45
  },
  "pricingInfo": {
    "id": 1,
    "name": "Tarif Standard",
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

### 3. Processus de paiement

L'utilisateur est redirigé vers l'URL de paiement (`paymentUrl`) pour effectuer le paiement via le fournisseur choisi (PayDunya, Orange Money, etc.).

### 4. Callback de paiement

Une fois le paiement effectué, le fournisseur de paiement notifie notre système via un webhook. Le statut du paiement passe à `COMPLETED`.

### 5. Création du ticket final

**Endpoint:** `POST /api/v1/tickets`

**Payload:**
```json
{
  "paymentId": 123,
  "seatNumber": "A15",
  "passengers": 1,
  "notes": "Voyage pour rendez-vous médical"
}
```

Cette étape active le ticket en changeant son statut de `PENDING` à `PAID`.

## Statuts des tickets

- **PENDING**: Ticket créé mais paiement non confirmé
- **PAID**: Ticket payé et actif, prêt à être utilisé
- **USED**: Ticket utilisé lors du voyage
- **CANCELLED**: Ticket annulé
- **EXPIRED**: Ticket expiré

## Avantages du nouveau flux

1. **Sécurité**: Aucun ticket gratuit ne peut être créé
2. **Traçabilité**: Chaque ticket est lié à un paiement confirmé
3. **Gestion des stocks**: Les places sont réservées temporairement pendant le paiement
4. **Flexibilité**: Support de multiple fournisseurs de paiement
5. **Tarification dynamique**: Différentes tarifications selon le profil utilisateur

## Gestion des erreurs

### Paiement échoué
Si le paiement échoue, le ticket reste en statut `PENDING` et peut être supprimé automatiquement après expiration de la réservation.

### Réservation expirée
Si l'utilisateur ne finalise pas le paiement dans les 15 minutes, la réservation de siège expire.

### Voyage complet
Si toutes les places sont prises pendant le processus de paiement, l'achat est annulé et le paiement remboursé.

## Intégration frontend

```javascript
// 1. Récupérer les tarifications
const pricings = await fetch('/api/v1/tickets/pricing/1?passengers=2');

// 2. Initier l'achat
const purchase = await fetch('/api/v1/tickets/purchase', {
  method: 'POST',
  body: JSON.stringify({
    tripId: 1,
    pricingId: selectedPricing.id,
    // ... autres champs
  })
});

// 3. Rediriger vers le paiement
window.location.href = purchase.paymentUrl;

// 4. Après retour de paiement, vérifier le statut
const paymentStatus = await fetch(`/api/v1/payments/${purchase.paymentId}/status`);

// 5. Si paiement confirmé, activer le ticket
if (paymentStatus.status === 'COMPLETED') {
  const ticket = await fetch('/api/v1/tickets', {
    method: 'POST',
    body: JSON.stringify({
      paymentId: purchase.paymentId,
      // ... autres champs
    })
  });
}
```

## Configuration des tarifications

Les administrateurs peuvent configurer différents types de tarifications:

- **STANDARD**: Tarif normal
- **STUDENT**: Tarif étudiant
- **SENIOR**: Tarif senior
- **DISABLED**: Tarif pour personnes handicapées
- **EXPRESS**: Tarif express avec services premium

Chaque tarification peut avoir:
- Des conditions spéciales
- Une durée de validité personnalisée
- Des remises automatiques
- Des restrictions par ligne ou route
- Un nombre maximum de tickets