const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testFetch() {
  console.log('--- Testing Instructor Fetch ---')
  const { data: instructors, error: iError } = await supabase
    .from('profiles')
    .select(`
        id, 
        full_name, 
        gov_id_url,
        gov_id_expiry,
        bir_url,
        bir_expiry,
        certifications(proof_url, expiry_date)
    `)
    .eq('role', 'instructor')
    .limit(1);

  if (iError) console.error('Instructor error:', iError)
  else console.log('Instructor data:', JSON.stringify(instructors, null, 2))

  console.log('\n--- Testing Studio Fetch ---')
  const { data: studios, error: sError } = await supabase
    .from('studios')
    .select('id, name, bir_certificate_url, bir_certificate_expiry, gov_id_url, mayors_permit_url, mayors_permit_expiry, secretary_certificate_url, space_photos_urls, insurance_url, insurance_expiry')
    .limit(1);

  if (sError) console.error('Studio error:', sError)
  else console.log('Studio data:', JSON.stringify(studios, null, 2))
}

testFetch()
