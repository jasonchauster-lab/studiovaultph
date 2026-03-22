'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function submitInstructorOnboarding(formData: FormData) {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: 'User not authenticated' }
    }

    // Check if duplicate application
    const { data: existingCerts } = await supabase
        .from('certifications')
        .select('id')
        .eq('instructor_id', user.id)
        .limit(1)

    if (existingCerts && existingCerts.length > 0) {
        return { error: 'You have already submitted an application.' }
    }

    const fullName = formData.get('fullName') as string
    const instagramHandle = formData.get('instagramHandle') as string
    const contactNumber = formData.get('contactNumber') as string
    const dateOfBirth = formData.get('dateOfBirth') as string
    let certificationBody = formData.get('certificationBody') as string
    const otherCertification = formData.get('otherCertification') as string
    const certificateFile = formData.get('certificateFile') as File
    const tin = formData.get('tin') as string
    const govIdExpiry = formData.get('govIdExpiry') as string
    const birExpiry = formData.get('birExpiry') as string
    const certExpiry = formData.get('certExpiry') as string || null
    const govIdFile = formData.get('govIdFile') as File
    const birFile = formData.get('birFile') as File

    // Use specific certification name if 'Other' was selected
    if (certificationBody === 'Other' && otherCertification) {
        certificationBody = otherCertification
    }

    if (!fullName || !instagramHandle || !contactNumber || !dateOfBirth || !certificationBody || !certificateFile || certificateFile.size === 0 || !tin || !govIdExpiry || !govIdFile || govIdFile.size === 0) {
        return { error: 'All fields are required, including TIN and Gov ID' }
    }

    // 1. Fetch current profile role to prevent role escalation or downgrade
    const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const existingRole = currentProfile?.role
    // Only upgrade 'customer' to 'instructor'. Protect 'admin' and 'studio'.
    const newRole = (existingRole === 'admin' || existingRole === 'studio' || existingRole === 'instructor')
        ? existingRole
        : 'instructor'

    // 1. Upload Files
    const certificatePath = `${user.id}/cert_${Date.now()}.${certificateFile.name.split('.').pop()}`
    const govIdPath = `${user.id}/govid_${Date.now()}.${govIdFile.name.split('.').pop()}`
    let birPath = null

    const uploadPromises = [
        supabase.storage.from('certifications').upload(certificatePath, certificateFile),
        supabase.storage.from('certifications').upload(govIdPath, govIdFile)
    ]

    if (birFile && birFile.size > 0) {
        birPath = `${user.id}/bir_${Date.now()}.${birFile.name.split('.').pop()}`
        uploadPromises.push(supabase.storage.from('certifications').upload(birPath, birFile))
    }

    const uploadResults = await Promise.all(uploadPromises)
    const uploadErrorResult = uploadResults.find(r => r.error)
    if (uploadErrorResult && uploadErrorResult.error) {
        console.error('Upload error:', uploadErrorResult.error)
        return { error: `Failed to upload documents: ${uploadErrorResult.error.message}` }
    }

    // 2. Atomic DB Submission
    const { data: result, error: rpcError } = await supabase.rpc('submit_onboarding_atomic', {
        target_user_id: user.id,
        new_full_name: fullName,
        new_instagram_handle: instagramHandle,
        new_contact_number: contactNumber,
        new_date_of_birth: dateOfBirth,
        new_tin: tin,
        new_gov_id_expiry: govIdExpiry,
        new_bir_expiry: birExpiry || null,
        new_role: newRole,
        cert_body: certificationBody,
        cert_name: 'Instructor Certification',
        cert_proof_url: certificatePath,
        cert_expiry_date: certExpiry,
        id_url: govIdPath,
        tax_url: birPath
    })

    if (rpcError || (result as any)?.success === false) {
        console.error('Atomic Onboarding Error:', rpcError || (result as any)?.error)
        return { error: rpcError?.message || (result as any)?.error || 'Failed to submit application' }
    }

    // 3. Sync Auth Metadata
    await supabase.auth.updateUser({
        data: { role: newRole }
    })

    // Revalidate pages to ensure cache is updated
    revalidatePath('/instructor')
    revalidatePath('/instructor/onboarding')

    // Redirect to dashboard or success page
    redirect('/instructor?onboarding=success')
}
