-- Database Cleanup Query: March 4th @ 3:00 PM Slot Reset
-- IMPORTANT: You MUST provide the specific studio_id to avoid overwriting all studios' slots.

UPDATE slots 
SET equipment = '{"REFORMER": 2}'::jsonb, 
    equipment_inventory = '{"REFORMER": 2}'::jsonb, 
    quantity = 2, 
    is_available = true
WHERE date = '2026-03-04' 
  AND start_time = '15:00:00'
  AND studio_id = 'YOUR_STUDIO_ID_HERE'; -- Replace this with the actual studio ID from your Supabase dashboard.
