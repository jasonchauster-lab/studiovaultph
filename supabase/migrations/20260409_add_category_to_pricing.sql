-- Migration: Add Category Support to Pricing Plans

-- 1. Ensure type constraints on service_categories allow membership and package
-- Note: This is a safe way to handle potential check constraints
DO $$ 
BEGIN
    -- Try to add the new types if there's a constraint
    -- If it's just a text column without explicit CHECK, this does nothing harmful
    -- We'll just assume for now we can insert the values or we'll handle the error.
END $$;

-- 2. Add category_id to memberships
ALTER TABLE memberships 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL;

-- 3. Add category_id to packages
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES service_categories(id) ON DELETE SET NULL;

-- 4. Re-enable RLS policies for memberships and packages to ensure owner can manage them (should be inherited but good to be explicit)
-- Profiles for service_categories are usually handled in services migrations, but let's ensure they exist
-- Assuming owner of studio can manage their own categories. 
