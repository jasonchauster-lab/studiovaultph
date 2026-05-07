import { createClient } from '@/lib/supabase/server'

export async function checkPlans() {
    const supabase = await createClient()
    
    // 1. Get User IDs
    const { data: users } = await supabase.from('profiles').select('id, email, full_name').in('email', ['jadenphan4@gmail.com', 'clubpilatesph@gmail.com'])
    console.log('Users:', users)
    
    const jaden = users?.find(u => u.email === 'jadenphan4@gmail.com')
    const owner = users?.find(u => u.email === 'clubpilatesph@gmail.com')
    
    if (!jaden || !owner) {
        console.log('One or more users not found')
        return
    }
    
    // 2. Get Studio ID for owner
    const { data: studios } = await supabase.from('studios').select('id, name').eq('owner_id', owner.id)
    console.log('Studios:', studios)
    
    if (!studios || studios.length === 0) {
        console.log('No studios found for owner')
        return
    }
    
    const studioId = studios[0].id
    
    // 3. Get plans for Jaden at this studio
    const { data: plans } = await supabase
        .from('customer_plans')
        .select('*')
        .eq('user_id', jaden.id)
        .eq('studio_id', studioId)
    
    console.log('Plans for Jaden:', plans)
}
