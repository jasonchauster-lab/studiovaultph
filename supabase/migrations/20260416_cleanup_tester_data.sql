-- 1. Default NULL origin_portal to 'cms' for all profiles
UPDATE profiles 
SET origin_portal = 'cms' 
WHERE origin_portal IS NULL;

-- 2. Delete Tester Studios (Pilates Babe and Damien Studio)
-- We use slugs to identify them safely
DELETE FROM outlets WHERE studio_id IN (SELECT id FROM studios WHERE slug IN ('testerstudio', 'damienstudio'));
DELETE FROM slots WHERE studio_id IN (SELECT id FROM studios WHERE slug IN ('testerstudio', 'damienstudio'));
DELETE FROM bookings WHERE studio_id IN (SELECT id FROM studios WHERE slug IN ('testerstudio', 'damienstudio'));
DELETE FROM reviews WHERE studio_id IN (SELECT id FROM studios WHERE slug IN ('testerstudio', 'damienstudio'));
DELETE FROM studios WHERE slug IN ('testerstudio', 'damienstudio');

-- 3. Delete Tester Profiles (Test Studio owner and Zorro Hadland)
DELETE FROM profiles WHERE full_name IN ('Test Studio', 'Zorro Hadland');
