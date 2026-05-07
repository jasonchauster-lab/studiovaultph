-- Migration: 20260503_atomic_wallet_adjustment.sql
-- Goal: Ensure balance updates and transaction logging are atomic.

CREATE OR REPLACE FUNCTION public.adjust_studio_wallet_balance(
    p_user_id uuid,
    p_studio_id uuid,
    p_amount numeric,
    p_type text, -- 'add' or 'remove'
    p_description text,
    p_actor_id uuid
)
RETURNS void AS $$
DECLARE
    v_final_amount numeric;
BEGIN
    -- 1. Determine final amount sign
    IF p_type = 'add' THEN
        v_final_amount := p_amount;
    ELSE
        v_final_amount := -p_amount;
    END IF;

    -- 2. Update Balance
    IF p_type = 'add' THEN
        INSERT INTO public.customer_memberships (user_id, studio_id, available_balance)
        VALUES (p_user_id, p_studio_id, p_amount)
        ON CONFLICT (user_id, studio_id) 
        DO UPDATE SET 
            available_balance = customer_memberships.available_balance + p_amount,
            updated_at = now();
    ELSE
        UPDATE public.customer_memberships
        SET 
            available_balance = GREATEST(0, available_balance - p_amount),
            updated_at = now()
        WHERE user_id = p_user_id AND studio_id = p_studio_id;
    END IF;

    -- 3. Log Transaction
    INSERT INTO public.studio_wallet_transactions (
        user_id, 
        studio_id, 
        amount, 
        type, 
        description, 
        metadata
    ) VALUES (
        p_user_id,
        p_studio_id,
        v_final_amount,
        'adjustment',
        p_description,
        jsonb_build_object('actor_id', p_actor_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
