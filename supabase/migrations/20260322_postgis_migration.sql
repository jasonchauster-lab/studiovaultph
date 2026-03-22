-- 1. Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add geography columns to studios and profiles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'studios' AND column_name = 'location_coords') THEN
        ALTER TABLE studios ADD COLUMN location_coords geography(POINT, 4326);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'location_coords') THEN
        ALTER TABLE profiles ADD COLUMN location_coords geography(POINT, 4326);
    END IF;
END $$;

-- 3. Create sync functions for lat/lng to geography
CREATE OR REPLACE FUNCTION sync_studio_location_coords()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.location_coords := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  ELSE
    NEW.location_coords := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_profile_location_coords()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.home_base_lat IS NOT NULL AND NEW.home_base_lng IS NOT NULL THEN
    NEW.location_coords := ST_SetSRID(ST_MakePoint(NEW.home_base_lng, NEW.home_base_lat), 4326)::geography;
  ELSE
    NEW.location_coords := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create/Replace triggers
DROP TRIGGER IF EXISTS trg_sync_studio_location_coords ON studios;
CREATE TRIGGER trg_sync_studio_location_coords
BEFORE INSERT OR UPDATE OF lat, lng ON studios
FOR EACH ROW
EXECUTE FUNCTION sync_studio_location_coords();

DROP TRIGGER IF EXISTS trg_sync_profile_location_coords ON profiles;
CREATE TRIGGER trg_sync_profile_location_coords
BEFORE INSERT OR UPDATE OF home_base_lat, home_base_lng ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_profile_location_coords();

-- 5. Backfill existing data
UPDATE studios 
SET location_coords = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
WHERE lat IS NOT NULL AND lng IS NOT NULL;

UPDATE profiles 
SET location_coords = ST_SetSRID(ST_MakePoint(home_base_lng, home_base_lat), 4326)::geography
WHERE home_base_lat IS NOT NULL AND home_base_lng IS NOT NULL;

-- 6. Create spatial indexes
CREATE INDEX IF NOT EXISTS idx_studios_location_coords ON studios USING GIST (location_coords);
CREATE INDEX IF NOT EXISTS idx_profiles_location_coords ON profiles USING GIST (location_coords);

-- 7. Create Proximity RPC for Studios (V2 - includes business logic)
CREATE OR REPLACE FUNCTION get_studios_nearby_v2(
  user_lat float,
  user_lng float,
  radius_meters float
)
RETURNS SETOF studios AS $$
BEGIN
  RETURN QUERY
  SELECT s.*
  FROM studios s
  JOIN profiles p ON s.owner_id = p.id
  WHERE s.verified = true
    AND p.is_suspended = false
    AND p.available_balance >= 0
    AND ST_DWithin(
      s.location_coords,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY s.location_coords <-> ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;
END;
$$ LANGUAGE plpgsql STABLE;

-- 8. Create Proximity RPC for Instructors (Home Sessions)
CREATE OR REPLACE FUNCTION get_instructors_nearby_v1(
  user_lat float,
  user_lng float,
  radius_meters float
)
RETURNS SETOF profiles AS $$
BEGIN
  RETURN QUERY
  SELECT p.*
  FROM profiles p
  WHERE p.role = 'instructor'
    AND p.is_suspended = false
    AND p.offers_home_sessions = true
    AND ST_DWithin(
      p.location_coords,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      LEAST(radius_meters, COALESCE(p.max_travel_km, 10) * 1000)
    )
  ORDER BY p.location_coords <-> ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;
END;
$$ LANGUAGE plpgsql STABLE;
