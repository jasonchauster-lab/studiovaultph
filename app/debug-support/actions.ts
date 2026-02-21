'use server'

import { createClient } from '@/lib/supabase/server'

export async function debugSupportMessages() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        console.log('DEBUG: No user logged in.')
        return
    }

    console.log('DEBUG: Current User ID:', user.id)

    // 1. Check if table exists and has data
    const { count, error: countError } = await supabase
        .from('support_messages')
        .select('*', { count: 'exact', head: true })

    console.log('DEBUG: Total Messages in DB:', count)
    if (countError) console.error('DEBUG: Error counting messages:', countError)

    // 2. Check for unread messages for ANY admin (simulating logic)
    // The logic in badge is: is_read = false AND sender_id != user.id
    const { data: messages, error: fetchError } = await supabase
        .from('support_messages')
        .select('*')
        .eq('is_read', false)
        .neq('sender_id', user.id)

    console.log('DEBUG: Unread Messages for this user (count):', messages?.length)
    console.log('DEBUG: Unread Messages Data:', JSON.stringify(messages, null, 2))

    if (fetchError) console.error('DEBUG: Error fetching unread messages:', fetchError)
}
