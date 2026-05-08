
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAuditLogs() {
    console.log('--- Checking Recent Audit Logs ---')
    const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)
    
    if (error) {
        console.error('Error fetching logs:', error)
    } else {
        logs.forEach(log => {
            console.log(`[${log.created_at}] ${log.action} - ${log.table_name}`)
            if (log.payload) console.log('Payload:', JSON.stringify(log.payload, null, 2))
            console.log('---')
        })
    }
}

checkAuditLogs()
