-- 1. Add recipient_id to existing messages table
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Make existing messages recipient_id fallback to the instructor or client if possible (for backward compatibility)
-- Assuming the current system relies on sender_id, we'll just leave existing ones null and let the UI handle them

-- 2. Create Chat Presence table
CREATE TABLE IF NOT EXISTS public.chat_presence (
    booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    chat_partner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_seen_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (booking_id, user_id, chat_partner_id)
);

-- RLS Policies for chat_presence
ALTER TABLE public.chat_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own presence" 
    ON public.chat_presence FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view partner presence" 
    ON public.chat_presence FOR SELECT 
    USING (auth.uid() = chat_partner_id);

-- 3. Create RPC for updating presence atomically
CREATE OR REPLACE FUNCTION public.update_chat_presence(
    p_booking_id uuid,
    p_partner_id uuid
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.chat_presence (booking_id, user_id, chat_partner_id, last_seen_at)
    VALUES (p_booking_id, auth.uid(), p_partner_id, NOW())
    ON CONFLICT (booking_id, user_id, chat_partner_id)
    DO UPDATE SET last_seen_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
