const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Key. Current env counts:', 
    Object.keys(process.env).filter(k => k.includes('SUPABASE')).length)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const emails = [
  'clubpilatesph@gmail.com',
  'jchau199@gmail.com',
  'tracymeck35@gmail.com'
]

async function disableAuthShield() {
  for (const email of emails) {
    console.log(`\nProcessing ${email}...`)
    
    // 1. Get user by email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      console.error(`Error listing users: ${listError.message}`)
      return
    }

    const user = users.find(u => u.email === email)
    if (!user) {
      console.log(`User not found: ${email}`)
      continue
    }

    console.log(`User ID: ${user.id}`)

    // 2. Update user to ensure email is confirmed
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
      user_metadata: { ...user.user_metadata, mfa_enabled: false }
    })

    if (updateError) {
      console.error(`Error updating user ${email}: ${updateError.message}`)
    } else {
      console.log(`Successfully updated ${email}.`)
    }

    // 3. Delete MFA factors
    try {
        const { data: factors, error: mfaError } = await supabase.auth.admin.mfa.listFactors({ userId: user.id })
        if (!mfaError && factors && factors.factors.length > 0) {
            console.log(`Found ${factors.factors.length} MFA factors for ${email}. Deleting...`)
            for (const factor of factors.factors) {
                await supabase.auth.admin.mfa.deleteFactor({ userId: user.id, factorId: factor.id })
            }
            console.log(`Deleted all MFA factors for ${email}.`)
        } else {
            console.log(`No MFA factors found for ${email}.`)
        }
    } catch (e) {
        console.log(`MFA factor deletion skipped for ${email}.`)
    }
  }
}

disableAuthShield()
