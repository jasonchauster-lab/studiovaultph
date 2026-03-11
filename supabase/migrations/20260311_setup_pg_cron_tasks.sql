-- Migration: Setup Supabase pg_cron Tasks
-- This script replaces Vercel Crons with native PostgreSQL cron jobs.

-- 1. Enable the extension (usually requires manual UI enable or superuser, but included for completeness)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Create function to auto-process bookings (Complete approved / Payout cancelled)
CREATE OR REPLACE FUNCTION public.cron_auto_process_bookings()
RETURNS void AS $$
DECLARE
    v_booking RECORD;
    v_cutoff TIMESTAMPTZ;
BEGIN
    v_cutoff := NOW() - interval '1 hour';

    -- A. Process 'approved' bookings -> 'completed'
    FOR v_booking IN 
        SELECT b.id 
        FROM public.bookings b
        JOIN public.slots s ON b.slot_id = s.id
        WHERE b.status = 'approved'
          AND (s.date || ' ' || s.end_time || '+08')::timestamptz <= v_cutoff
    LOOP
        PERFORM public.process_booking_completion_atomic(v_booking.id);
    END LOOP;

    -- B. Process 'cancelled_charged' bookings -> 'funds_unlocked'
    FOR v_booking IN 
        SELECT b.id 
        FROM public.bookings b
        JOIN public.slots s ON b.slot_id = s.id
        WHERE b.status = 'cancelled_charged'
          AND b.funds_unlocked = false
          AND (s.date || ' ' || s.end_time || '+08')::timestamptz <= v_cutoff
    LOOP
        PERFORM public.process_instant_payout_atomic(v_booking.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create function to auto-unlock matured funds (Complete -> Unlocked after 24h)
CREATE OR REPLACE FUNCTION public.cron_auto_unlock_funds()
RETURNS void AS $$
DECLARE
    v_booking RECORD;
    v_cutoff TIMESTAMPTZ;
BEGIN
    v_cutoff := NOW() - interval '24 hours';

    FOR v_booking IN 
        SELECT id 
        FROM public.bookings 
        WHERE status = 'completed' 
          AND funds_unlocked = false
          AND completed_at <= v_cutoff
    LOOP
        PERFORM public.unlock_booking_funds_atomic(v_booking.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to expire abandoned bookings (Pending past expiry)
CREATE OR REPLACE FUNCTION public.cron_expire_abandoned_bookings()
RETURNS void AS $$
DECLARE
    v_booking RECORD;
    v_now TIMESTAMPTZ;
    v_legacy_cutoff TIMESTAMPTZ;
    v_slot_id UUID;
    v_breakdown JSONB;
    v_wallet_deduction NUMERIC;
BEGIN
    v_now := NOW();
    v_legacy_cutoff := v_now - interval '15 minutes';

    -- Find both timed and legacy pending bookings
    FOR v_booking IN 
        SELECT id, slot_id, client_id, booked_slot_ids, price_breakdown
        FROM public.bookings
        WHERE status = 'pending'
          AND payment_proof_url IS NULL
          AND (
            (expires_at IS NOT NULL AND expires_at <= v_now)
            OR 
            (expires_at IS NULL AND created_at <= v_legacy_cutoff)
          )
    LOOP
        -- 1. Mark as expired
        UPDATE public.bookings SET status = 'expired' WHERE id = v_booking.id;

        -- 2. Release slots
        UPDATE public.slots SET is_available = true WHERE id = v_booking.slot_id;
        IF v_booking.booked_slot_ids IS NOT NULL THEN
            UPDATE public.slots SET is_available = true WHERE id = ANY(v_booking.booked_slot_ids);
        END IF;

        -- 3. Refund wallet
        v_breakdown := v_booking.price_breakdown;
        v_wallet_deduction := (v_breakdown->>'wallet_deduction')::numeric;
        
        IF v_wallet_deduction > 0 AND v_booking.client_id IS NOT NULL THEN
            -- Increment balance
            UPDATE public.profiles 
            SET available_balance = available_balance + v_wallet_deduction 
            WHERE id = v_booking.client_id;

            -- Log transaction
            INSERT INTO public.wallet_top_ups (
                user_id, amount, status, type, admin_notes
            ) VALUES (
                v_booking.client_id, 
                v_wallet_deduction, 
                'approved', 
                'refund', 
                'Refund for expired booking (ID: ' || left(v_booking.id::text, 8) || ')'
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Schedule the jobs
-- Safely unschedule if they exist to avoid "could not find valid entry for job" error
DO $$
BEGIN
    PERFORM cron.unschedule('auto-process-bookings') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-process-bookings');
    PERFORM cron.unschedule('auto-unlock-funds') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-unlock-funds');
    PERFORM cron.unschedule('expire-abandoned-bookings') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'expire-abandoned-bookings');
END $$;

SELECT cron.schedule('auto-process-bookings', '*/15 * * * *', 'SELECT public.cron_auto_process_bookings()');
SELECT cron.schedule('auto-unlock-funds', '0 * * * *', 'SELECT public.cron_auto_unlock_funds()');
SELECT cron.schedule('expire-abandoned-bookings', '*/5 * * * *', 'SELECT public.cron_expire_abandoned_bookings()');
