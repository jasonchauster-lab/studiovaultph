-- Add floor_or_unit column to studios table
ALTER TABLE studios ADD COLUMN IF NOT EXISTS floor_or_unit TEXT;
