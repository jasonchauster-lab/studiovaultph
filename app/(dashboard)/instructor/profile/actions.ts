'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addCertification(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const certificationBody = formData.get('certificationBody') as string
    const certificateFile = formData.get('certificateFile') as File

    if (!certificationBody || !certificateFile || certificateFile.size === 0) {
        return { error: 'Both certification body and proof file are required.' }
    }

    // 1. Upload Certificate Proof
    const fileExt = certificateFile.name.split('.').pop()
    const filePath = `${user.id}/cert_${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
        .from('certifications')
        .upload(filePath, certificateFile)

    if (uploadError) {
        console.error('Certification upload error:', uploadError)
        return { error: 'Failed to upload certification proof.' }
    }

    // 2. Insert into Certifications table
    const { error: certError } = await supabase
        .from('certifications')
        .insert({
            instructor_id: user.id,
            certification_body: certificationBody,
            certification_name: 'Instructor Certification',
            proof_url: filePath,
            verified: false
        })

    if (certError) {
        console.error('Certification insert error:', certError)
        return { error: 'Failed to save certification details.' }
    }

    revalidatePath('/instructor/profile')
    return { success: true }
}

export async function deleteCertification(certId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // 1. Get cert to get file path
    const { data: cert } = await supabase
        .from('certifications')
        .select('proof_url')
        .eq('id', certId)
        .eq('instructor_id', user.id)
        .single()

    if (!cert) return { error: 'Certification not found' }

    // 2. Delete from DB
    const { error: dbError } = await supabase
        .from('certifications')
        .delete()
        .eq('id', certId)
        .eq('instructor_id', user.id)

    if (dbError) return { error: 'Failed to delete certification record' }

    // 3. Delete from Storage
    if (cert.proof_url) {
        await supabase.storage
            .from('certifications')
            .remove([cert.proof_url])
    }

    revalidatePath('/instructor/profile')
    return { success: true }
}
