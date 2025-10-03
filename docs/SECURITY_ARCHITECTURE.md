# Architecture de Sécurité - SunuBRT Backend

## Vue d'ensemble

Ce document décrit l'architecture de sécurité implémentée dans le backend SunuBRT, incluant les guards, interceptors, décorateurs et stratégies d'autorisation.

> ⚠️ **IMPORTANT**: Avant de déployer en production, consultez [SECURITY_CRITICAL_WARNINGS.md](./SECURITY_CRITICAL_WARNINGS.md) pour les avertissements de sécurité critiques et les correctifs récents.

## 🔐 Composants de Sécurité

### 1. Guards (Gardes)

#### AuthGuard
- **Fichier**: `src/common/guards/auth.guard.ts`
- **Fonction**: Vérifie l'authentification JWT
- **Usage**: Appliqué globalement sur tous les endpoints sauf ceux marqués `@Public()`

```typescript
@UseGuards(AuthGuard)
```

#### RolesGuard
- **Fichier**: `src/common/guards/roles.guard.ts`  
- **Fonction**: Vérifie les rôles utilisateur (USER, DRIVER, ADMIN)
- **Usage**: Utilisé avec le décorateur `@Roles()`

```typescript
@Roles(Role.ADMIN, Role.DRIVER)
```

#### PermissionsGuard
- **Fichier**: `src/common/guards/permissions.guard.ts`
- **Fonction**: Vérifie les permissions granulaires
- **Usage**: Utilisé avec les décorateurs de permissions

```typescript
@RequiresBusManagement()
```

#### BusOwnershipGuard
- **Fichier**: `src/common/guards/bus-ownership.guard.ts`
- **Fonction**: Vérifie que les conducteurs ne peuvent accéder qu'à leur propre bus
- **Usage**: Appliqué sur les endpoints de mise à jour de position

#### RoleCreationGuard
- **Fichier**: `src/common/guards/role-creation.guard.ts`
- **Fonction**: Contrôle la création d'utilisateurs selon les rôles
- **Usage**: Appliqué sur les endpoints de création d'utilisateur

#### AppGuard (Global)
- **Fichier**: `src/common/guards/app.guard.ts`
- **Fonction**: Guard global combinant authentification, rôles et permissions
- **Usage**: Alternative tout-en-un aux guards individuels

### 2. Décorateurs

#### @Public()
- **Fichier**: `src/common/decorators/public.decorator.ts`
- **Fonction**: Marque les endpoints comme publics (pas d'authentification requise)

#### @Roles()
- **Fichier**: `src/common/decorators/roles.decorator.ts`
- **Fonction**: Spécifie les rôles requis pour accéder à un endpoint

#### @CurrentUser()
- **Fichier**: `src/common/decorators/current-user.decorator.ts`
- **Fonction**: Injecte les données de l'utilisateur authentifié

#### Décorateurs de Permissions
- **Fichier**: `src/common/decorators/permissions.decorator.ts`
- **Fonction**: Système de permissions granulaires

```typescript
// Décorateurs disponibles
@RequiresBusManagement()
@RequiresBusRead()
@RequiresBusPositionUpdate()
@RequiresUserManagement()
@RequiresUserRead()
@RequiresAdminAccess()
@RequiresOwnResourceAccess()
```

### 3. Interceptors

#### AccessLogInterceptor
- **Fichier**: `src/common/interceptors/access-log.interceptor.ts`
- **Fonction**: Log des accès utilisateur avec détails de sécurité
- **Données loggées**:
  - Utilisateur (email, rôle)
  - Endpoint accédé
  - Adresse IP
  - User-Agent
  - Temps de réponse
  - Status de la requête

## 🎯 Matrice des Rôles et Permissions

### Rôle USER
```typescript
Permissions: [
  'read:bus',
  'read:line', 
  'read:trip',
  'create:ticket',
  'read:own:ticket',
  'create:payment',
  'read:own:payment',
  'read:own:profile',
  'update:own:profile'
]
```

### Rôle DRIVER
```typescript
Permissions: [
  ...USER_PERMISSIONS,
  'read:own:bus',
  'update:own:bus:position'
]
```

### Rôle ADMIN
```typescript
Permissions: [
  // Toutes les permissions système
  'create:*', 'read:*', 'update:*', 'delete:*',
  'manage:system'
]
```

## 🚌 Sécurité Spécifique aux Bus

### Endpoints Publics (sans authentification)
- `GET /buses` - Liste des bus
- `GET /buses/line/:lineId` - Bus d'une ligne
- `GET /buses/:id` - Détails d'un bus

### Endpoints Protégés

#### Administrateurs uniquement
- `POST /buses` - Créer un bus
- `PATCH /buses/:id` - Modifier un bus  
- `DELETE /buses/:id` - Supprimer un bus
- `GET /buses/statistics` - Statistiques

#### Conducteurs + Administrateurs
- `PATCH /buses/:id/position` - Mettre à jour position
  - **Restriction**: Conducteurs limités à leur propre bus via `BusOwnershipGuard`

## 👥 Sécurité Spécifique aux Utilisateurs

### Endpoints Publics
- Aucun (tous protégés)

### Endpoints Auto-Accès (utilisateur connecté)
- `GET /users/profile` - Profil personnel
- `PATCH /users/profile` - Modifier profil personnel

### Endpoints Administrateurs uniquement
- `POST /users` - Créer utilisateur
- `GET /users` - Lister utilisateurs
- `GET /users/search` - Rechercher utilisateurs
- `GET /users/stats` - Statistiques utilisateurs
- `PATCH /users/:id` - Modifier utilisateur
- `DELETE /users/:id` - Supprimer utilisateur
- `PATCH /users/:id/verify` - Vérifier utilisateur
- `PATCH /users/:id/role` - Changer rôle
- `POST /users/bulk-create` - Création en masse
- `DELETE /users/bulk-delete` - Suppression en masse

## 🔍 Validation et Contrôles

### 1. Validation JWT
- Vérification de la signature
- Contrôle d'expiration
- Extraction des claims utilisateur

### 2. Contrôles d'Ownership
- Les conducteurs ne peuvent modifier que leur propre bus
- Les utilisateurs ne peuvent voir que leurs propres tickets/paiements

### 3. Validation de Compte
- Comptes non vérifiés limités sur endpoints sensibles
- Exception pour les administrateurs

### 4. Contrôles Métier
- Vérification de l'existence des ressources
- Validation des relations (ex: conducteur ↔ bus)
- Contraintes d'unicité

## 📝 Logging et Auditabilité

### Logs d'Accès
```
[GET] /buses/123 - User: john.doe@example.com (DRIVER) - IP: 192.168.1.1 - 200 - 145ms - Success
[PATCH] /buses/456/position - User: jane.driver@example.com (DRIVER) - 403 - 12ms - Error: Accès interdit
```

### Informations Loggées
- Méthode HTTP et endpoint
- Utilisateur (email, rôle)  
- Adresse IP et User-Agent
- Code de statut et temps de réponse
- Succès ou erreur avec message

## 🛡️ Bonnes Pratiques Implémentées

### 1. Principe du Moindre Privilège
- Chaque rôle a uniquement les permissions nécessaires
- Séparation claire des responsabilités

### 2. Défense en Profondeur
- Guards multiples (auth → rôles → permissions → ownership)
- Validation à plusieurs niveaux

### 3. Logging Complet
- Traçabilité de tous les accès
- Informations contextuelles pour l'audit

### 4. Gestion d'Erreurs Sécurisée
- Messages d'erreur informatifs mais non révélateurs
- Logging des tentatives d'accès non autorisé

## 🔧 Configuration

### Variables d'Environnement
```env
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=24h
```

### Application des Guards
```typescript
// Module level
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: AppGuard, // Guard global
    }
  ]
})

// Controller level
@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@UseInterceptors(AccessLogInterceptor)
export class BusesController {}

// Method level
@UseGuards(BusOwnershipGuard)
@Patch(':id/position')
```

## 🚨 Points d'Attention Sécurité

> **Note**: Ces points ont été récemment corrigés. Voir [SECURITY_CRITICAL_WARNINGS.md](./SECURITY_CRITICAL_WARNINGS.md) pour les détails.

### 1. Token JWT ✅ PARTIELLEMENT CORRIGÉ
- ⚠️ **CRITIQUE**: Les secrets JWT par défaut doivent être changés en production
- ✅ Rate limiting implémenté pour les endpoints d'authentification
- ✅ Refresh token implémenté

### 2. Rate Limiting ✅ CORRIGÉ
- ✅ Rate limiting global implémenté (100 req/15min)
- ✅ Rate limiting strict sur les endpoints d'authentification (5 req/15min)
- ✅ Protection contre les attaques par force brute

### 3. Validation d'Input ✅ IMPLÉMENTÉ
- ✅ Utilisation de `class-validator` pour tous les DTOs
- ✅ Sanitization des données entrantes via ValidationPipe
- ✅ Whitelist activée pour bloquer les propriétés non déclarées

### 4. HTTPS ⚠️ À CONFIGURER EN PRODUCTION
- Obligatoire en production
- Toutes les communications doivent être chiffrées

### 5. Security Headers ✅ CORRIGÉ
- ✅ Helmet configuré avec Content Security Policy
- ✅ Protection contre XSS, clickjacking, MIME-sniffing
- ✅ Headers de sécurité appliqués globalement

### 6. Timing Attacks ✅ CORRIGÉ
- ✅ Utilisation de `crypto.timingSafeEqual()` pour la validation de hash PayDunya
- ✅ Protection contre les attaques temporelles sur la validation des paiements

### 7. Data Exposure ✅ CORRIGÉ
- ✅ Suppression des console.log/error exposant des données sensibles
- ✅ Utilisation du Logger NestJS pour tous les logs
- ✅ Pas de fuite de hash ou tokens dans les logs

## 🔄 Évolutions Futures

### 1. Permissions Dynamiques
- Système de permissions basé sur la base de données
- Interface admin pour gérer les permissions

### 2. Audit Trail Complet
- Stockage des logs en base de données
- Interface de consultation des logs

### 3. Authentification Multi-Facteur
- Pour les comptes administrateurs
- SMS ou application authenticator

### 4. Session Management
- Gestion des sessions actives
- Révocation de tokens en cas de compromission

## 📚 Références

- [NestJS Security](https://docs.nestjs.com/security/authentication)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)