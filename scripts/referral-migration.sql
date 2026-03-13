-- ─────────────────────────────────────────────────────────────────
-- REFERRAL SYSTEM MIGRATION
-- Run this in the Supabase SQL Editor (supabase.com → SQL Editor)
-- ─────────────────────────────────────────────────────────────────

-- 1. Add referral columns to profiles
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
    ADD COLUMN IF NOT EXISTS referred_by   UUID REFERENCES profiles(id);

-- 2. Function: auto-generate an 8-char referral code on profile insert
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        -- Generate until unique (collision extremely unlikely with 8 hex chars = 4 billion combos)
        LOOP
            NEW.referral_code := upper(substring(encode(gen_random_bytes(4), 'hex'), 1, 8));
            EXIT WHEN NOT EXISTS (
                SELECT 1 FROM profiles WHERE referral_code = NEW.referral_code
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to profiles
DROP TRIGGER IF EXISTS set_referral_code ON profiles;
CREATE TRIGGER set_referral_code
    BEFORE INSERT ON profiles
    FOR EACH ROW EXECUTE FUNCTION generate_referral_code();

-- 4. Backfill referral codes for existing profiles that don't have one
DO $$
DECLARE
    rec RECORD;
    new_code TEXT;
BEGIN
    FOR rec IN SELECT id FROM profiles WHERE referral_code IS NULL LOOP
        LOOP
            new_code := upper(substring(encode(gen_random_bytes(4), 'hex'), 1, 8));
            EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_code);
        END LOOP;
        UPDATE profiles SET referral_code = new_code WHERE id = rec.id;
    END LOOP;
END $$;

-- 5. Function: award ₱50 referral bonus when referred user's FIRST booking is completed
--    Adjust the table/column names below if yours differ from 'bookings' / 'client_id'
CREATE OR REPLACE FUNCTION award_referral_bonus()
RETURNS TRIGGER AS $$
DECLARE
    referrer_id            UUID;
    prior_completed_count  INT;
BEGIN
    -- Only fire when status transitions TO 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN

        -- Count prior completed bookings for this client (excluding the current one)
        SELECT COUNT(*) INTO prior_completed_count
        FROM bookings
        WHERE client_id = NEW.client_id
          AND status    = 'completed'
          AND id        != NEW.id;

        -- Only award on the FIRST completed booking
        IF prior_completed_count = 0 THEN

            SELECT referred_by INTO referrer_id
            FROM profiles
            WHERE id = NEW.client_id;

            IF referrer_id IS NOT NULL THEN
                -- Credit ₱50 to the referrer's wallet
                PERFORM increment_available_balance(referrer_id, 50);

                -- Log it as a wallet transaction so it appears in the wallet history
                INSERT INTO wallet_top_ups (user_id, amount, type, status, admin_notes, created_at, updated_at)
                VALUES (
                    referrer_id,
                    50,
                    'referral_bonus',
                    'approved',
                    'Referral Bonus — Your friend completed their first booking.',
                    NOW(),
                    NOW()
                );
            END IF;

        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach trigger to bookings table
DROP TRIGGER IF EXISTS referral_bonus_trigger ON bookings;
CREATE TRIGGER referral_bonus_trigger
    AFTER UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION award_referral_bonus();
