-- Add UPDATE policy for users to manage their own top-up requests (only if pending)
CREATE POLICY "Users can update their own pending top-ups"
    ON public.wallet_top_ups FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (auth.uid() = user_id AND status = 'pending');
