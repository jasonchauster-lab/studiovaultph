-- Add date of birth column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
