-- Add medical_conditions column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS medical_conditions text[] DEFAULT '{}';

-- Create a comment for clarity
COMMENT ON COLUMN profiles.medical_conditions IS 'List of medical conditions or disabilities of the customer.';
