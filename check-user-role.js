
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUser(userId) {
    console.log('--- Checking User:', userId, '---')
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
    console.log('Role:', profile?.role)
}

checkUser('b675f782-b5df-42f2-8958-8b770f3f2d25')
