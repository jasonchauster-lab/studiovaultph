-- Migration: Fix Customer Plans RLS and Purchase Flow
-- Allows customers to initiate purchases (INSERT) and upload payment proofs (UPDATE).

-- 1. Allow customers to insert their own plans
DROP POLICY IF EXISTS "Users can insert their own plans" ON public.customer_plans;
CREATE POLICY "Users can insert their own plans" ON public.customer_plans
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- 2. Allow customers to update their own plans (e.g., for payment proof)
DROP POLICY IF EXISTS "Users can update their own plans" ON public.customer_plans;
CREATE POLICY "Users can update their own plans" ON public.customer_plans
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- 3. Ensure users can still view their own plans (already exists but for consistency)
DROP POLICY IF EXISTS "Users can view their own plans" ON public.customer_plans;
CREATE POLICY "Users can view their own plans" ON public.customer_plans
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- 4. Studio Owners and Members can also view plans for their studio
DROP POLICY IF EXISTS "Studio owners can view their customers plans" ON public.customer_plans;
CREATE POLICY "Studio owners can view their customers plans" ON public.customer_plans
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.studios s
            WHERE s.id = public.customer_plans.studio_id
            AND (
                s.owner_id = auth.uid()
                OR 
                EXISTS (
                    SELECT 1 FROM public.studio_members m
                    WHERE m.studio_id = s.id AND m.profile_id = auth.uid()
                )
            )
        )
    );
