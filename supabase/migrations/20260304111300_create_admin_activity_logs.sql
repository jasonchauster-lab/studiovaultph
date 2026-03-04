-- Create Admin Activity Logs table
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    details text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs" 
    ON public.admin_activity_logs FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Admins can insert activity logs (via the service role or authenticated admin)
CREATE POLICY "Admins can insert activity logs" 
    ON public.admin_activity_logs FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );
