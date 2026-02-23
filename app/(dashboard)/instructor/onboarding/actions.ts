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
    const govIdFile = formData.get('govIdFile') as File
    const birFile = formData.get('birFile') as File

    // Use specific certification name if 'Other' was selected
    if (certificationBody === 'Other' && otherCertification) {
        certificationBody = otherCertification
    }

    if (!fullName || !instagramHandle || !contactNumber || !dateOfBirth || !certificationBody || !certificateFile || certificateFile.size === 0 || !tin || !govIdExpiry || !govIdFile || govIdFile.size === 0) {
        return { error: 'All fields are required, including TIN and Gov ID' }
    }

    // 1. Update Profile
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: user.id, // Ensure id is set for upsert
            full_name: fullName,
            instagram_handle: instagramHandle,
            contact_number: contactNumber,
            date_of_birth: dateOfBirth,
            tin: tin,
            gov_id_expiry: govIdExpiry,
            role: 'instructor', // Default to instructor
            updated_at: new Date().toISOString()
        })
        .select() // Returning to help debugging if needed

    if (profileError) {
        console.error('Profile update error:', profileError)
        return { error: 'Failed to update profile' }
    }

    const certificatePath = `${user.id}/cert_${Date.now()}.${certificateFile.name.split('.').pop()}`
    const govIdPath = `${user.id}/govid_${Date.now()}.${govIdFile.name.split('.').pop()}`
    let birPath = null

    // Upload Cert
    const { error: certUploadError } = await supabase.storage
        .from('certifications')
        .upload(certificatePath, certificateFile)

    if (certUploadError) {
        console.error('Cert upload error:', certUploadError)
        return { error: 'Failed to upload certificate' }
    }

    // Upload Gov ID
    const { error: govIdUploadError } = await supabase.storage
        .from('certifications')
        .upload(govIdPath, govIdFile)

    if (govIdUploadError) {
        console.error('Gov ID upload error:', govIdUploadError)
        return { error: 'Failed to upload Government ID' }
    }

    // Upload BIR (Optional)
    if (birFile && birFile.size > 0) {
        birPath = `${user.id}/bir_${Date.now()}.${birFile.name.split('.').pop()}`
        const { error: birUploadError } = await supabase.storage
            .from('certifications')
            .upload(birPath, birFile)

        if (birUploadError) {
            console.error('BIR upload error:', birUploadError)
            // We might allow proceeding without BIR if upload fails but maybe better to error
            return { error: 'Failed to upload BIR document' }
        }
    }

    // Update Profile with URLs
    await supabase.from('profiles').update({
        gov_id_url: govIdPath,
        bir_url: birPath
    }).eq('id', user.id)

    // Get public URL (or signed URL depending on bucket privacy)
    // Assuming private bucket for certs, we typically store the path.
    // For simplicity in this demo, let's assume we store the path or a signed URL generator is used later.
    // Let's store the path for now.

    // 3. Insert into Certifications table
    const { error: certError } = await supabase
        .from('certifications')
        .insert({
            instructor_id: user.id,
            certification_body: certificationBody,
            certification_name: 'Instructor Certification', // Generic name or derived
            proof_url: certificatePath,
            verified: false // Defaults to false in DB, but being explicit
        })

    if (certError) {
        console.error('Certification insert error:', certError)
        return { error: 'Failed to submit certification' }
    }

    // Revalidate pages to ensure cache is updated
    revalidatePath('/instructor')
    revalidatePath('/instructor/onboarding')

    // Redirect to dashboard or success page
    redirect('/instructor?onboarding=success')
}
