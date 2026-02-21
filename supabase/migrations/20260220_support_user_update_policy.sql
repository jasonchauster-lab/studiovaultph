-- ─── User Support Update Policy ────────────────────────────────────────────────────
-- Grants users the ability to update messages on their own tickets, so they can
-- mark messages from admins as read.

create policy "Users can update messages on their tickets"
on support_messages
for update
using (
  exists (
    select 1 from support_tickets
    where support_tickets.id = support_messages.ticket_id
    and support_tickets.user_id = auth.uid()
  )
);
