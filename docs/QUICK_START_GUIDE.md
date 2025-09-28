# 🚀 Guide de Démarrage Rapide - Modules Lines, Routes & Trips

Ce guide vous permet de démarrer rapidement avec les nouveaux modules Lines, Routes et Trips du système SunuBRT.

## 📋 Prérequis

- ✅ Node.js >= 18.x
- ✅ PostgreSQL en cours d'exécution
- ✅ Variables d'environnement configurées (`.env`)
- ✅ Dépendances installées (`npm install`)

## 🚀 Démarrage en 5 minutes

### 1. Installation et configuration

```bash
# Cloner et installer les dépendances (si pas déjà fait)
git clone <repo-url>
cd SunuBRT-Backend
npm install

# Configurer la base de données
cp .env.example .env
# Éditer .env avec vos paramètres DB

# Générer le client Prisma et appliquer les migrations
npx prisma generate
npx prisma migrate dev
```

### 2. Peupler avec des données de test

```bash
# Option 1: Seed complet avec données de test
npx tsx prisma/seed-lines-routes-trips.ts

# Option 2: Si vous préférez le seed standard
npm run prisma:seed
```

### 3. Démarrer le serveur

```bash
# Mode développement (avec hot-reload)
npm run start:dev

# Le serveur démarre sur http://localhost:3000
# Swagger UI disponible sur http://localhost:3000/api
```

### 4. Tester les endpoints

```bash
# Lancer les tests automatiques
node test-endpoints.js

# Ou tester manuellement avec curl (voir exemples ci-dessous)
```

## 🧪 Tests rapides avec curl

### Endpoints publics (sans authentification)

```bash
# Lister toutes les lignes
curl http://localhost:3000/api/v1/lines

# Rechercher une ligne
curl "http://localhost:3000/api/v1/lines/search?q=ligne"

# Lister les routes d'une ligne
curl http://localhost:3000/api/v1/routes/line/1

# Lister les voyages à venir
curl http://localhost:3000/api/v1/trips

# Rechercher des voyages
curl "http://localhost:3000/api/v1/trips/search?q=dakar"
```

### Endpoints d'administration (nécessite token admin)

```bash
# Remplacer YOUR_ADMIN_TOKEN par un vrai token JWT admin
export ADMIN_TOKEN="YOUR_ADMIN_TOKEN"

# Créer une nouvelle ligne
curl -X POST http://localhost:3000/api/v1/lines \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ligne Test",
    "number": "TEST",
    "color": "#FF5722",
    "description": "Ligne de test"
  }'

# Créer une route
curl -X POST http://localhost:3000/api/v1/routes \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Route Test",
    "lineId": 1,
    "points": [
      {"latitude": 14.6937, "longitude": -17.4441, "name": "Point A"},
      {"latitude": 14.7167, "longitude": -17.4677, "name": "Point B"}
    ]
  }'

# Obtenir les statistiques
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/v1/lines/statistics
```

## 📊 Données de test créées

Le script de seed crée automatiquement :

### Lignes (3)
- **Ligne 1** (rouge #FF5722) : Dakar Centre - Guédiawaye
- **Ligne A** (bleu #2196F3) : Ligne express Dakar-Pikine  
- **Ligne BRT** (vert #4CAF50) : Bus Rapid Transit principal

### Routes (4)
- **Dakar Centre → Guédiawaye** (5 arrêts)
- **Guédiawaye → Dakar Centre** (5 arrêts)
- **Dakar → Pikine Express** (3 arrêts)
- **Corridor BRT Principal** (5 arrêts)

### Voyages (6)
- Voyages d'aujourd'hui avec différents statuts
- Voyages programmés pour demain
- Voyages terminés pour les statistiques

### Utilisateurs & Bus
- 3 conducteurs de test
- 3 bus assignés aux lignes
- Positions GPS en temps réel

## 🎯 Cas d'usage principaux

### 1. Consultation des lignes et horaires (Utilisateur)
```bash
# Voir toutes les lignes disponibles
curl http://localhost:3000/api/v1/lines?withRoutes=true

# Voir les voyages d'une route spécifique
curl http://localhost:3000/api/v1/trips/route/1

# Rechercher des voyages pour demain
curl "http://localhost:3000/api/v1/trips?dateFrom=2024-12-20T00:00:00Z"
```

### 2. Gestion du transport (Conducteur)
```bash
# Voir ses voyages assignés (remplacer BUS_ID)
curl -H "Authorization: Bearer $DRIVER_TOKEN" \
  http://localhost:3000/api/v1/trips/bus/BUS_ID

# Démarrer un voyage
curl -X PATCH \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  "http://localhost:3000/api/v1/trips/1/status?status=IN_PROGRESS"

# Terminer un voyage
curl -X PATCH \
  -H "Authorization: Bearer $DRIVER_TOKEN" \
  "http://localhost:3000/api/v1/trips/1/status?status=COMPLETED"
```

### 3. Administration du système (Admin)
```bash
# Créer une nouvelle ligne complète
curl -X POST http://localhost:3000/api/v1/lines \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ligne Nouvelle",
    "number": "N1",
    "color": "#9C27B0",
    "description": "Nouvelle ligne de transport"
  }'

# Voir les statistiques complètes
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/v1/trips/statistics
```

## 🔍 Documentation complète

### Swagger UI
- Interface graphique : http://localhost:3000/api
- Testez tous les endpoints directement dans le navigateur
- Documentation automatique avec exemples

### Fichiers de documentation
- **LINES_ROUTES_TRIPS_README.md** : Guide utilisateur complet
- **IMPLEMENTATION_SUMMARY.md** : Résumé technique détaillé
- **docs/AUTH_USERS_README.md** : Système d'authentification
- **docs/BUSES_README.md** : Module des bus

## 🐛 Dépannage

### Erreurs courantes

**1. Base de données non accessible**
```bash
# Vérifier que PostgreSQL fonctionne
pg_isready

# Recréer la base si nécessaire
npx prisma migrate reset
```

**2. Erreurs de token JWT**
```bash
# Créer un token d'admin pour les tests
# Se connecter d'abord puis utiliser le token retourné
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@sunubrt.com", "password": "admin_password"}'
```

**3. Conflits de données**
```bash
# Nettoyer et recréer les données de test
npx prisma migrate reset
npx tsx prisma/seed-lines-routes-trips.ts
```

**4. Port déjà utilisé**
```bash
# Changer le port dans .env
echo "PORT=3001" >> .env
npm run start:dev
```

### Logs utiles

```bash
# Voir les logs en temps réel
npm run start:dev | grep -E "(ERROR|WARN|Lines|Routes|Trips)"

# Activer les logs Prisma pour debug DB
echo "DATABASE_URL='postgresql://user:pass@localhost:5432/db?schema=public&logging=true'" > .env
```

## ✅ Vérification du fonctionnement

Après le setup, vous devriez pouvoir :

1. ✅ Voir la documentation Swagger sur http://localhost:3000/api
2. ✅ Lister les lignes : `curl http://localhost:3000/api/v1/lines`
3. ✅ Voir les routes : `curl http://localhost:3000/api/v1/routes`
4. ✅ Consulter les voyages : `curl http://localhost:3000/api/v1/trips`
5. ✅ Effectuer des recherches : `curl "http://localhost:3000/api/v1/lines/search?q=ligne"`

## 🚀 Prochaines étapes

Une fois le système fonctionnel :

1. **Intégrer avec votre frontend** en utilisant les endpoints documentés
2. **Configurer l'authentification** avec de vrais utilisateurs
3. **Personnaliser les données** en modifiant le seed ou via l'API
4. **Monitorer les performances** avec les logs d'accès
5. **Déployer en production** après configuration des variables d'environnement

## 💡 Conseils

- Utilisez **Swagger UI** pour explorer interactivement tous les endpoints
- Le **script de test** (`test-endpoints.js`) est idéal pour valider l'installation
- Les **statistiques admin** donnent une vue d'ensemble du système
- Les **permissions sont granulaires** - adaptez-les selon vos besoins
- La **géolocalisation** est prête pour des extensions futures

---

**🎉 Vous êtes prêt !** Les modules Lines, Routes et Trips sont maintenant opérationnels. 

Pour des questions spécifiques, consultez la documentation complète ou les tests d'exemple.