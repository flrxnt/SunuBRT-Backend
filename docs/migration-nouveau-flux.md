# Migration vers le nouveau flux d'achat de tickets

## Vue d'ensemble

Ce document décrit les changements nécessaires pour migrer de l'ancien système de création de tickets vers le nouveau flux avec paiement obligatoire.

## Changements dans la base de données

### Tables modifiées

#### Table `tickets`
- ✅ Le champ `pricingId` existe déjà et devient optionnel/recommandé
- ✅ La relation avec `payments` via `ticketId` existe déjà
- ✅ Le statut `PENDING` existe déjà pour les tickets non payés

#### Table `payments`
- ✅ La relation avec `tickets` existe déjà
- ✅ Les champs nécessaires pour les fournisseurs de paiement existent

#### Table `ticket_pricing`
- ✅ Toutes les colonnes nécessaires existent déjà
- ✅ Les relations avec `lines` et `routes` sont en place

### Aucune migration de base de données requise
Le schéma Prisma existant supporte déjà le nouveau flux.

## Changements dans le code

### Nouveaux fichiers créés

1. **`src/tickets/dto/purchase-ticket.dto.ts`**
   - DTOs pour le nouveau flux d'achat
   - Types pour les réponses d'achat
   - Validation des données d'entrée

2. **`docs/flux-achat-tickets.md`**
   - Documentation du nouveau flux
   - Diagramme des étapes
   - Gestion des erreurs

3. **`docs/api-guide-achat-tickets.md`**
   - Guide complet d'utilisation
   - Exemples de code
   - Intégrations frontend

### Fichiers modifiés

#### `src/tickets/dto/create-ticket.dto.ts`
```diff
- tripId: number;           // Supprimé
- validUntil?: string;      // Supprimé
+ paymentId: number;        // Nouveau: ID du paiement confirmé
```

#### `src/tickets/tickets.service.ts`
- ➕ Nouvelle méthode `getAvailablePricing()`
- ➕ Nouvelle méthode `initiateTicketPurchase()`
- 🔄 Méthode `create()` modifiée pour accepter un `paymentId`
- ➕ Import de `PaymentsService`

#### `src/tickets/tickets.controller.ts`
- ➕ Route `GET /api/v1/tickets/pricing/:tripId`
- ➕ Route `POST /api/v1/tickets/purchase`
- 🔄 Route `POST /api/v1/tickets` modifiée

#### `src/tickets/tickets.module.ts`
- ➕ Import de `PaymentsModule`

## Plan de migration

### Phase 1: Déploiement avec rétrocompatibilité (Semaine 1)

1. **Déployer les nouveaux endpoints**
   ```bash
   # Déployer la nouvelle version
   git checkout feature/nouveau-flux-paiement
   npm run build
   npm run deploy:staging
   ```

2. **Tester les nouveaux endpoints**
   - Tester `GET /pricing/:tripId`
   - Tester `POST /purchase`
   - Tester `POST /tickets` avec `paymentId`

3. **Maintenir l'ancien endpoint temporairement**
   - L'ancien `POST /tickets` avec `tripId` reste fonctionnel
   - Ajouter des warnings dans les logs

### Phase 2: Migration des clients (Semaines 2-3)

1. **Mobile App**
   ```javascript
   // Ancien code
   const ticket = await createTicket({
     tripId: 1,
     seatNumber: "A15",
     passengers: 1
   });

   // Nouveau code
   const pricings = await getPricing(1, 1);
   const purchase = await initiatePurchase({
     tripId: 1,
     pricingId: pricings[0].id,
     seatNumber: "A15",
     passengers: 1
   });
   // Redirection vers payment
   // Puis création du ticket après paiement
   ```

2. **Web App**
   - Implémenter le nouveau flux UI
   - Ajouter la sélection de tarification
   - Intégrer les fournisseurs de paiement

3. **API Partners**
   - Notifier les partenaires du changement
   - Fournir la nouvelle documentation
   - Support pour la migration

### Phase 3: Suppression de l'ancien système (Semaine 4)

1. **Désactiver l'ancien endpoint**
   ```typescript
   @Post()
   @Deprecated('Utilisez POST /purchase puis POST /tickets avec paymentId')
   async createOld(@Body() dto: CreateTicketDto) {
     throw new BadRequestException(
       'Endpoint obsolète. Utilisez le nouveau flux avec paiement.'
     );
   }
   ```

2. **Nettoyer le code**
   - Supprimer l'ancienne logique
   - Nettoyer les DTOs obsolètes
   - Mettre à jour les tests

## Impacts sur les systèmes existants

### Applications mobiles
- **Impact**: Moyen
- **Action**: Mise à jour requise pour supporter le nouveau flux
- **Timeline**: 2-3 semaines

### Dashboard admin
- **Impact**: Faible
- **Action**: Ajout des vues pour les nouvelles tarifications
- **Timeline**: 1 semaine

### APIs externes
- **Impact**: Élevé
- **Action**: Mise à jour obligatoire des intégrations
- **Timeline**: 2-4 semaines selon les partenaires

### Système de validation (conducteurs)
- **Impact**: Aucun
- **Action**: Aucune - utilise déjà les QR codes
- **Timeline**: N/A

## Tests de validation

### Tests automatisés
```bash
# Tests unitaires
npm run test src/tickets

# Tests d'intégration
npm run test:e2e tickets

# Tests de charge
npm run test:load purchase-flow
```

### Tests manuels
1. **Flux complet d'achat**
   - Sélection d'un voyage
   - Consultation des tarifications
   - Initiation du paiement
   - Paiement réussi
   - Création du ticket
   - Validation du ticket

2. **Gestion des erreurs**
   - Paiement échoué
   - Timeout de paiement
   - Voyage complet
   - Tarification invalide

3. **Performance**
   - Temps de réponse < 200ms pour les tarifications
   - Temps de réponse < 500ms pour l'initiation d'achat
   - Support de 100 achats simultanés

## Métriques de suivi

### KPIs techniques
- Taux de succès des paiements: > 95%
- Temps de réponse API: < 500ms (p95)
- Disponibilité: > 99.9%

### KPIs business
- Taux de conversion (initiation → paiement): cible > 80%
- Revenus par ticket: mesure de l'efficacité tarifaire
- Satisfaction utilisateur: enquêtes post-achat

### Alertes à configurer
```yaml
# Exemple de configuration d'alertes
alerts:
  - name: "Échec de paiement élevé"
    condition: "payment_failure_rate > 10%"
    channel: "#ops-alerts"
  
  - name: "Latence API élevée"
    condition: "api_latency_p95 > 1s"
    channel: "#dev-alerts"
  
  - name: "Revenus en baisse"
    condition: "daily_revenue < previous_week * 0.8"
    channel: "#business-alerts"
```

## Rollback plan

En cas de problème critique:

1. **Rollback immédiat** (< 5 minutes)
   ```bash
   # Revenir à la version précédente
   kubectl rollout undo deployment/sunubrt-backend
   ```

2. **Réactivation de l'ancien flux** (< 10 minutes)
   ```typescript
   // Flag de feature
   if (process.env.ENABLE_OLD_TICKET_FLOW === 'true') {
     return this.createTicketOldWay(dto, userId);
   }
   ```

3. **Communication**
   - Notifier les équipes techniques
   - Informer les utilisateurs si nécessaire
   - Planifier la correction

## Support et formation

### Formation des équipes
- **Développeurs**: Session sur le nouveau code (2h)
- **Support client**: Formation sur le nouveau flux (1h)
- **Ops**: Procédures de monitoring et troubleshooting (1h)

### Documentation mise à jour
- API documentation (Swagger)
- Guide utilisateur mobile
- Procédures de support
- Runbooks pour les ops

## Checklist de déploiement

### Pré-déploiement
- [ ] Tests automatisés passent
- [ ] Tests manuels validés
- [ ] Documentation mise à jour
- [ ] Équipes formées
- [ ] Monitoring configuré

### Déploiement
- [ ] Déploiement en staging validé
- [ ] Tests de fumée OK
- [ ] Déploiement en production
- [ ] Vérification post-déploiement

### Post-déploiement
- [ ] Métriques surveillées
- [ ] Retours utilisateurs collectés
- [ ] Performance validée
- [ ] Plan de décommissionnement de l'ancien système activé

## Contact

Pour questions ou support durant la migration:

- **Lead technique**: @dev-team
- **Product Owner**: @product-team  
- **DevOps**: @ops-team
- **Support**: @support-team

---

**Date de création**: 2024-01-20  
**Dernière mise à jour**: 2024-01-20  
**Version**: 1.0  
**Statut**: ✅ Prêt pour déploiement