-- Update get_studios_nearby_v2 to respect the is_public privacy flag
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
    AND s.is_public = true  -- Logical Isolation: Only show public studios on marketplace
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
