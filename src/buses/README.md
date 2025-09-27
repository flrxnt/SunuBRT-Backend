# Module Buses - API Documentation

Ce module gère tous les endpoints liés aux bus du système SunuBRT.

## Modèle de données

### Bus
```typescript
{
  id: string;                 // ID unique du bus (CUID)
  busNumber: string;          // Numéro unique du bus (ex: "001", "A12")
  licensePlate: string;       // Plaque d'immatriculation
  capacity: number;           // Capacité maximale de passagers
  model?: string;             // Modèle du bus
  year?: number;              // Année de fabrication
  lineId?: number;            // ID de la ligne assignée
  driverId: string;           // ID du conducteur assigné
  isActive: boolean;          // Statut actif/inactif
  passengersCount: number;    // Nombre actuel de passagers
  createdAt: Date;            // Date de création
  updatedAt: Date;            // Date de dernière mise à jour
}
```

## Endpoints

### 1. Créer un bus
**POST** `/buses`
- **Rôle requis**: `ADMIN`
- **Description**: Permet aux administrateurs de créer un nouveau bus
- **Body**: `CreateBusDto`
- **Réponses**:
  - `201`: Bus créé avec succès
  - `400`: Données invalides
  - `403`: Accès interdit
  - `409`: Conflit (numéro de bus ou plaque existante)

**Exemple de requête**:
```json
{
  "busNumber": "001",
  "licensePlate": "DK-1234-AB",
  "capacity": 50,
  "model": "Mercedes Citaro",
  "year": 2020,
  "lineId": 1,
  "driverId": "clxxx-xxxx-xxxx-xxxx"
}
```

### 2. Récupérer tous les bus
**GET** `/buses`
- **Rôle requis**: Aucun
- **Description**: Récupère la liste de tous les bus avec filtrage optionnel
- **Query Parameters**:
  - `lineId` (optionnel): Filtrer par ID de ligne
  - `isActive` (optionnel): Filtrer par statut actif
- **Réponse**: `200` - Liste des bus avec relations (ligne, conducteur, position)

**Exemple d'URL**: `/buses?lineId=1&isActive=true`

### 3. Récupérer un bus par ID
**GET** `/buses/:id`
- **Rôle requis**: Aucun
- **Description**: Récupère les détails complets d'un bus spécifique
- **Paramètres**: `id` - ID du bus
- **Réponses**:
  - `200`: Détails du bus avec trajets actifs
  - `404`: Bus non trouvé

### 4. Récupérer les bus d'une ligne
**GET** `/buses/line/:lineId`
- **Rôle requis**: Aucun
- **Description**: Récupère tous les bus actifs d'une ligne spécifique
- **Paramètres**: `lineId` - ID de la ligne
- **Réponses**:
  - `200`: Liste des bus de la ligne
  - `404`: Ligne non trouvée

### 5. Statistiques des bus
**GET** `/buses/statistics`
- **Rôle requis**: `ADMIN`
- **Description**: Fournit des statistiques détaillées sur les bus
- **Réponse**: `200` - Statistiques complètes

**Exemple de réponse**:
```json
{
  "totalBuses": 25,
  "activeBuses": 23,
  "inactiveBuses": 2,
  "busesWithoutLine": 3,
  "busesWithPosition": 20,
  "busesPerLine": [
    {
      "lineId": 1,
      "lineName": "Ligne 1",
      "lineNumber": "1",
      "activeBusesCount": 10
    }
  ]
}
```

### 6. Mettre à jour la position d'un bus
**PATCH** `/buses/:id/position`
- **Rôle requis**: `DRIVER` ou `ADMIN`
- **Description**: Met à jour la position GPS d'un bus en temps réel
- **Autorisation**: Les conducteurs ne peuvent mettre à jour que leur propre bus
- **Body**: `UpdatePositionDto`
- **Réponses**:
  - `200`: Position mise à jour avec succès
  - `400`: Bus inactif ou données invalides
  - `403`: Accès interdit (pas votre bus)
  - `404`: Bus non trouvé

**Exemple de requête**:
```json
{
  "latitude": 14.6937,
  "longitude": -17.4441,
  "altitude": 25.5,
  "speed": 45.2,
  "heading": 180.5,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 7. Mettre à jour un bus
**PATCH** `/buses/:id`
- **Rôle requis**: `ADMIN`
- **Description**: Met à jour les détails d'un bus
- **Body**: `UpdateBusDto`
- **Réponses**:
  - `200`: Bus mis à jour avec succès
  - `400`: Données invalides
  - `403`: Accès interdit
  - `404`: Bus non trouvé
  - `409`: Conflit (numéro de bus ou plaque existante)

### 8. Supprimer un bus
**DELETE** `/buses/:id`
- **Rôle requis**: `ADMIN`
- **Description**: Supprime un bus (seulement s'il n'a pas de trajets actifs)
- **Réponses**:
  - `200`: Bus supprimé avec succès
  - `400`: Bus avec trajets actifs
  - `403`: Accès interdit
  - `404`: Bus non trouvé

## Validations et contraintes

### Contraintes d'unicité
- `busNumber`: Doit être unique dans le système
- `licensePlate`: Doit être unique dans le système
- `driverId`: Un conducteur ne peut être assigné qu'à un seul bus

### Validations métier
- Le conducteur assigné doit avoir le rôle `DRIVER`
- La capacité doit être entre 1 et 200 passagers
- Le nombre de passagers ne peut pas dépasser la capacité
- L'année de fabrication doit être entre 1980 et année courante + 2
- La ligne assignée doit être active
- Seuls les bus actifs peuvent avoir leur position mise à jour

## Relations

### Avec le modèle Line
- Un bus peut être assigné à une ligne (relation optionnelle)
- Une ligne peut avoir plusieurs bus

### Avec le modèle User (Driver)
- Chaque bus doit avoir un conducteur assigné
- Un conducteur ne peut conduire qu'un seul bus

### Avec le modèle Position
- Chaque bus peut avoir une position actuelle (relation 1:1 optionnelle)
- La position est mise à jour en temps réel par le conducteur

### Avec le modèle Trip
- Un bus peut avoir plusieurs trajets
- Les trajets actifs empêchent la suppression du bus

## Sécurité et autorisations

### Administrateurs (ADMIN)
- CRUD complet sur tous les bus
- Accès aux statistiques
- Peuvent mettre à jour les positions de tous les bus

### Conducteurs (DRIVER)
- Peuvent seulement mettre à jour la position de leur propre bus
- Lecture seule pour les autres opérations

### Utilisateurs (USER)
- Lecture seule sur tous les endpoints publics
- Ne peuvent pas accéder aux statistiques

## Migration Prisma

Pour appliquer les changements au schéma de base de données :

```bash
# Générer le client Prisma
npx prisma generate

# Appliquer les migrations (en développement)
npx prisma migrate dev

# Appliquer les migrations (en production)
npx prisma migrate deploy
```

La migration ajoute :
- Le nouveau modèle `Line`
- Le champ `busNumber` au modèle `Bus`
- Le champ `lineId` aux modèles `Bus` et `Route`
- Les contraintes d'unicité appropriées
- Les relations foreign key