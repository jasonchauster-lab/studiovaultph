import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkTable() {
  const { error } = await supabase.from('studio_payment_configs').select('count').limit(1)
  if (error) {
    console.error('Table does not exist or error:', error.message)
  } else {
    console.log('Table studio_payment_configs exists!')
  }
}

checkTable()
