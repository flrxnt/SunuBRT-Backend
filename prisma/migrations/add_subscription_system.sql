-- Migration pour le système d'abonnements et de tickets réutilisables
-- À exécuter après la modification du schema.prisma

-- 1. Ajouter les nouveaux enums
ALTER TABLE tickets MODIFY COLUMN status ENUM('PENDING', 'PAID', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED') DEFAULT 'PENDING';

-- 2. Ajouter les nouvelles colonnes au modèle Ticket
ALTER TABLE tickets
ADD COLUMN ticketType ENUM('SINGLE_USE', 'DAILY_PASS', 'WEEKLY_PASS', 'MONTHLY_PASS', 'ANNUAL_PASS') DEFAULT 'SINGLE_USE' AFTER userId,
ADD COLUMN validFrom DATETIME DEFAULT CURRENT_TIMESTAMP AFTER purchaseDate,
ADD COLUMN maxUsages INT NULL AFTER validUntil,
ADD COLUMN currentUsages INT DEFAULT 0 AFTER maxUsages,
ADD COLUMN isReusable BOOLEAN DEFAULT FALSE AFTER currentUsages;

-- 3. Modifier la colonne tripId pour la rendre optionnelle (déjà nullable dans le schema)
ALTER TABLE tickets MODIFY COLUMN tripId INT NULL;

-- 4. Créer la table TicketUsage
CREATE TABLE IF NOT EXISTS ticket_usages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticketId INT NOT NULL,
    tripId INT NULL,
    routeId INT NULL,
    busId VARCHAR(191) NULL,
    usedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    validatorId VARCHAR(191) NULL,
    latitude DOUBLE NULL,
    longitude DOUBLE NULL,
    notes TEXT NULL,

    INDEX idx_ticket_usages_ticketId (ticketId),
    INDEX idx_ticket_usages_tripId (tripId),
    INDEX idx_ticket_usages_routeId (routeId),
    INDEX idx_ticket_usages_busId (busId),
    INDEX idx_ticket_usages_validatorId (validatorId),
    INDEX idx_ticket_usages_usedAt (usedAt),

    CONSTRAINT fk_ticket_usages_ticket
        FOREIGN KEY (ticketId) REFERENCES tickets(id) ON DELETE CASCADE,
    CONSTRAINT fk_ticket_usages_trip
        FOREIGN KEY (tripId) REFERENCES trips(id) ON DELETE SET NULL,
    CONSTRAINT fk_ticket_usages_route
        FOREIGN KEY (routeId) REFERENCES routes(id) ON DELETE SET NULL,
    CONSTRAINT fk_ticket_usages_bus
        FOREIGN KEY (busId) REFERENCES buses(id) ON DELETE SET NULL,
    CONSTRAINT fk_ticket_usages_validator
        FOREIGN KEY (validatorId) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Ajouter les nouvelles colonnes au modèle TicketPricing
ALTER TABLE ticket_pricing
ADD COLUMN ticketType ENUM('SINGLE_USE', 'DAILY_PASS', 'WEEKLY_PASS', 'MONTHLY_PASS', 'ANNUAL_PASS') DEFAULT 'SINGLE_USE' AFTER type,
ADD COLUMN maxUsages INT NULL AFTER validityPeriodType,
ADD COLUMN isReusable BOOLEAN DEFAULT FALSE AFTER maxUsages,
ADD COLUMN usageRules JSON DEFAULT '{}' AFTER specialConditions;

-- 6. Migrer les tickets existants
UPDATE tickets
SET ticketType = 'SINGLE_USE',
    isReusable = FALSE,
    currentUsages = CASE
        WHEN status = 'USED' THEN 1
        ELSE 0
    END,
    validFrom = purchaseDate
WHERE ticketType IS NULL OR ticketType = '';

-- 7. Créer les enregistrements d'usage pour les tickets déjà utilisés
INSERT INTO ticket_usages (ticketId, tripId, usedAt, notes)
SELECT
    id,
    tripId,
    COALESCE(usedAt, purchaseDate),
    'Migration depuis ancien système'
FROM tickets
WHERE status = 'USED'
    AND id NOT IN (SELECT DISTINCT ticketId FROM ticket_usages WHERE ticketId IS NOT NULL);

-- 8. Mettre à jour les statuts des tickets
UPDATE tickets
SET status = CASE
    WHEN status = 'USED' AND isReusable = FALSE THEN 'USED'
    WHEN status = 'USED' AND isReusable = TRUE THEN 'ACTIVE'
    WHEN status = 'PAID' THEN 'PAID'
    ELSE status
END;

-- 9. Ajouter des index pour optimiser les performances
CREATE INDEX idx_tickets_ticketType ON tickets(ticketType);
CREATE INDEX idx_tickets_status_validUntil ON tickets(status, validUntil);
CREATE INDEX idx_tickets_userId_status ON tickets(userId, status);
CREATE INDEX idx_tickets_isReusable ON tickets(isReusable);
CREATE INDEX idx_tickets_validFrom_validUntil ON tickets(validFrom, validUntil);
CREATE INDEX idx_tickets_currentUsages_maxUsages ON tickets(currentUsages, maxUsages);

-- 10. Mettre à jour les tarifications existantes
UPDATE ticket_pricing
SET ticketType = 'SINGLE_USE',
    isReusable = FALSE
WHERE ticketType IS NULL;

-- 11. Créer des tarifications d'exemple pour les abonnements
INSERT IGNORE INTO ticket_pricing (
    name,
    type,
    ticketType,
    price,
    validityDuration,
    validityPeriodType,
    maxUsages,
    isReusable,
    description,
    isActive,
    usageRules
) VALUES
(
    'Pass Journalier Standard',
    'STANDARD',
    'DAILY_PASS',
    2000,
    24,
    'HOURS',
    NULL,
    TRUE,
    'Accès illimité pendant 24 heures sur toutes les lignes',
    TRUE,
    '{"maxUsagesPerDay": null, "allowedLines": "all"}'
),
(
    'Abonnement Mensuel Standard',
    'STANDARD',
    'MONTHLY_PASS',
    15000,
    30,
    'DAYS',
    60,
    TRUE,
    'Abonnement mensuel avec 60 voyages maximum',
    TRUE,
    '{"maxUsagesPerDay": 4, "allowedLines": "all"}'
),
(
    'Abonnement Mensuel Étudiant',
    'STUDENT',
    'MONTHLY_PASS',
    10000,
    30,
    'DAYS',
    60,
    TRUE,
    'Abonnement mensuel étudiant avec réduction 33%',
    TRUE,
    '{"maxUsagesPerDay": 4, "allowedLines": "all", "requiresStudentCard": true}'
),
(
    'Pass Hebdomadaire Premium',
    'PREMIUM',
    'WEEKLY_PASS',
    5000,
    7,
    'DAYS',
    NULL,
    TRUE,
    'Accès illimité pendant 7 jours avec avantages premium',
    TRUE,
    '{"maxUsagesPerDay": null, "priorityBoarding": true, "allowedLines": "all"}'
),
(
    'Abonnement Annuel Premium',
    'PREMIUM',
    'ANNUAL_PASS',
    150000,
    365,
    'DAYS',
    NULL,
    TRUE,
    'Abonnement annuel avec accès illimité et avantages premium',
    TRUE,
    '{"maxUsagesPerDay": null, "priorityBoarding": true, "allowedLines": "all", "discountPercentage": 20}'
);

-- 12. Supprimer l'ancienne colonne usedAt si elle n'est plus utilisée
-- ALTER TABLE tickets DROP COLUMN usedAt;

-- 13. Nettoyer les données incohérentes
DELETE FROM ticket_usages WHERE ticketId NOT IN (SELECT id FROM tickets);
DELETE FROM ticket_usages WHERE tripId IS NOT NULL AND tripId NOT IN (SELECT id FROM trips);
DELETE FROM ticket_usages WHERE routeId IS NOT NULL AND routeId NOT IN (SELECT id FROM routes);
DELETE FROM ticket_usages WHERE busId IS NOT NULL AND busId NOT IN (SELECT id FROM buses);
DELETE FROM ticket_usages WHERE validatorId IS NOT NULL AND validatorId NOT IN (SELECT id FROM users);

-- 14. Ajouter des contraintes de validation
ALTER TABLE tickets ADD CONSTRAINT chk_tickets_usages
    CHECK (currentUsages >= 0 AND (maxUsages IS NULL OR currentUsages <= maxUsages));

ALTER TABLE tickets ADD CONSTRAINT chk_tickets_validity_dates
    CHECK (validFrom <= COALESCE(validUntil, '2099-12-31'));

ALTER TABLE ticket_pricing ADD CONSTRAINT chk_pricing_usages
    CHECK (maxUsages IS NULL OR maxUsages > 0);

-- 15. Message de fin
SELECT 'Migration du système d\'abonnements terminée avec succès!' as message;
