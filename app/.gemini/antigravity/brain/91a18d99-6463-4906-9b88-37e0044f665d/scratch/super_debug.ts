import { createClient } from '@/lib/supabase/server'

export async function superDebug() {
    const supabase = await createClient()
    
    // 1. Find Jaden
    const { data: jaden } = await supabase.from('profiles').select('*').eq('email', 'jadenphan4@gmail.com').single()
    if (!jaden) {
        console.log('Jaden not found')
        return
    }
    console.log('Jaden ID:', jaden.id)
    
    // 2. Find ALL plans for Jaden
    const { data: plans } = await supabase
        .from('customer_plans')
        .select('*, studios(name, owner_id)')
        .eq('user_id', jaden.id)
    
    console.log('ALL plans for Jaden:', JSON.stringify(plans, null, 2))
}
