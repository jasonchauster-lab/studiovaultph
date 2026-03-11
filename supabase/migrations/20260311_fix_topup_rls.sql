-- Add UPDATE policy for wallet_top_ups to allow users to submit payment proof
-- This fixes the "TOP-UP RECORD NOT FOUND OR YOU DO NOT HAVE PERMISSION TO UPDATE IT" error

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'wallet_top_ups' 
        AND policyname = 'Users can update their own pending top-ups'
    ) THEN
        CREATE POLICY "Users can update their own pending top-ups"
            ON public.wallet_top_ups FOR UPDATE
            USING (auth.uid() = user_id AND status = 'pending')
            WITH CHECK (auth.uid() = user_id AND status = 'pending');
    END IF;
END $$;
