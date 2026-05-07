
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function listUsers() {
    console.log('--- Listing Recent Users ---')
    const { data: { users }, error } = await supabase.auth.admin.listUsers({
        perPage: 10
    })

    if (error) {
        console.error('List Users Error:', error)
        return
    }

    users.forEach(u => {
        console.log(`ID: ${u.id} | Email: ${u.email} | Role: ${u.user_metadata?.role} | Created: ${u.created_at}`)
    })
}

listUsers()
