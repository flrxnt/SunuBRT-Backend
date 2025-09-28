-- Migration: Update Payment and Ticket relationship for new flow
-- Date: 2024-12-20
-- Description: Make ticketId optional in payments table and remove passengers from tickets

BEGIN;

-- Create migration log table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_logs (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Log the start of migration
INSERT INTO migration_logs (migration_name, action, details, created_at)
VALUES (
    '20241220_payment_ticket_flow_update',
    'MIGRATION_STARTED',
    json_build_object(
        'description', 'Update Payment and Ticket relationship for new flow',
        'changes', json_build_array(
            'Make ticketId optional in payments',
            'Remove passengers field from tickets',
            'Update foreign key constraints'
        )
    ),
    NOW()
);

-- Create backup tables for safety
CREATE TABLE payments_backup_20241220 AS
SELECT * FROM payments;

CREATE TABLE tickets_backup_20241220 AS
SELECT * FROM tickets;

-- Log backup creation
INSERT INTO migration_logs (migration_name, action, details, created_at)
VALUES (
    '20241220_payment_ticket_flow_update',
    'BACKUP_CREATED',
    json_build_object(
        'payments_backup', 'payments_backup_20241220',
        'tickets_backup', 'tickets_backup_20241220',
        'payments_count', (SELECT COUNT(*) FROM payments),
        'tickets_count', (SELECT COUNT(*) FROM tickets)
    ),
    NOW()
);

-- Step 1: Drop foreign key constraint from payments to tickets
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_ticketid_fkey;

-- Step 2: Drop unique constraint on ticketId in payments
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_ticketid_key;

-- Step 3: Make ticketId nullable in payments table
ALTER TABLE payments ALTER COLUMN "ticketId" DROP NOT NULL;

-- Step 4: Add back the unique constraint but allow nulls
-- Note: In PostgreSQL, unique constraints allow multiple NULL values
CREATE UNIQUE INDEX payments_ticketid_unique
ON payments ("ticketId")
WHERE "ticketId" IS NOT NULL;

-- Step 5: Add back the foreign key constraint
ALTER TABLE payments ADD CONSTRAINT payments_ticketid_fkey
FOREIGN KEY ("ticketId") REFERENCES tickets(id) ON DELETE SET NULL;

-- Step 6: Remove passengers column from tickets if it exists
-- First, check if there are tickets with multiple passengers and log them
INSERT INTO migration_logs (migration_name, action, details, created_at)
SELECT
    '20241220_payment_ticket_flow_update' as migration_name,
    'MULTI_PASSENGER_TICKETS_FOUND' as action,
    json_build_object(
        'ticket_id', id,
        'passengers', passengers,
        'user_id', "userId",
        'trip_id', "tripId",
        'status', status,
        'purchase_date', "purchaseDate"
    ) as details,
    NOW() as created_at
FROM tickets
WHERE passengers IS NOT NULL AND passengers > 1;

-- Remove the passengers column
ALTER TABLE tickets DROP COLUMN IF EXISTS passengers;

-- Step 7: Update any existing payments without tickets to have proper customData
-- This ensures backward compatibility
UPDATE payments
SET "customData" = COALESCE("customData", '{}')
WHERE "customData" IS NULL;

-- Log completion of schema changes
INSERT INTO migration_logs (migration_name, action, details, created_at)
VALUES (
    '20241220_payment_ticket_flow_update',
    'SCHEMA_UPDATED',
    json_build_object(
        'ticketId_made_optional', true,
        'passengers_column_removed', true,
        'foreign_key_constraints_updated', true,
        'customData_defaults_set', true
    ),
    NOW()
);

-- Final verification queries (these will be logged but won't fail the migration)
DO $$
DECLARE
    payments_without_tickets INTEGER;
    tickets_without_passengers_col INTEGER;
    constraint_exists INTEGER;
BEGIN
    -- Count payments without tickets
    SELECT COUNT(*) INTO payments_without_tickets
    FROM payments
    WHERE "ticketId" IS NULL;

    -- Check if passengers column still exists
    SELECT COUNT(*) INTO tickets_without_passengers_col
    FROM information_schema.columns
    WHERE table_name = 'tickets' AND column_name = 'passengers';

    -- Check if foreign key constraint exists
    SELECT COUNT(*) INTO constraint_exists
    FROM information_schema.table_constraints
    WHERE constraint_name = 'payments_ticketid_fkey';

    -- Log verification results
    INSERT INTO migration_logs (migration_name, action, details, created_at)
    VALUES (
        '20241220_payment_ticket_flow_update',
        'VERIFICATION_COMPLETE',
        json_build_object(
            'payments_without_tickets', payments_without_tickets,
            'passengers_column_exists', tickets_without_passengers_col > 0,
            'foreign_key_constraint_exists', constraint_exists > 0,
            'migration_successful', true
        ),
        NOW()
    );
END $$;

-- Log final completion
INSERT INTO migration_logs (migration_name, action, details, created_at)
VALUES (
    '20241220_payment_ticket_flow_update',
    'MIGRATION_COMPLETED',
    json_build_object(
        'status', 'success',
        'duration_seconds', EXTRACT(EPOCH FROM (NOW() - (
            SELECT created_at FROM migration_logs
            WHERE migration_name = '20241220_payment_ticket_flow_update'
            AND action = 'MIGRATION_STARTED'
        ))),
        'backup_tables', json_build_array('payments_backup_20241220', 'tickets_backup_20241220')
    ),
    NOW()
);

COMMIT;

-- Post-migration verification queries
-- Run these manually after migration to verify success
/*
-- 1. Verify ticketId is now nullable
SELECT
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_name = 'payments' AND column_name = 'ticketId';

-- 2. Verify passengers column is removed
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'tickets' AND column_name = 'passengers';

-- 3. Check foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'payments'
    AND kcu.column_name = 'ticketId';

-- 4. Count payments without tickets
SELECT COUNT(*) as payments_without_tickets
FROM payments
WHERE "ticketId" IS NULL;

-- 5. Check migration logs
SELECT * FROM migration_logs
WHERE migration_name = '20241220_payment_ticket_flow_update'
ORDER BY created_at;

-- 6. Verify backup tables exist and have data
SELECT
    'payments_backup_20241220' as table_name,
    COUNT(*) as record_count
FROM payments_backup_20241220
UNION ALL
SELECT
    'tickets_backup_20241220' as table_name,
    COUNT(*) as record_count
FROM tickets_backup_20241220;
*/
