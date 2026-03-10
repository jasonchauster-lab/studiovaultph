-- Fix: Restore user permissions to insert support messages
-- The recent mega nuke scripts accidentally deleted the INSERT policy for normal users on support_messages.

-- Wait! First, also check support_tickets, as creating a new ticket requires INSERT permissions on support_tickets too.
-- Looking at mega_nuke, the policy was: CREATE POLICY "Users manage own tickets" ON public.support_tickets FOR ALL USING (user_id = auth.uid());
-- "FOR ALL USING" works for SELECT/UPDATE/DELETE. But for INSERT, it needs an explicitly defined WITH CHECK clause if using FOR ALL, or it defaults to the USING clause. 
-- Wait, `user_id = auth.uid()` actually works for INSERT `with check` automatically in postgres if not specified.
-- BUT for support_messages, there is NO user policy for INSERT.

CREATE POLICY "Users can insert messages to own tickets" ON public.support_messages 
FOR INSERT 
WITH CHECK (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
);
