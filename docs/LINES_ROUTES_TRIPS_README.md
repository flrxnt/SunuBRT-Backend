# Modules Lines, Routes & Trips - Documentation API

Cette documentation couvre les trois nouveaux modules interconnectés du système SunuBRT : **Lines** (Lignes), **Routes** (Trajets) et **Trips** (Voyages).

## Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture des Modules](#architecture-des-modules)
- [Module Lines](#module-lines)
- [Module Routes](#module-routes)
- [Module Trips](#module-trips)
- [Relations entre Modules](#relations-entre-modules)
- [Sécurité et Permissions](#sécurité-et-permissions)
- [Exemples d'Usage](#exemples-dusage)
- [Gestion d'Erreurs](#gestion-derreurs)
- [Tests](#tests)

## Vue d'ensemble

Ces trois modules forment le cœur du système de transport :

- **Lines** : Définissent les lignes de transport (ex: Ligne 1, Ligne A)
- **Routes** : Définissent les parcours avec coordonnées GPS pour chaque ligne
- **Trips** : Définissent les voyages programmés sur les routes avec horaires et tarification

```
Line (Ligne 1) 
├── Route A (Dakar Centre → Guédiawaye)
│   ├── Trip 1 (08:00 - 500 FCFA)
│   ├── Trip 2 (10:00 - 500 FCFA)
│   └── Trip 3 (12:00 - 500 FCFA)
└── Route B (Guédiawaye → Dakar Centre)
    ├── Trip 4 (09:00 - 500 FCFA)
    └── Trip 5 (11:00 - 500 FCFA)
```

## Architecture des Modules

### Structure des fichiers

```
src/
├── lines/
│   ├── dto/
│   │   ├── create-line.dto.ts
│   │   └── update-line.dto.ts
│   ├── entities/
│   │   └── line.entity.ts
│   ├── lines.controller.ts
│   ├── lines.service.ts
│   └── lines.module.ts
├── routes/
│   ├── dto/
│   │   ├── create-route.dto.ts
│   │   └── update-route.dto.ts
│   ├── entities/
│   │   └── route.entity.ts
│   ├── routes.controller.ts
│   ├── routes.service.ts
│   └── routes.module.ts
└── trips/
    ├── dto/
    │   ├── create-trip.dto.ts
    │   └── update-trip.dto.ts
    ├── entities/
    │   └── trip.entity.ts
    ├── trips.controller.ts
    ├── trips.service.ts
    └── trips.module.ts
```

## Module Lines

### Modèle de données

```typescript
interface Line {
  id: number;              // ID unique auto-incrémenté
  name: string;            // Nom de la ligne (ex: "Ligne 1")
  number: string;          // Numéro unique (ex: "1", "A", "BRT1")
  color?: string;          // Couleur hexadécimale (#FF5722)
  description?: string;    // Description optionnelle
  isActive: boolean;       // Statut actif/inactif
  createdAt: Date;         // Date de création
  updatedAt: Date;         // Date de mise à jour
  
  // Relations
  buses?: Bus[];           // Bus assignés à cette ligne
  routes?: Route[];        // Routes de cette ligne
}
```

### Endpoints Lines

| Endpoint | Méthode | Accès | Description |
|----------|---------|--------|-------------|
| `/lines` | POST | Admin | Créer une nouvelle ligne |
| `/lines` | GET | Public | Liste toutes les lignes |
| `/lines/statistics` | GET | Admin | Statistiques des lignes |
| `/lines/search?q={term}` | GET | Public | Rechercher des lignes |
| `/lines/number/{number}` | GET | Public | Récupérer par numéro |
| `/lines/{id}` | GET | Public | Récupérer par ID |
| `/lines/{id}` | PATCH | Admin | Mettre à jour une ligne |
| `/lines/{id}/toggle-active` | PATCH | Admin | Activer/désactiver |
| `/lines/{id}` | DELETE | Admin | Supprimer une ligne |

### Exemples Lines

**Créer une ligne :**
```json
POST /api/v1/lines
{
  "name": "Ligne 1",
  "number": "1",
  "color": "#FF5722",
  "description": "Ligne principale reliant le centre-ville aux banlieues",
  "isActive": true
}
```

**Réponse :**
```json
{
  "id": 1,
  "name": "Ligne 1",
  "number": "1",
  "color": "#FF5722",
  "description": "Ligne principale reliant le centre-ville aux banlieues",
  "isActive": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "buses": [],
  "routes": []
}
```

## Module Routes

### Modèle de données

```typescript
interface Route {
  id: number;              // ID unique auto-incrémenté
  name: string;            // Nom de la route
  lineId?: number;         // ID de la ligne (optionnel)
  startPointId?: number;   // ID du point de départ
  endPointId?: number;     // ID du point d'arrivée
  distance?: number;       // Distance calculée en km
  duration?: number;       // Durée estimée en minutes
  description?: string;    // Description optionnelle
  isActive: boolean;       // Statut actif/inactif
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  line?: Line;             // Ligne associée
  startPoint?: RoutePoint; // Point de départ
  endPoint?: RoutePoint;   // Point d'arrivée
  points?: RoutePoint[];   // Tous les points du trajet
  trips?: Trip[];          // Voyages sur cette route
}

interface RoutePoint {
  id: number;
  routeId: number;
  latitude: number;        // Coordonnée GPS
  longitude: number;       // Coordonnée GPS
  elevation?: number;      // Altitude optionnelle
  seq: number;             // Ordre dans la séquence (1, 2, 3...)
  name?: string;           // Nom optionnel (ex: "Arrêt Central")
}
```

### Endpoints Routes

| Endpoint | Méthode | Accès | Description |
|----------|---------|--------|-------------|
| `/routes` | POST | Admin | Créer une nouvelle route |
| `/routes` | GET | Public | Liste toutes les routes |
| `/routes/statistics` | GET | Admin | Statistiques des routes |
| `/routes/search?q={term}` | GET | Public | Rechercher des routes |
| `/routes/nearby?lat={lat}&lng={lng}&radius={km}` | GET | Public | Routes proches d'une position |
| `/routes/line/{lineId}` | GET | Public | Routes d'une ligne |
| `/routes/{id}` | GET | Public | Récupérer par ID |
| `/routes/{id}` | PATCH | Admin | Mettre à jour une route |
| `/routes/{id}/toggle-active` | PATCH | Admin | Activer/désactiver |
| `/routes/{id}` | DELETE | Admin | Supprimer une route |

### Exemples Routes

**Créer une route :**
```json
POST /api/v1/routes
{
  "name": "Dakar Centre - Guédiawaye",
  "lineId": 1,
  "description": "Route principale reliant le centre-ville de Dakar à Guédiawaye",
  "points": [
    {
      "latitude": 14.6937,
      "longitude": -17.4441,
      "name": "Dakar Centre"
    },
    {
      "latitude": 14.7167,
      "longitude": -17.4677,
      "name": "Médina"
    },
    {
      "latitude": 14.7833,
      "longitude": -17.4167,
      "name": "Guédiawaye Terminal"
    }
  ],
  "isActive": true
}
```

**Calculs automatiques :**
- Distance : Calculée automatiquement via formule de Haversine
- Durée : Estimée à 25 km/h en moyenne urbaine
- Points de départ/arrivée : Automatiquement définis

## Module Trips

### Modèle de données

```typescript
interface Trip {
  id: number;              // ID unique auto-incrémenté
  routeId: number;         // ID de la route
  busId: string;           // ID du bus assigné
  startTime: Date;         // Heure de départ
  endTime?: Date;          // Heure d'arrivée (optionnelle)
  price: number;           // Prix en FCFA
  availableSeats: number;  // Places disponibles
  status: TripStatus;      // Statut du voyage
  createdAt: Date;
  updatedAt: Date;
  
  // Relations
  route?: Route;           // Route empruntée
  bus?: Bus;               // Bus assigné
  tickets?: Ticket[];      // Tickets vendus
}

enum TripStatus {
  SCHEDULED = 'SCHEDULED',     // Programmé
  IN_PROGRESS = 'IN_PROGRESS', // En cours
  COMPLETED = 'COMPLETED',     // Terminé
  CANCELLED = 'CANCELLED'      // Annulé
}
```

### Endpoints Trips

| Endpoint | Méthode | Accès | Description |
|----------|---------|--------|-------------|
| `/trips` | POST | Admin | Créer un nouveau voyage |
| `/trips` | GET | Public | Liste tous les voyages |
| `/trips/statistics` | GET | Admin | Statistiques des voyages |
| `/trips/search?q={term}` | GET | Public | Rechercher des voyages |
| `/trips/route/{routeId}` | GET | Public | Voyages d'une route |
| `/trips/bus/{busId}` | GET | Driver/Admin | Voyages d'un bus |
| `/trips/{id}` | GET | Public | Récupérer par ID |
| `/trips/{id}` | PATCH | Admin | Mettre à jour un voyage |
| `/trips/{id}/status?status={status}` | PATCH | Driver/Admin | Changer le statut |
| `/trips/{id}` | DELETE | Admin | Supprimer un voyage |

### Exemples Trips

**Créer un voyage :**
```json
POST /api/v1/trips
{
  "routeId": 1,
  "busId": "clxxx-xxxx-xxxx-xxxx",
  "startTime": "2024-01-15T08:00:00Z",
  "endTime": "2024-01-15T09:30:00Z",
  "price": 500,
  "availableSeats": 45,
  "status": "SCHEDULED"
}
```

**Mettre à jour le statut :**
```json
PATCH /api/v1/trips/1/status?status=IN_PROGRESS
```

## Relations entre Modules

### Hiérarchie des données

```
Line (1:N) Routes (1:N) Trips (N:1) Bus
│              │              │
│              │              └── Tickets (1:N) Users
│              │
│              └── RoutePoints (Coordonnées GPS)
│
└── Buses (Assignation optionnelle)
```

### Contraintes métier

1. **Lines** :
   - Nom et numéro uniques
   - Ne peut être supprimée si elle a des bus ou routes actives

2. **Routes** :
   - Minimum 2 points GPS requis
   - Distance et durée calculées automatiquement
   - Ne peut être supprimée si elle a des trips actifs

3. **Trips** :
   - Vérification des conflits d'horaires pour les bus
   - Places disponibles ≤ capacité du bus
   - Ne peut être supprimé si des tickets sont vendus
   - Transitions de statut contrôlées

## Sécurité et Permissions

### Matrice des permissions

| Rôle | Lines | Routes | Trips |
|------|-------|--------|--------|
| **USER** | Read | Read | Read |
| **DRIVER** | Read | Read | Read + UpdateStatus |
| **ADMIN** | Full CRUD | Full CRUD | Full CRUD |

### Guards appliqués

- **AuthGuard** : Authentification JWT
- **RolesGuard** : Vérification des rôles
- **PermissionsGuard** : Permissions granulaires
- **BusOwnershipGuard** : Pour les conducteurs (trips de leur bus)

### Endpoints publics

- GET `/lines` : Consultation des lignes
- GET `/routes` : Consultation des routes  
- GET `/trips` : Consultation des voyages
- GET `/*/search` : Recherche
- GET `/*/{id}` : Détails individuels

## Exemples d'Usage

### Cas d'usage complet

**1. Créer une ligne complète**

```bash
# 1. Créer la ligne
curl -X POST http://localhost:3000/api/v1/lines \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ligne Express",
    "number": "EX1",
    "color": "#2196F3",
    "description": "Ligne express centre-ville"
  }'

# 2. Créer une route pour cette ligne
curl -X POST http://localhost:3000/api/v1/routes \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dakar - Pikine Express",
    "lineId": 1,
    "points": [
      {"latitude": 14.6937, "longitude": -17.4441, "name": "Place Indépendance"},
      {"latitude": 14.7642, "longitude": -17.3736, "name": "Pikine Terminal"}
    ]
  }'

# 3. Programmer des voyages
curl -X POST http://localhost:3000/api/v1/trips \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "routeId": 1,
    "busId": "bus-001",
    "startTime": "2024-01-15T08:00:00Z",
    "price": 750,
    "availableSeats": 50
  }'
```

**2. Recherche et consultation**

```bash
# Rechercher des lignes
curl "http://localhost:3000/api/v1/lines/search?q=express"

# Consulter les routes d'une ligne
curl "http://localhost:3000/api/v1/routes/line/1"

# Consulter les voyages à venir d'une route
curl "http://localhost:3000/api/v1/trips/route/1"

# Statistiques admin
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3000/api/v1/lines/statistics"
```

**3. Gestion en temps réel (Conducteur)**

```bash
# Démarrer un voyage
curl -X PATCH \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  "http://localhost:3000/api/v1/trips/1/status?status=IN_PROGRESS"

# Terminer un voyage  
curl -X PATCH \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  "http://localhost:3000/api/v1/trips/1/status?status=COMPLETED"
```

## Gestion d'Erreurs

### Codes d'erreur courants

| Code | Signification | Exemple |
|------|---------------|---------|
| 400 | Données invalides | Points GPS insuffisants |
| 403 | Accès interdit | Non-admin tentant de créer |
| 404 | Ressource non trouvée | Ligne/Route/Trip inexistant |
| 409 | Conflit | Numéro de ligne déjà utilisé |

### Exemples de réponses d'erreur

**Conflit d'horaire de bus :**
```json
{
  "statusCode": 409,
  "message": "Le bus est déjà assigné à un autre trajet sur cette période",
  "error": "Conflict"
}
```

**Validation échouée :**
```json
{
  "statusCode": 400,
  "message": ["Le nombre minimum de points GPS est 2"],
  "error": "Bad Request"
}
```

## Tests

### Tests E2E disponibles

```bash
# Tests des lignes
npm run test:e2e -- --grep "Lines"

# Tests des routes  
npm run test:e2e -- --grep "Routes"

# Tests des voyages
npm run test:e2e -- --grep "Trips"

# Tests d'intégration
npm run test:e2e -- --grep "Integration"
```

### Scénarios de test

1. **CRUD complet** pour chaque module
2. **Validation des contraintes** métier
3. **Tests de sécurité** et permissions
4. **Tests d'intégration** entre modules
5. **Tests de performance** avec grandes datasets

### Données de test

Utilisez le seed Prisma pour créer des données de test :

```bash
npm run prisma:seed
```

## Performance et Optimisation

### Index recommandés

```sql
-- Lines
CREATE INDEX idx_lines_number ON lines(number);
CREATE INDEX idx_lines_active ON lines(isActive);

-- Routes  
CREATE INDEX idx_routes_line ON routes(lineId);
CREATE INDEX idx_routes_active ON routes(isActive);

-- Trips
CREATE INDEX idx_trips_route ON trips(routeId);
CREATE INDEX idx_trips_bus ON trips(busId);
CREATE INDEX idx_trips_start_time ON trips(startTime);
CREATE INDEX idx_trips_status ON trips(status);
```

### Mise en cache recommandée

- **Lines actives** : Cache 1 heure
- **Routes par ligne** : Cache 30 minutes  
- **Trips à venir** : Cache 5 minutes
- **Statistiques** : Cache 15 minutes

## Migration et Déploiement

### Ordre de migration

1. Appliquer les migrations Prisma
2. Seeder les données de base (lignes principales)
3. Configurer les permissions dans la base
4. Tester les endpoints critiques

```bash
# Migration complète
npm run prisma:migrate:deploy
npm run prisma:seed
npm run test:e2e
```

### Variables d'environnement

Aucune variable supplémentaire requise - utilise la configuration existante du projet.

## Support et Dépannage

### Problèmes courants

1. **Erreur de calcul GPS** : Vérifier la validité des coordonnées
2. **Conflits d'horaires** : Vérifier la disponibilité des bus
3. **Permissions refusées** : Vérifier les rôles utilisateur
4. **Performance lente** : Ajouter les index recommandés

### Logs utiles

```bash
# Logs des services
tail -f logs/lines.log
tail -f logs/routes.log  
tail -f logs/trips.log

# Logs de performance
tail -f logs/performance.log
```

---

Cette documentation couvre l'utilisation complète des trois modules Lines, Routes et Trips. Pour des questions spécifiques, consultez les tests E2E qui servent de documentation vivante des cas d'usage.