-- Migration: Comprehensive Notification System (Email + In-App)
-- Date: 2026-04-16

-- 1. Create staff_notification_recipients table (preferences)
CREATE TABLE IF NOT EXISTS public.staff_notification_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT TRUE,
    -- preferences structure: { "category_key": { "event_key": ["email", "in_app"] } }
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(studio_id, profile_id)
);

-- 2. Create in-app notifications table (activity feed)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'booking', 'payment', 'onboarding', 'marketing', 'system'
    title TEXT NOT NULL,
    description TEXT,
    data JSONB DEFAULT '{}'::jsonb, -- stores links, ids, etc.
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.staff_notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. RLS for staff_notification_recipients
-- Studio owners can manage all recipients in their studio
DROP POLICY IF EXISTS "Owners can manage notification recipients" ON public.staff_notification_recipients;
CREATE POLICY "Owners can manage notification recipients" ON public.staff_notification_recipients
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.studios WHERE id = staff_notification_recipients.studio_id AND owner_id = auth.uid()));

-- Staff members can view their own settings
DROP POLICY IF EXISTS "Users can view their own notification settings" ON public.staff_notification_recipients;
CREATE POLICY "Users can view their own notification settings" ON public.staff_notification_recipients
    FOR SELECT TO authenticated
    USING (profile_id = auth.uid());

-- 5. RLS for notifications
-- Users can manage their own in-app notifications
DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.notifications;
CREATE POLICY "Users can manage their own notifications" ON public.notifications
    FOR ALL TO authenticated
    USING (recipient_id = auth.uid());

-- 6. Add triggers for updated_at
CREATE TRIGGER trg_staff_notification_recipients_updated_at
    BEFORE UPDATE ON public.staff_notification_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_notifications_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
