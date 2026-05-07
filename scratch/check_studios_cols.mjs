import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkColumns() {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'studios' })
  if (error) {
    console.error('Error fetching columns:', error)
    // Fallback if RPC doesn't exist
    const { data: firstRow, error: fetchError } = await supabase.from('studios').select('*').limit(1).single()
    if (fetchError) {
      console.error('Error fetching first row:', fetchError)
      return
    }
    console.log('Columns from first row:', Object.keys(firstRow))
  } else {
    console.log('Columns from RPC:', data)
  }
}

checkColumns()
