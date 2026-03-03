
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI';

const supabase = createClient(supabaseUrl, supabaseKey);

const repairSql = `
-- Global Wallet RPC Repair & Sync
-- 1. Drop all potentially conflicting versions of execute_admin_balance_adjustment
DROP FUNCTION IF EXISTS public.execute_admin_balance_adjustment(uuid, numeric, text);
DROP FUNCTION IF EXISTS public.execute_admin_balance_adjustment(numeric, text, uuid);

-- 2. Drop all potentially conflicting versions of approve_wallet_top_up
DROP FUNCTION IF EXISTS public.approve_wallet_top_up(uuid);

-- 3. Define DEFINITIVE execute_admin_balance_adjustment
CREATE OR REPLACE FUNCTION public.execute_admin_balance_adjustment(
    p_user_id uuid,
    p_amount numeric,
    p_reason text
)
RETURNS boolean AS $$
DECLARE
    v_current_balance numeric;
    v_new_balance numeric;
    v_floor numeric := -2000.00;
BEGIN
    -- 1. Lock and Get Current
    SELECT COALESCE(available_balance, 0) INTO v_current_balance
    FROM public.profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found for ID %', p_user_id;
    END IF;

    -- 2. Calc
    v_new_balance := v_current_balance + p_amount;

    -- 3. Floor check
    IF p_amount < 0 AND v_new_balance < v_floor THEN
        RAISE EXCEPTION 'Transaction failed: Balance cannot drop below ₱%. Current: ₱%', v_floor, v_current_balance;
    END IF;

    -- 4. Audit Log
    INSERT INTO public.wallet_top_ups (
        user_id,
        amount,
        type,
        status,
        admin_notes,
        processed_at,
        payment_proof_url
    ) VALUES (
        p_user_id,
        p_amount,
        'admin_adjustment',
        'approved',
        p_reason,
        NOW(),
        'ADMIN_OVERRIDE'
    );

    -- 5. Update BOTH balance columns
    UPDATE public.profiles
    SET available_balance = v_new_balance,
        wallet_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Define DEFINITIVE approve_wallet_top_up
CREATE OR REPLACE FUNCTION public.approve_wallet_top_up(
    p_top_up_id uuid
)
RETURNS boolean AS $$
DECLARE
    v_user_id uuid;
    v_amount numeric;
    v_status text;
BEGIN
    -- 1. Lock and Get
    SELECT user_id, amount, status INTO v_user_id, v_amount, v_status
    FROM public.wallet_top_ups
    WHERE id = p_top_up_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Top-up request not found';
    END IF;

    IF v_status <> 'pending' THEN
        RAISE EXCEPTION 'Top-up request is already %', v_status;
    END IF;

    -- 2. Update Status
    UPDATE public.wallet_top_ups
    SET status = 'approved',
        processed_at = NOW()
    WHERE id = p_top_up_id;

    -- 3. Increment BOTH balances
    UPDATE public.profiles
    SET available_balance = COALESCE(available_balance, 0) + v_amount,
        wallet_balance = COALESCE(wallet_balance, 0) + v_amount,
        updated_at = NOW()
    WHERE id = v_user_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fix increment/deduct RPCs
CREATE OR REPLACE FUNCTION public.increment_available_balance(user_id uuid, amount numeric)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET available_balance = COALESCE(available_balance, 0) + amount,
        wallet_balance = COALESCE(wallet_balance, 0) + amount,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.deduct_available_balance(user_id uuid, amount numeric)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET available_balance = COALESCE(available_balance, 0) - amount,
        wallet_balance = COALESCE(wallet_balance, 0) - amount,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Final Sync
UPDATE public.profiles 
SET wallet_balance = available_balance 
WHERE wallet_balance IS DISTINCT FROM available_balance;
`;

async function runRepair() {
    console.log('--- executing Global Wallet RPC Repair ---');

    // We'll use a trick many people use: run the SQL via a temporary function or just assume a common 'execute_sql' rpc isn't there.
    // Since I can't run raw SQL easily, I'll have to rely on existing RPCs if they exist, or the user's help.
    // WAIT! I don't have a raw SQL RPC. 

    // I will try to call 'unaccent' or some other function that might allow execution? No.
    // I'll suggest the user runs this in the Supabase SQL editor.

    // BUT WAIT! I can use 'multi_replace_file_content' to fix the migrations and then... 
    // nothing, I can't trigger a migration run.

    // I'll try to find a way to run this.
    // Is there a 'get_function_definition'? I successfully called it in Step 1546.
    // Actually, I can't run the SQL.

    // I'll notify the user and provide the SQL.
    console.log(repairSql);
}

runRepair();
