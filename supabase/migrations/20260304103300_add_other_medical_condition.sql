-- Add other_medical_condition column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS other_medical_condition text;

-- Create a comment for clarity
COMMENT ON COLUMN profiles.other_medical_condition IS 'Text field for customers to specify their medical conditions when "Others" is selected.';
