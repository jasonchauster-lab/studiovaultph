'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { uploadContentType } from '@/lib/utils/image-utils'

export async function updateProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const fullName = formData.get('fullName') as string
    const instagram = formData.get('instagram') as string
    const contactNumber = formData.get('contactNumber') as string
    const emergencyContactName = formData.get('emergencyContactName') as string
    const emergencyContactPhone = formData.get('emergencyContactPhone') as string
    const bio = formData.get('bio') as string
    const birthday = formData.get('birthday') as string
    const email = formData.get('email') as string
    const avatarFile = formData.get('avatar') as File
    const bannerFile = formData.get('banner') as File
    const otherMedicalCondition = formData.get('otherMedicalCondition') as string

    // Extract all values for teaching_equipment (checkboxes)
    const teachingEquipment = formData.getAll('teaching_equipment') as string[]
    // Extract all values for medical_conditions (checkboxes)
    const medicalConditions = formData.getAll('medical_conditions') as string[]

    const updates: any = {
        full_name: fullName,
        instagram_handle: instagram,
        contact_number: contactNumber,
        emergency_contact_name: emergencyContactName,
        emergency_contact_phone: emergencyContactPhone,
        bio: bio,
        date_of_birth: birthday || null,
        teaching_equipment: teachingEquipment, // Save array
        medical_conditions: medicalConditions, // Save medical conditions
        other_medical_condition: otherMedicalCondition, // Save other medical conditions
        rates: {} // Initialize
    }

    // Parse rates
    const rates: Record<string, number> = {}
    Array.from(formData.keys()).forEach(key => {
        if (key.startsWith('rate_')) {
            const eq = key.replace('rate_', '')
            const val = parseFloat(formData.get(key) as string)
            if (!isNaN(val) && val > 0) {
                rates[eq] = val
            }
        }
    })
    updates.rates = rates

    const adminSupabase = createAdminClient()

    // Handle Avatar Upload
    if (avatarFile && avatarFile.size > 0) {
        const fileExt = avatarFile.name.split('.').pop() || 'jpg'
        const filePath = `${user.id}/avatar_${Date.now()}.${fileExt}`

        const { error: uploadError } = await adminSupabase.storage
            .from('avatars')
            .upload(filePath, avatarFile, { contentType: uploadContentType(avatarFile), upsert: true })

        if (uploadError) {
            console.error('Avatar upload error:', uploadError)
            return { error: `Avatar upload failed: ${uploadError.message}` }
        }

        // Get Public URL
        const { data: { publicUrl } } = adminSupabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        updates.avatar_url = publicUrl
    }

    // Handle Banner Upload
    if (bannerFile && bannerFile.size > 0) {
        const fileExt = bannerFile.name.split('.').pop() || 'jpg'
        const filePath = `${user.id}/banner_${Date.now()}.${fileExt}`

        const { error: uploadError } = await adminSupabase.storage
            .from('avatars')
            .upload(filePath, bannerFile, { contentType: uploadContentType(bannerFile), upsert: true })

        if (uploadError) {
            console.error('Banner upload error:', uploadError)
            return { error: `Banner upload failed: ${uploadError.message}` }
        }

        // Get Public URL
        const { data: { publicUrl } } = adminSupabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        updates.banner_url = publicUrl
    }

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

    if (error) {
        console.error('Profile update error:', error)
        return { error: error.message }
    }

    // Handle Email Update
    if (email && email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email })
        if (emailError) {
            console.error('Email update error:', emailError)
            return { error: 'Failed to update email: ' + emailError.message }
        }
        // If successful, Supabase usually returns a "newEmail" field in the user object
        // but we'll show a message to the user regardless.
        revalidatePath('/customer/profile')
        revalidatePath('/instructor/profile')
        return { success: true, emailChangePending: true }
    }

    revalidatePath('/customer/profile')
    revalidatePath('/instructor/profile')
    return { success: true }
}

export async function uploadWaiver(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const file = formData.get('file') as File
    if (!file) return { error: 'No file' }

    const fileExt = file.name.split('.').pop()
    const filePath = `${user.id}/waiver_${Date.now()}.${fileExt}`

    // 1. Upload to Storage
    const { error: uploadError } = await supabase
        .storage
        .from('waivers')
        .upload(filePath, file)

    if (uploadError) {
        console.error('Upload error:', uploadError)
        return { error: 'Upload failed' }
    }

    // 2. Generate a short-lived signed URL for immediate preview (1 hour)
    const { data: signedData } = await supabase
        .storage
        .from('waivers')
        .createSignedUrl(filePath, 3600)

    if (!signedData) return { error: 'Sign failed' }

    // 3. Update Profile with the PATH and TIMESTAMP
    const { error: profileError } = await supabase
        .from('profiles')
        .update({
            waiver_url: filePath,
            waiver_signed_at: new Date().toISOString()
        }) // Store the path and the signature timestamp
        .eq('id', user.id)

    if (profileError) return { error: 'Profile update failed' }

    revalidatePath('/customer/profile')
    return { success: true, url: signedData.signedUrl, path: filePath }
}

export async function uploadGalleryImage(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const file = formData.get('file') as File
    if (!file || file.size === 0) return { error: 'No file' }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filePath = `${user.id}/gallery_${Date.now()}.${fileExt}`

    // 1. Upload to Storage using admin client to bypass RLS
    const adminSupabase = createAdminClient()
    const result = await adminSupabase.storage
        .from('avatars')
        .upload(filePath, file, { contentType: uploadContentType(file), upsert: false })

    if (result.error) {
        console.error('Gallery upload error:', result.error)
        return { error: `Upload failed: ${result.error.message}` }
    }

    // 2. Get Public URL
    const { data: { publicUrl } } = adminSupabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

    // 3. Update Profile (Append to gallery_images array)
    // We use array_append in Postgres
    const { error: profileError } = await supabase.rpc('append_gallery_image', {
        user_id: user.id,
        image_url: publicUrl
    })

    // If RPC doesn't exist yet, we'll try a standard update (fetch then update)
    if (profileError) {
        console.warn('RPC append_gallery_image failed, falling back to manual update', profileError)
        const { data: profile } = await supabase
            .from('profiles')
            .select('gallery_images')
            .eq('id', user.id)
            .single()

        const newGallery = [...(profile?.gallery_images || []), publicUrl]

        await supabase
            .from('profiles')
            .update({ gallery_images: newGallery })
            .eq('id', user.id)
    }

    revalidatePath('/instructor/profile')
    revalidatePath('/customer/profile')
    return { success: true, url: publicUrl }
}

export async function deleteGalleryImage(imageUrl: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    // 1. Get current gallery
    const { data: profile } = await supabase
        .from('profiles')
        .select('gallery_images')
        .eq('id', user.id)
        .single()

    if (!profile) return { error: 'Profile not found' }

    const newGallery = (profile.gallery_images || []).filter((img: string) => img !== imageUrl)

    // 2. Update DB
    const { error: dbError } = await supabase
        .from('profiles')
        .update({ gallery_images: newGallery })
        .eq('id', user.id)

    if (dbError) return { error: 'Failed to update database' }

    // 3. Optional: Delete from storage
    // Extract path from URL (assuming standard Supabase storage URL)
    try {
        const path = imageUrl.split('/avatars/')[1]
        if (path) {
            await supabase.storage.from('avatars').remove([path])
        }
    } catch (e) {
        console.error('Failed to remove file from storage:', e)
    }

    revalidatePath('/instructor/profile')
    revalidatePath('/customer/profile')
    return { success: true }
}

