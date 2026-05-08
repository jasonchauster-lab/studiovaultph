
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://wzacmyemiljzpdskyvie.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6YWNteWVtaWxqenBkc2t5dmllIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTIxNTI4OCwiZXhwIjoyMDg2NzkxMjg4fQ.cVVEAR4_EM3ytz4LtPKD8g9RJ__XqI0YTPInPNuDZMI'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkErrorLogs() {
    console.log('--- Checking Recent Error Logs ---')
    const { data: logs, error } = await supabase
        .from('service_errors') // Based on ErrorService.logServiceError usage
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
    
    if (error) {
        console.error('Error fetching logs:', error)
        // Try another common name
        const { data: logs2, error: error2 } = await supabase
            .from('error_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10)
        
        if (error2) {
            console.error('Error fetching logs2:', error2)
        } else {
            console.log('Recent Logs (error_logs):', logs2)
        }
    } else {
        console.log('Recent Logs (service_errors):', logs)
    }
}

checkErrorLogs()
