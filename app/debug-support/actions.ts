'use server'

import { createClient } from '@/lib/supabase/server'

export async function debugSupportMessages() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return
    }


    // 1. Check if table exists and has data
    const { count, error: countError } = await supabase
        .from('support_messages')
        .select('*', { count: 'exact', head: true })

    if (countError) console.error('DEBUG: Error counting messages:', countError)

    // 2. Check for unread messages for ANY admin (simulating logic)
    // The logic in badge is: is_read = false AND sender_id != user.id
    const { data: messages, error: fetchError } = await supabase
        .from('support_messages')
        .select('*')
        .eq('is_read', false)
        .neq('sender_id', user.id)


    if (fetchError) console.error('DEBUG: Error fetching unread messages:', fetchError)
}
