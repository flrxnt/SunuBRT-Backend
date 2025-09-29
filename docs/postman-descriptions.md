# Descriptions Postman des endpoints SunuBRT

Ce document fournit des descriptions pretes a coller dans Postman pour l'ensemble des routes exposees par le backend NestJS (dossier `src/`). Chaque ligne resume le but de l'endpoint, le type d'authentification requis et les principaux parametres a renseigner.

## Conventions
- **Auth** indique le type de jeton attendu. `Bearer (Admin)` signifie que l'utilisateur connecte doit disposer d'un jeton Bearer avec le role ou la permission requis. `Public` signifie qu'aucun jeton n'est necessaire.
- **Parametres cles** mentionne les path params, query params et/ou le corps JSON attendu (DTOs Nest).
- Les codes reponses listes refletent les cas principaux observes dans les controleurs.
- Les lignes marquees "fonctionnalite non implementee" signalent un endpoint prevu mais encore incomplet cote service.

## App

| Methode | Chemin | Description Postman | Auth | Parametres cles |
| --- | --- | --- | --- | --- |
| GET | / | Renvoie le message "Hello World!" pour verifier rapidement que l'API repond. Codes: 200. | Public | Aucun |

## Auth

> Tous les endpoints sont publics sauf indication contraire.

| Methode | Chemin | Description Postman | Auth | Parametres cles |
| --- | --- | --- | --- | --- |
| POST | /auth/register | Cree un nouvel utilisateur et peut envoyer un email de verification. Codes: 201, 400, 409. | Public | Corps JSON `RegisterDto` (prenom, nom, email, telephone, motDePasse, role optionnel). |
| POST | /auth/login | Authentifie un utilisateur via email/mot de passe et retourne access/refresh tokens. Codes: 200, 400, 401. | Public | Corps JSON `LoginDto` (email, password). |
| POST | /auth/refresh | Rafraichit un access token a partir d'un refresh token valide. Codes: 200, 400, 401. | Public | Corps JSON `RefreshTokenDto` (refreshToken). |
| POST | /auth/forgot-password | Declenche l'envoi d'un email de reinitialisation de mot de passe. Codes: 200, 400. | Public | Corps JSON `ForgotPasswordDto` (email). |
| POST | /auth/reset-password | Reinitialise le mot de passe avec un token valide. Codes: 200, 400. | Public | Corps JSON `ResetPasswordDto` (token, newPassword, confirmation). |
| POST | /auth/change-password | Change le mot de passe de l'utilisateur connecte apres verification de l'ancien mot de passe. Codes: 200, 400, 401. | Bearer | Corps JSON `ChangePasswordDto` (currentPassword, newPassword, confirmation). |
| POST | /auth/logout | Revoque le refresh token fourni et invalide la session. Codes: 200, 400, 401. | Bearer | Corps JSON `{ "refreshToken": string }`. |
| GET | /auth/verify-email/:token | Valide une adresse email a partir du jeton envoye par mail. Codes: 200, 400. | Public | Path `token`. |
| POST | /auth/resend-verification | Renvoie le lien de verification pour l'email donne. Codes: 200, 400, 404. | Public | Corps JSON `{ "email": string }`. |
| GET | /auth/profile | Renvoie le profil de l'utilisateur authentifie. Codes: 200, 401. | Bearer | Aucun. |
| GET | /auth/validate | Permet de verifier qu'un access token est encore valide. Codes: 200, 401. | Bearer | Aucun. |
| POST | /auth/revoke-all-tokens | Revoque tous les refresh tokens du compte courant. Codes: 200, 401. | Bearer | Aucun. |

## Buses

> Le controleur est protege par AuthGuard, RolesGuard et PermissionsGuard. Les lignes marquees `Public` sont accessibles sans jeton.

| Methode | Chemin | Description Postman | Auth | Parametres cles |
| --- | --- | --- | --- | --- |
| POST | /buses | Cree un bus avec ses caracteristiques. Codes: 201, 400, 403, 409. | Bearer (Admin + gestion bus) | Corps JSON `CreateBusDto`. |
| GET | /buses | Liste les bus avec filtrage optionnel par ligne et statut. Codes: 200. | Public | Query `lineId`, `isActive`. |
| GET | /buses/statistics | Fournit des statistiques agregees sur les bus. Codes: 200, 403. | Bearer (Admin) | Aucun. |
| GET | /buses/line/:lineId | Liste les bus actifs d'une ligne donnee. Codes: 200, 404. | Public | Path `lineId` (entier). |
| GET | /buses/:id | Renvoie le detail complet d'un bus. Codes: 200, 404. | Public | Path `id`. |
| PATCH | /buses/:id/position | Met a jour la position GPS d'un bus en temps reel. Codes: 200, 400, 403, 404. | Bearer (Driver ou Admin) | Path `id`, corps JSON `UpdatePositionDto`. |
| PATCH | /buses/:id | Met a jour les informations d'un bus. Codes: 200, 400, 403, 404, 409. | Bearer (Admin + gestion bus) | Path `id`, corps JSON `UpdateBusDto`. |
| DELETE | /buses/:id | Supprime un bus sans trajets actifs. Codes: 200, 400, 403, 404. | Bearer (Admin + gestion bus) | Path `id`. |

## Lines

> Meme gardes que pour les bus. Les endpoints explicitement `Public` ne necessitent pas de jeton.

| Methode | Chemin | Description Postman | Auth | Parametres cles |
| --- | --- | --- | --- | --- |
| POST | /lines | Cree une ligne de transport. Codes: 201, 400, 403, 409. | Bearer (Admin + creation ligne) | Corps JSON `CreateLineDto`. |
| GET | /lines | Liste les lignes avec options (bus, routes, stats). Codes: 200. | Public | Query `isActive`, `withBuses`, `withRoutes`, `withStats`. |
| GET | /lines/statistics | Renvoie les statistiques des lignes. Codes: 200, 403. | Bearer (Admin + lecture stats) | Aucun. |
| GET | /lines/search | Recherche une ligne par mot cle. Codes: 200, 400. | Public | Query `q`. |
| GET | /lines/number/:number | Recupere une ligne par numero. Codes: 200, 404. | Public | Path `number`. |
| GET | /lines/:id | Detail d'une ligne (avec stats selon options). Codes: 200, 404. | Public | Path `id` (entier). |
| PATCH | /lines/:id | Met a jour une ligne. Codes: 200, 400, 403, 404, 409. | Bearer (Admin + mise a jour ligne) | Path `id`, corps JSON `UpdateLineDto`. |
| PATCH | /lines/:id/toggle-active | Active ou desactive une ligne. Codes: 200, 403, 404. | Bearer (Admin + mise a jour ligne) | Path `id`. |
| DELETE | /lines/:id | Supprime une ligne sans bus ni routes assignes. Codes: 200, 400, 403, 404. | Bearer (Admin + suppression ligne) | Path `id`. |

## Routes

| Methode | Chemin | Description Postman | Auth | Parametres cles |
| --- | --- | --- | --- | --- |
| POST | /routes | Cree une route en associant des points GPS. Codes: 201, 400, 403, 404. | Bearer (Admin + creation route) | Corps JSON `CreateRouteDto`. |
| GET | /routes | Liste les routes avec filtres (ligne, statut, stats, trajets). Codes: 200. | Public | Query `lineId`, `isActive`, `withTrips`, `withStats`. |
| GET | /routes/statistics | Renvoie les stats globales des routes. Codes: 200, 403. | Bearer (Admin + lecture stats) | Aucun. |
| GET | /routes/search | Recherche des routes par nom, description ou ligne. Codes: 200, 400. | Public | Query `q`. |
| GET | /routes/nearby | Renvoie les routes proches d'une position GPS. Codes: 200, 400. | Public | Query `lat`, `lng`, `radius` (optionnel). |
| GET | /routes/line/:lineId | Liste les routes d'une ligne. Codes: 200, 404. | Public | Path `lineId`. |
| GET | /routes/:id | Detail d'une route (avec stats). Codes: 200, 404. | Public | Path `id`. |
| PATCH | /routes/:id | Met a jour une route. Codes: 200, 400, 403, 404. | Bearer (Admin + mise a jour route) | Path `id`, corps JSON `UpdateRouteDto`. |
| PATCH | /routes/:id/toggle-active | Active ou desactive une route. Codes: 200, 403, 404. | Bearer (Admin + mise a jour route) | Path `id`. |
| DELETE | /routes/:id | Supprime une route sans trajets actifs. Codes: 200, 400, 403, 404. | Bearer (Admin + suppression route) | Path `id`. |

## Trips

| Methode | Chemin | Description Postman | Auth | Parametres cles |
| --- | --- | --- | --- | --- |
| POST | /trips | Cree un trajet avec horaires, bus et tarification. Codes: 201, 400, 403, 404, 409. | Bearer (Admin + creation trip) | Corps JSON `CreateTripDto`. |
| GET | /trips | Liste les trajets avec nombreux filtres (route, bus, dates, statut, stats). Codes: 200. | Public | Query `routeId`, `busId`, `status`, `dateFrom`, `dateTo`, `lineId`, `withStats`. |
| GET | /trips/statistics | Fournit les statistiques d'exploitation des trajets. Codes: 200, 403. | Bearer (Admin + lecture stats) | Aucun. |
| GET | /trips/search | Recherche des trajets par mot cle (bus, route, ligne). Codes: 200, 400. | Public | Query `q`. |
| GET | /trips/route/:routeId | Liste les trajets a venir d'une route. Codes: 200, 404. | Public | Path `routeId`. |
| GET | /trips/bus/:busId | Historique des trajets d'un bus. Codes: 200, 404. | Bearer (Driver ou Admin + lecture trip) | Path `busId`. |
| GET | /trips/:id | Detail complet d'un trajet avec statistiques et tickets. Codes: 200, 404. | Public | Path `id`. |
| PATCH | /trips/:id | Met a jour un trajet. Codes: 200, 400, 403, 404. | Bearer (Admin + mise a jour trip) | Path `id`, corps JSON `UpdateTripDto`. |
| PATCH | /trips/:id/status | Change le statut d'un trajet (ex: SCHEDULED -> IN_PROGRESS). Codes: 200, 400, 403, 404. | Bearer (Driver ou Admin + mise a jour trip) | Path `id`, query `status` (enum `TripStatus`). |
| DELETE | /trips/:id | Supprime un trajet sans tickets vendus. Codes: 200, 400, 403, 404. | Bearer (Admin + suppression trip) | Path `id`. |

## Payments

> Les endpoints sont proteges par AuthGuard et RolesGuard. Les callbacks PayDunya sont publics.

| Methode | Chemin | Description Postman | Auth | Parametres cles |
| --- | --- | --- | --- | --- |
| POST | /payments | Cree un paiement lie a un ticket existant et renvoie l'URL de redirection. Codes: 201, 400, 404, 409. | Bearer | Corps JSON `CreatePaymentDto`. |
| POST | /payments/ticket | Initie le paiement pour generer automatiquement un ticket apres validation. Codes: 201, 400, 404, 409, 500. | Bearer | Corps JSON `CreateTicketPaymentDto`. |
| GET | /payments/my-payments | Liste paginee des paiements de l'utilisateur (filtrage statut, fournisseur). Codes: 200. | Bearer | Query `status`, `provider`, `limit`, `offset`. |
| GET | /payments/:id/status | Consulte le statut courant d'un paiement (verifie aussi le fournisseur). Codes: 200, 404. | Bearer | Path `id`. |
| GET | /payments/:id | Detail d'un paiement (acces limite au proprietaire, illimite pour admin). Codes: 200, 403, 404. | Bearer | Path `id`. |
| PATCH | /payments/:id/cancel | Annule un paiement en attente en fournissant une raison. Codes: 200, 400, 404. | Bearer | Path `id`, corps `{ "reason": string }`. |
| POST | /payments/paydunya/callback | Endpoint consomme par PayDunya pour notifier un resultat de paiement. Codes: 200, 400, 404. | Public | Corps JSON `PaydunyaCallbackDto`. |
| POST | /payments/paydunya/webhook | Variante webhook PayDunya (meme traitement que callback). Codes: 200. | Public | Corps JSON `PaydunyaWebhookDto`. |
| POST | /payments/verify | Verifie explicitement un paiement aupres du fournisseur externe. Codes: 200, 400. | Bearer | Corps JSON `VerifyPaymentDto`. |
| GET | /payments/admin/all | Liste paginee de tous les paiements du systeme. Codes: 200. | Bearer (Admin) | Query `status`, `provider`, `userId`, `limit`, `offset`. |
| GET | /payments/admin/statistics | Renvoie les statistiques de paiement (volumes, taux de reussite, revenus). Codes: 200. | Bearer (Admin) | Query `startDate`, `endDate`, `provider`, `paymentMethod`. |
| POST | /payments/admin/:id/refund | Demarre un remboursement pour un paiement. Codes: 200, 400, 404. | Bearer (Admin) | Path `id`, corps JSON `RefundPaymentDto`. |
| GET | /payments/admin/refunds | Liste les remboursements (fonctionnalite non implementee, leve une exception). | Bearer (Admin) | Query `status`, `limit`, `offset`. |
| PATCH | /payments/admin/refunds/:id/complete | Marque un remboursement manuel comme termine (fonctionnalite non implementee). | Bearer (Admin) | Path `id`, corps `{ "notes": string }`. |
| GET | /payments/admin/export | Exporte les paiements en CSV/Excel (fonctionnalite non implementee). | Bearer (Admin) | Query `format`, `startDate`, `endDate`, `status`. |
| GET | /payments/admin/reconciliation | Genere un rapport de reconciliation (fonctionnalite non implementee). | Bearer (Admin) | Query `date`, `provider`. |
| POST | /payments/test/simulate-callback | Simule un callback PayDunya (disponible hors production, fonctionnalite non implementee). | Bearer (Admin) | Corps `{ "paymentId": number, "status": "completed"|"failed"|"cancelled" }`. |

## Tickets

> Controleur protege par AuthGuard et RolesGuard. Les endpoints indiques `Public` ne necessitent pas de jeton. Plusieurs routes admin renvoient encore l'exception "fonctionnalite non implementee".

| Methode | Chemin | Description Postman | Auth | Parametres cles |
| --- | --- | --- | --- | --- |
| GET | /tickets/pricing/:tripId | Donne les tarifications disponibles pour un voyage, adaptees au nombre de passagers. Codes: 200. | Bearer | Path `tripId`, query `passengers` (optionnel). |
| POST | /tickets/purchase | Demarre un achat de ticket avec creation d'un paiement PayDunya. Codes: 201, 400, 404. | Bearer | Corps JSON `InitiateTicketPurchaseDto`. |
| POST | /tickets | Cree un ticket apres confirmation de paiement. Codes: 201, 400, 404. | Bearer | Corps JSON `CreateTicketDto`. |
| GET | /tickets/my-tickets | Liste paginee des tickets de l'utilisateur (filtres statut, expiration). Codes: 200. | Bearer | Query `status`, `includeExpired`, `limit`, `offset`. |
| GET | /tickets/statistics | Statistiques globales des tickets (ventes, revenus). Codes: 200. | Bearer (Admin) | Query `startDate`, `endDate`, `lineId`, `routeId`. |
| GET | /tickets/user-statistics | Statistiques personnelles de l'utilisateur. Codes: 200. | Bearer | Aucun. |
| GET | /tickets/:id | Detail d'un ticket (acces limite au proprietaire sauf admin). Codes: 200, 403, 404. | Bearer | Path `id`. |
| GET | /tickets/:id/qr-code | Genere le QR code du ticket si paye. Codes: 200, 400, 404. | Bearer | Path `id`. |
| POST | /tickets/validate | Valide un ticket scanne (conducteurs ou admins). Codes: 200, 403. | Bearer (Driver ou Admin) | Corps JSON `ValidateTicketDto`. |
| POST | /tickets/scan | Lit les infos d'un ticket via QR sans le valider. Codes: 200. | Bearer (Driver ou Admin) | Corps JSON `ScanTicketDto`. |
| PATCH | /tickets/:id/cancel | Annule un ticket (jusqu'a 2h avant depart). Codes: 200, 400, 404. | Bearer | Path `id`, corps `{ "reason": string }`. |
| DELETE | /tickets/:id | Supprime un ticket (fonctionnalite non implementee). | Bearer (Admin) | Path `id`. |
| POST | /tickets/pricing | Cree une tarification de ticket. Codes: 201, 400, 404. | Bearer (Admin) | Corps JSON `CreateTicketPricingDto`. |
| GET | /tickets/pricing | Liste toutes les tarifications (filtrables). Codes: 200. | Public | Query `type`, `lineId`, `routeId`, `isActive`. |
| GET | /tickets/pricing/:id | Detail d'une tarification (fonctionnalite non implementee). | Public | Path `id`. |
| PATCH | /tickets/pricing/:id | Met a jour une tarification. Codes: 200, 404. | Bearer (Admin) | Path `id`, corps `UpdateTicketPricingDto`. |
| DELETE | /tickets/pricing/:id | Supprime une tarification si elle n'est pas utilisee. Codes: 200, 400, 404. | Bearer (Admin) | Path `id`. |
| PATCH | /tickets/pricing/bulk-update | Met a jour plusieurs tarifications en lot (fonctionnalite non implementee). | Bearer (Admin) | Corps JSON `BulkUpdatePricingDto`. |
| POST | /tickets/pricing/apply-discount | Applique une remise globale (fonctionnalite non implementee). | Bearer (Admin) | Corps JSON `ApplyDiscountDto`. |
| GET | /tickets/admin/all | Liste complete des tickets (fonctionnalite non implementee). | Bearer (Admin) | Query `status`, `userId`, `tripId`, `limit`, `offset`. |
| GET | /tickets/admin/export | Exporte les tickets (fonctionnalite non implementee). | Bearer (Admin) | Query `format`, `startDate`, `endDate`. |
| POST | /tickets/admin/:id/force-validate | Force la validation d'un ticket (fonctionnalite non implementee). | Bearer (Admin) | Path `id`, corps `{ "reason": string }`. |
| GET | /tickets/admin/subscriptions/statistics | Statistiques detaillees sur les abonnements. Codes: 200. | Bearer (Admin) | Query `startDate`, `endDate`. |
| GET | /tickets/admin/usage-analytics | Analytics d'utilisation des tickets et abonnements. Codes: 200. | Bearer (Admin) | Query `period`, `ticketType`. |
| POST | /tickets/subscription | Cree un ticket d'abonnement apres paiement confirme. Codes: 201, 400, 404. | Bearer | Corps JSON `CreateSubscriptionTicketDto`. |
| GET | /tickets/:id/usage-history | Historique des utilisations d'un ticket ou abonnement. Codes: 200, 404. | Bearer | Path `id`. |
| PATCH | /tickets/:id/suspend | Suspend ou reactive un abonnement possede. Codes: 200, 404. | Bearer | Path `id`, corps `{ "reason"?: string }`. |
| PATCH | /tickets/admin/:id/suspend | Suspend ou reactive un abonnement cote admin. Codes: 200, 404. | Bearer (Admin) | Path `id`, corps `{ "reason": string }`. |

## Users

> Tous les endpoints necessitent un jeton Bearer. La plupart sont reserves aux administrateurs, sauf ceux lies au profil du compte courant.

| Methode | Chemin | Description Postman | Auth | Parametres cles |
| --- | --- | --- | --- | --- |
| POST | /users | Cree un utilisateur (admin). Codes: 201, 400, 401, 403. | Bearer (Admin + gestion utilisateurs) | Corps JSON `CreateUserDto`. |
| GET | /users | Liste paginee des utilisateurs avec filtres (recherche, role, verification). Codes: 200. | Bearer (Admin + lecture utilisateurs) | Query `page`, `limit`, `sortBy`, `sortOrder`, `search`, `role`, `isVerified`. |
| GET | /users/search | Recherche rapide par nom/email/telephone. Codes: 200, 401, 403. | Bearer (Admin + lecture utilisateurs) | Query `q`, `limit`. |
| GET | /users/stats | Renvoie les statistiques globales des utilisateurs. Codes: 200, 401, 403. | Bearer (Admin + acces admin) | Aucun. |
| GET | /users/by-role/:role | Liste les utilisateurs d'un role. Codes: 200, 401, 403. | Bearer (Admin + lecture utilisateurs) | Path `role`, query `limit`. |
| GET | /users/profile | Renvoie le profil complet de l'utilisateur connecte. Codes: 200, 401. | Bearer (Proprietaire) | Aucun. |
| GET | /users/:id | Recupere un utilisateur par UUID. Codes: 200, 404. | Bearer (Admin + lecture utilisateurs) | Path `id`. |
| PATCH | /users/profile | Met a jour le profil du compte courant. Codes: 200, 400, 401. | Bearer (Proprietaire) | Corps JSON `UpdateProfileDto`. |
| PATCH | /users/:id | Met a jour un utilisateur (admin). Codes: 200, 400, 401, 403. | Bearer (Admin + gestion utilisateurs) | Path `id`, corps `UpdateUserDto`. |
| PATCH | /users/:id/verify | Marque un utilisateur comme verifie. Codes: 200, 400. | Bearer (Admin + gestion utilisateurs) | Path `id`. |
| PATCH | /users/:id/unverify | Retire la verification d'un utilisateur. Codes: 200, 400. | Bearer (Admin + gestion utilisateurs) | Path `id`. |
| PATCH | /users/:id/role | Change le role d'un utilisateur. Codes: 200, 400. | Bearer (Admin + gestion utilisateurs) | Path `id`, corps `{ "role": Role }`. |
| DELETE | /users/:id | Supprime un utilisateur si aucune contrainte bloquante. Codes: 200, 400. | Bearer (Admin + gestion utilisateurs) | Path `id`. |
| GET | /users/:id/exists | Indique si un utilisateur existe. Codes: 200. | Bearer (Admin + lecture utilisateurs) | Path `id`. |
| POST | /users/bulk-create | Creation en masse d'utilisateurs. Codes: 201, 400. | Bearer (Admin + gestion utilisateurs) | Corps `{ "users": CreateUserDto[] }`. |
| DELETE | /users/bulk-delete | Suppression en masse d'utilisateurs. Codes: 200, 400. | Bearer (Admin + gestion utilisateurs) | Corps `{ "userIds": string[] }`. |

## Tracking (temps reel)

> Controleur protege par AuthGuard. Les routes publiques sont prevues pour les clients qui suivent les bus. Certaines fonctionnalites sont encore en cours d'implementation.

| Methode | Chemin | Description Postman | Auth | Parametres cles |
| --- | --- | --- | --- | --- |
| GET | /tracking/lines/:lineId/buses | Renvoie les positions actuelles des bus actifs d'une ligne. Codes: 200, 404. | Public | Path `lineId`. |
| GET | /tracking/buses/:busId/position | Position GPS courante d'un bus (fonctionnalite non implementee). Codes: 200, 404. | Public | Path `busId`. |
| GET | /tracking/buses/:busId/history | Historique des positions GPS d'un bus avec filtres. Codes: 200. | Public | Path `busId`, query `startDate`, `endDate`, `limit`. |
| GET | /tracking/statistics | Statistiques generales du systeme de tracking (bus actifs, couverture). Codes: 200. | Public | Query `lineId` (optionnel). |
| GET | /tracking/alerts | Liste des alertes trafic/incident en cours avec filtres. Codes: 200. | Public | Query `lineId`, `busId`, `severity`. |
| POST | /tracking/buses/:busId/position | Met a jour la position GPS d'un bus (conducteur ou admin). Codes: 200, 403, 404. | Bearer (Driver ou Admin) | Path `busId`, corps `BusPositionUpdate`. |
| POST | /tracking/buses/:busId/status | Met a jour le statut d'un bus (passagers, retard, etc.). Codes: 200. | Bearer (Driver ou Admin) | Path `busId`, corps `BusStatusUpdate`. |
| POST | /tracking/alerts | Cree une alerte trafic diffusee via WebSocket. Codes: 201. | Bearer (Admin) | Corps JSON `TrafficAlert`. |
| GET | /tracking/admin/websocket-stats | Statistiques detaillees sur les connexions WebSocket. Codes: 200. | Bearer (Admin) | Aucun. |
| POST | /tracking/admin/refresh-positions | Force l'actualisation des positions de tous les bus actifs. Codes: 200. | Bearer (Admin) | Aucun. |
| GET | /tracking/admin/system-health | Retourne un bilan de sante du systeme de tracking (verification basique). Codes: 200. | Bearer (Admin) | Aucun. |
