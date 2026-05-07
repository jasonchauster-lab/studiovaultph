-- Atomic Inventory Stock Adjustment Function
-- Usage: select adjust_inventory_stock('item_id', 'studio_id', -1);

CREATE OR REPLACE FUNCTION adjust_inventory_stock(
    p_item_id UUID,
    p_studio_id UUID,
    p_delta INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE inventory_items
    SET 
        stock_level = stock_level + p_delta,
        updated_at = NOW()
    WHERE id = p_item_id 
    AND studio_id = p_studio_id;

    -- Optional: Logging or Triggering an alert if stock goes below zero
    -- We allow negative stock if the studio settings allow it, 
    -- but here we just ensure the update is atomic.
END;
$$;
