-- Migration: Advanced Instructor Payroll Configuration
-- Description: Adds payroll configuration columns to studio_members and adds payroll permissions to roles.

-- 1. Add payroll configuration columns to studio_members
ALTER TABLE public.studio_members 
ADD COLUMN IF NOT EXISTS base_pay_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'none' CHECK (commission_type IN ('none', 'flat', 'percentage')),
ADD COLUMN IF NOT EXISTS commission_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_threshold INTEGER DEFAULT 0;

-- 2. Add payroll permissions to default Admin role
-- This is a bit tricky as we need to update JSONB.
-- We'll just ensure that any future permission checks handle missing keys as false.
-- But for the owner, we handle it in code.

-- 3. Update existing Admin roles to have view_payroll permission
UPDATE public.studio_roles
SET permissions = permissions || '{"view_payroll": true, "manage_payroll": true}'::jsonb
WHERE name = 'Admin';
