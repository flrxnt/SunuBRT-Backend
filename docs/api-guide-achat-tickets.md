# Guide d'utilisation de l'API d'achat de tickets SunuBRT

## Authentification

Toutes les requêtes nécessitent un token JWT valide dans l'en-tête `Authorization`:

```
Authorization: Bearer <votre_token_jwt>
```

## Flux complet d'achat de ticket

### 1. Authentification utilisateur

**POST** `/api/v1/auth/login`

```json
{
  "email": "user@example.com",
  "password": "motdepasse123"
}
```

**Réponse:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "Amadou",
    "lastName": "Diallo"
  }
}
```

### 2. Recherche de voyages disponibles

**GET** `/api/v1/trips?startDate=2024-01-20&routeId=1`

**Réponse:**
```json
[
  {
    "id": 1,
    "startTime": "2024-01-20T10:30:00Z",
    "endTime": "2024-01-20T12:00:00Z",
    "availableSeats": 45,
    "price": 500,
    "status": "SCHEDULED",
    "route": {
      "id": 1,
      "name": "Dakar Centre → Guédiawaye",
      "line": {
        "name": "Ligne 1",
        "color": "#FF0000"
      }
    },
    "bus": {
      "busNumber": "BUS001",
      "licensePlate": "DK-1234-AB"
    }
  }
]
```

### 3. Consulter les tarifications disponibles

**GET** `/api/v1/tickets/pricing/1?passengers=2`

**Paramètres:**
- `tripId`: 1 (dans l'URL)
- `passengers`: 2 (optionnel, défaut: 1)

**Réponse:**
```json
[
  {
    "id": 1,
    "name": "Tarif Standard",
    "type": "STANDARD",
    "description": "Tarif normal pour tous les voyageurs",
    "originalPrice": 500,
    "finalPrice": 500,
    "totalPrice": 1000,
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
    "description": "Tarif réduit avec 30% de réduction",
    "originalPrice": 500,
    "finalPrice": 350,
    "totalPrice": 700,
    "discountPercent": 30,
    "validityDuration": 12,
    "validityPeriodType": "HOURS",
    "specialConditions": "Carte étudiante requise",
    "maxTickets": 50
  }
]
```

### 4. Initier l'achat avec paiement

**POST** `/api/v1/tickets/purchase`

```json
{
  "tripId": 1,
  "pricingId": 1,
  "seatNumber": "A15",
  "passengers": 2,
  "notes": "Voyage familial",
  "provider": "PAYDUNYA",
  "paymentMethod": "MOBILE_MONEY",
  "customerName": "Amadou Diallo",
  "customerEmail": "amadou.diallo@example.com",
  "customerPhone": "+221701234567",
  "promoCode": "WELCOME10"
}
```

**Réponse:**
```json
{
  "paymentId": 123,
  "paymentUrl": "https://app.paydunya.com/sandbox-checkout/checkout-invoice/b99ce65b63a4cbe87dc1b8bb07b094b5",
  "paymentToken": "b99ce65b63a4cbe87dc1b8bb07b094b5",
  "amount": 900,
  "currency": "XOF",
  "status": "PENDING",
  "tripInfo": {
    "id": 1,
    "routeName": "Dakar Centre → Guédiawaye",
    "startTime": "2024-01-20T10:30:00Z",
    "busNumber": "BUS001",
    "availableSeats": 43
  },
  "pricingInfo": {
    "id": 1,
    "name": "Tarif Standard",
    "type": "STANDARD",
    "originalPrice": 500,
    "finalPrice": 450,
    "discountPercent": 10,
    "validityDuration": 24,
    "validityPeriodType": "HOURS"
  },
  "reservedSeat": "A15",
  "reservationValidityMinutes": 15,
  "reservationExpiresAt": "2024-01-20T10:45:00Z"
}
```

### 5. Redirection vers le paiement

Rediriger l'utilisateur vers `paymentUrl` pour effectuer le paiement.

### 6. Vérifier le statut du paiement

**GET** `/api/v1/payments/123/status`

**Réponse:**
```json
{
  "id": 123,
  "status": "COMPLETED",
  "amount": 900,
  "currency": "XOF",
  "paidAt": "2024-01-20T10:35:00Z",
  "transactionReference": "TXN_PAYDUNYA_789456123",
  "ticket": {
    "id": 456,
    "status": "PENDING"
  }
}
```

### 7. Activer le ticket après paiement confirmé

**POST** `/api/v1/tickets`

```json
{
  "paymentId": 123,
  "seatNumber": "A15",
  "passengers": 2,
  "notes": "Voyage familial - paiement confirmé"
}
```

**Réponse:**
```json
{
  "id": 456,
  "qrCode": "SUNUBRT-1705747200-A1B2C3D4",
  "seatNumber": "A15",
  "status": "PAID",
  "purchaseDate": "2024-01-20T10:35:00Z",
  "validUntil": "2024-01-21T10:35:00Z",
  "passengers": 2,
  "notes": "Voyage familial - paiement confirmé",
  "trip": {
    "id": 1,
    "startTime": "2024-01-20T10:30:00Z",
    "route": {
      "name": "Dakar Centre → Guédiawaye",
      "line": {
        "name": "Ligne 1",
        "color": "#FF0000"
      }
    },
    "bus": {
      "busNumber": "BUS001"
    }
  },
  "pricing": {
    "name": "Tarif Standard",
    "type": "STANDARD"
  },
  "payment": {
    "id": 123,
    "amount": 900,
    "status": "COMPLETED"
  }
}
```

## Gestion des erreurs

### Codes d'erreur courants

- **400 Bad Request**: Données invalides
- **401 Unauthorized**: Token manquant ou invalide
- **403 Forbidden**: Permissions insuffisantes
- **404 Not Found**: Ressource non trouvée
- **409 Conflict**: Conflit (ex: siège déjà pris)
- **422 Unprocessable Entity**: Données invalides

### Exemples d'erreurs

**Siège déjà pris:**
```json
{
  "statusCode": 409,
  "message": "Le siège A15 est déjà pris",
  "error": "Conflict"
}
```

**Voyage complet:**
```json
{
  "statusCode": 400,
  "message": "Pas assez de places disponibles. Places restantes: 0",
  "error": "Bad Request"
}
```

**Paiement non confirmé:**
```json
{
  "statusCode": 400,
  "message": "Le paiement n'est pas encore confirmé",
  "error": "Bad Request"
}
```

## Webhooks de paiement

Le système reçoit automatiquement les notifications de paiement des fournisseurs. Aucune action manuelle n'est requise.

**Endpoint webhook PayDunya:** `POST /api/v1/payments/paydunya/callback`

## API de validation de tickets

### Scanner un ticket

**POST** `/api/v1/tickets/scan`

```json
{
  "qrCode": "SUNUBRT-1705747200-A1B2C3D4"
}
```

**Réponse:**
```json
{
  "isValid": true,
  "message": "Ticket valide",
  "ticket": {
    "id": 456,
    "qrCode": "SUNUBRT-1705747200-A1B2C3D4",
    "seatNumber": "A15",
    "passengerName": "Amadou Diallo",
    "tripInfo": {
      "routeName": "Dakar Centre → Guédiawaye",
      "startTime": "2024-01-20T10:30:00Z",
      "busNumber": "BUS001"
    },
    "validUntil": "2024-01-21T10:35:00Z",
    "status": "PAID"
  }
}
```

### Valider un ticket

**POST** `/api/v1/tickets/validate`

```json
{
  "qrCode": "SUNUBRT-1705747200-A1B2C3D4",
  "latitude": 14.6937,
  "longitude": -17.4441,
  "notes": "Validation à bord du bus BUS001"
}
```

## Codes d'exemple

### JavaScript/React

```javascript
class SunuBRTClient {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...options.headers,
      },
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Récupérer les tarifications
  async getPricing(tripId, passengers = 1) {
    return this.request(`/api/v1/tickets/pricing/${tripId}?passengers=${passengers}`);
  }

  // Initier l'achat
  async initiatePurchase(purchaseData) {
    return this.request('/api/v1/tickets/purchase', {
      method: 'POST',
      body: JSON.stringify(purchaseData),
    });
  }

  // Vérifier le statut du paiement
  async getPaymentStatus(paymentId) {
    return this.request(`/api/v1/payments/${paymentId}/status`);
  }

  // Activer le ticket
  async createTicket(ticketData) {
    return this.request('/api/v1/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData),
    });
  }
}

// Utilisation
const client = new SunuBRTClient('https://api.sunubrt.sn', 'your-jwt-token');

async function buyTicket() {
  try {
    // 1. Récupérer les tarifications
    const pricings = await client.getPricing(1, 2);
    console.log('Tarifications disponibles:', pricings);

    // 2. Initier l'achat
    const purchase = await client.initiatePurchase({
      tripId: 1,
      pricingId: pricings[0].id,
      seatNumber: 'A15',
      passengers: 2,
      customerName: 'Amadou Diallo',
      customerEmail: 'amadou@example.com',
      customerPhone: '+221701234567',
    });

    // 3. Rediriger vers le paiement
    window.location.href = purchase.paymentUrl;

    // 4. Après retour de paiement, vérifier le statut
    const paymentStatus = await client.getPaymentStatus(purchase.paymentId);
    
    if (paymentStatus.status === 'COMPLETED') {
      // 5. Activer le ticket
      const ticket = await client.createTicket({
        paymentId: purchase.paymentId,
        seatNumber: 'A15',
        passengers: 2,
      });
      
      console.log('Ticket créé:', ticket);
    }
  } catch (error) {
    console.error('Erreur lors de l\'achat:', error);
  }
}
```

### Python

```python
import requests
from typing import Dict, Any

class SunuBRTClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        })

    def get_pricing(self, trip_id: int, passengers: int = 1) -> list:
        response = self.session.get(
            f"{self.base_url}/api/v1/tickets/pricing/{trip_id}",
            params={'passengers': passengers}
        )
        response.raise_for_status()
        return response.json()

    def initiate_purchase(self, purchase_data: Dict[str, Any]) -> dict:
        response = self.session.post(
            f"{self.base_url}/api/v1/tickets/purchase",
            json=purchase_data
        )
        response.raise_for_status()
        return response.json()

    def get_payment_status(self, payment_id: int) -> dict:
        response = self.session.get(
            f"{self.base_url}/api/v1/payments/{payment_id}/status"
        )
        response.raise_for_status()
        return response.json()

    def create_ticket(self, ticket_data: Dict[str, Any]) -> dict:
        response = self.session.post(
            f"{self.base_url}/api/v1/tickets",
            json=ticket_data
        )
        response.raise_for_status()
        return response.json()
```

## Limites et considérations

### Limites de taux

- **Authentifié**: 100 requêtes/minute
- **Non authentifié**: 20 requêtes/minute

### Expiration des réservations

- Les sièges sont réservés pendant **15 minutes** lors de l'initiation d'achat
- Après expiration, la réservation est automatiquement libérée

### Remboursements

- Les remboursements doivent être demandés via l'API admin
- Les tickets utilisés ne peuvent pas être remboursés
- Délai de remboursement: 5-7 jours ouvrables

### Support

Pour toute question technique, contactez l'équipe de développement:
- **Email**: dev@sunubrt.sn
- **Documentation**: https://docs.sunubrt.sn
- **Status**: https://status.sunubrt.sn