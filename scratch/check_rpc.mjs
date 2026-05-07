import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkRPC() {
  const { data, error } = await supabase.rpc('get_auth_role') // Just a dummy to see if RPC works
  console.log('RPC check:', { data, error })
}

checkRPC()
