-- Migration: Add Studio Role to user_role ENUM
-- Description: Safely adds the 'studio' role to the existing user_role type if not already present.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t 
                   JOIN pg_enum e ON t.oid = e.enumtypid 
                   WHERE t.typname = 'user_role' 
                   AND e.enumlabel = 'studio') THEN
        ALTER TYPE public.user_role ADD VALUE 'studio';
    END IF;
END $$;
