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
    const certificationBody = formData.get('certificationBody') as string
    const certificateFile = formData.get('certificateFile') as File

    if (!fullName || !instagramHandle || !contactNumber || !certificationBody || !certificateFile) {
        return { error: 'All fields are required' }
    }

    // 1. Update Profile
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: user.id, // Ensure id is set for upsert
            full_name: fullName,
            instagram_handle: instagramHandle,
            contact_number: contactNumber,
            role: 'instructor', // Default to instructor
            updated_at: new Date().toISOString()
        })
        .select() // Returning to help debugging if needed

    if (profileError) {
        console.error('Profile update error:', profileError)
        return { error: 'Failed to update profile' }
    }

    // 2. Upload Certificate
    // Note: 'certifications' bucket must exist. We'll assume it does or user needs to create it.
    // For this task, we'll try to upload if bucket exists, or just store a placeholder URL if not strictly enforced yet.
    // Ideally, we should check bucket existence.

    const fileExt = certificateFile.name.split('.').pop()
    const filePath = `${user.id}/${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
        .from('certifications')
        .upload(filePath, certificateFile)

    if (uploadError) {
        console.error('Upload error:', uploadError)
        // For now, we might return error, or proceed if bucket is missing (as we can't create it via client easily without setup)
        return { error: 'Failed to upload certificate. Please try again.' }
    }

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
            proof_url: filePath,
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
