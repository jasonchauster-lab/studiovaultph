import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkColumns() {
  const { data: studios, error: sError } = await supabase.from('studios').select('*').limit(1)
  if (sError) {
    console.error('Studios error:', sError)
  } else {
    console.log('Studios ALL columns:', JSON.stringify(Object.keys(studios[0] || {}), null, 2))
  }
}

checkColumns()
