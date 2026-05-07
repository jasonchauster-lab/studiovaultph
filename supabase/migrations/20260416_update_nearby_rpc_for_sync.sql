-- Update get_studios_nearby_v2 to ensure listing only studios with active marketplace sync
CREATE OR REPLACE FUNCTION get_studios_nearby_v2(
  user_lat float,
  user_lng float,
  radius_meters float
)
RETURNS SETOF studios AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT s.*
  FROM studios s
  JOIN profiles p ON s.owner_id = p.id
  -- Join with outlets to check branch-level sync
  LEFT JOIN outlets o ON s.id = o.studio_id
  WHERE s.verified = true
    AND s.marketplace_eligibility = 'active' -- Ensure global eligibility is active
    AND (
      -- Either some branch has sync enabled
      o.is_marketplace_sync_enabled = true 
      OR 
      -- Or the studio is public (Legacy/Global fallback)
      s.is_public = true
    )
    AND p.is_suspended = false
    AND ST_DWithin(
      s.location_coords,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY s.location_coords <-> ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;
END;
$$ LANGUAGE plpgsql STABLE;
