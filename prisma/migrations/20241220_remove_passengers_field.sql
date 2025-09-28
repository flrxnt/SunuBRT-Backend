-- Migration: Remove passengers field from tickets table
-- Date: 2024-12-20
-- Description: Remove passengers field as each ticket now represents one passenger only

BEGIN;

-- First, let's check if there are any tickets with passengers > 1
-- These need to be handled manually before running this migration
DO $$
DECLARE
    ticket_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO ticket_count
    FROM tickets
    WHERE passengers > 1;

    IF ticket_count > 0 THEN
        RAISE NOTICE 'Warning: Found % tickets with passengers > 1. These need manual handling before migration.', ticket_count;
        -- Uncomment the line below to prevent migration if tickets with multiple passengers exist
        -- RAISE EXCEPTION 'Migration blocked: Tickets with multiple passengers found';
    END IF;
END $$;

-- Log tickets that will be affected
INSERT INTO migration_logs (migration_name, action, details, created_at)
SELECT
    '20241220_remove_passengers_field' as migration_name,
    'PRE_MIGRATION_AUDIT' as action,
    json_build_object(
        'ticket_id', id,
        'passengers', passengers,
        'user_id', "userId",
        'trip_id', "tripId",
        'status', status
    ) as details,
    NOW() as created_at
FROM tickets
WHERE passengers IS NOT NULL AND passengers != 1;

-- Create a backup table for safety (optional)
CREATE TABLE tickets_backup_20241220 AS
SELECT * FROM tickets;

-- Remove the passengers column
ALTER TABLE tickets DROP COLUMN IF EXISTS passengers;

-- Update any remaining references in the application
-- Note: This should be coordinated with application code changes

-- Log the completion
INSERT INTO migration_logs (migration_name, action, details, created_at)
VALUES (
    '20241220_remove_passengers_field',
    'MIGRATION_COMPLETED',
    json_build_object(
        'passengers_column_removed', true,
        'backup_table_created', 'tickets_backup_20241220',
        'affected_records', (SELECT COUNT(*) FROM tickets_backup_20241220 WHERE passengers > 1)
    ),
    NOW()
);

-- Create migration logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_logs (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMIT;

-- Post-migration verification queries
-- Run these manually to verify the migration
/*
-- 1. Verify passengers column is removed
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'tickets' AND column_name = 'passengers';

-- 2. Check backup table exists and has data
SELECT COUNT(*) as backup_count FROM tickets_backup_20241220;

-- 3. Verify current tickets table structure
\d tickets;

-- 4. Check migration logs
SELECT * FROM migration_logs WHERE migration_name = '20241220_remove_passengers_field';
*/
