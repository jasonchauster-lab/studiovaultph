'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { uploadContentType } from '@/lib/utils/image-utils'
import { revalidatePath } from 'next/cache'
import { getGeocodeAction } from '@/lib/actions/location'

export async function createStudio(formData: FormData) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Not authenticated' }

        // Check for existing studio to prevent duplicates
        const { data: existingStudio } = await supabase
            .from('studios')
            .select('id')
            .eq('owner_id', user.id)
            .limit(1)

        if (existingStudio && existingStudio.length > 0) {
            return { error: 'You have already registered a studio.' }
        }

        const name = formData.get('name') as string
        const location = formData.get('location') as string
        const contactNumber = formData.get('contactNumber') as string
        const dateOfBirth = formData.get('dateOfBirth') as string
        const address = formData.get('address') as string
        const floorOrUnit = formData.get('floorOrUnit') as string
        const googleMapsUrl = formData.get('googleMapsUrl') as string

        // Use client-side lat/lng if available, otherwise geocode
        let lat = parseFloat(formData.get('lat') as string) || null;
        let lng = parseFloat(formData.get('lng') as string) || null;

        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            // Auto-geocode from address + location
            const geoResult = await getGeocodeAction(`${address}, ${location}`);
            if (geoResult?.data?.location) {
                lat = geoResult.data.location.lat;
                lng = geoResult.data.location.lng;
            }
        }

        // Final fallback: resolve from Google Maps URL
        if ((!lat || !lng) && googleMapsUrl) {
            const { resolveGoogleMapsUrlAction } = await import('@/lib/actions/location');
            const urlResult = await resolveGoogleMapsUrlAction(googleMapsUrl);
            if (urlResult?.data) {
                lat = urlResult.data.lat;
                lng = urlResult.data.lng;
            }
        }

        const birPath = formData.get('birCertificateUrl') as string
        const govIdPath = formData.get('govIdUrl') as string
        const insurancePath = formData.get('insuranceUrl') as string
        const spacePhotosUrls = formData.getAll('spacePhotosUrls') as string[]

        const birExpiry = null // No longer required
        const govIdExpiry = formData.get('govIdExpiry') as string
        const insuranceExpiry = formData.get('insuranceExpiry') as string

        if (!name || !location || !contactNumber || !dateOfBirth || !address || !googleMapsUrl || !birPath || !govIdPath || spacePhotosUrls.length === 0) {
            return { error: 'All fields and documents are required (including Google Maps Link)' }
        }


        // Parse equipment & inventory
        const equipment: string[] = []
        const inventory: Record<string, number> = {}
        let reformersCount = 0

        const allKeys = Array.from(formData.keys())

        // Support new generic checkbox names from onboarding
        allKeys.forEach(key => {
            // Check if it's one of the equipment checkboxes (Reformer, Cadillac, etc)
            if (['Reformer', 'Cadillac', 'Tower', 'Chair', 'Ladder Barrel', 'Mat'].includes(key)) {
                if (formData.get(key) === 'on') {
                    // Get its quantity
                    const qtyVal = parseInt(formData.get(`qty_${key}`) as string)

                    if (!isNaN(qtyVal) && qtyVal >= 0) {
                        inventory[key] = qtyVal
                        if (key === 'Reformer') {
                            reformersCount = qtyVal
                        }
                    } else {
                        // Default to 1 if checked but no qty provided
                        inventory[key] = 1
                        if (key === 'Reformer') {
                            reformersCount = 1
                        }
                    }

                    // ONLY add to equipment array if qty > 0
                    if (inventory[key] > 0) {
                        equipment.push(key)
                    }
                }
            }
        })

        const otherEquipment = formData.get('otherEquipment') as string
        if (otherEquipment) {
            otherEquipment.split(',').forEach(item => {
                if (item.trim()) equipment.push(item.trim())
            })
        }


        // 1. Fetch current profile role to prevent role escalation or downgrade
        const { data: currentProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
        const existingRole = currentProfile?.role
        // Only upgrade 'customer' to 'studio'. Protect 'admin' and 'instructor'.
        // If they are an instructor, they should keep the instructor role (since instructors can own studios too)
        const newRole = (existingRole === 'admin' || existingRole === 'instructor' || existingRole === 'studio')
            ? existingRole
            : 'studio'

        // 2. Ensure profile exists (to satisfy FK constraint)
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: user.id, // Ensure id is set for upsert
                full_name: user.user_metadata?.full_name || 'Studio Owner',
                email: user.email, // Required by profiles schema
                role: newRole,
                contact_number: contactNumber,
                date_of_birth: dateOfBirth,
                updated_at: new Date().toISOString()
            })
            .select()

        if (profileError) {
            console.error('Error ensuring profile exists:', profileError)
            return { error: 'Failed to initialize studio profile: ' + profileError.message }
        }

        // Sync role to Auth metadata for middleware performance
        await supabase.auth.updateUser({
            data: { role: newRole }
        })

        // Parse pricing
        const pricing: Record<string, number> = {}
        allKeys.forEach(key => {
            if (key.startsWith('price_')) {
                const eq = key.replace('price_', '')
                const val = parseFloat(formData.get(key) as string)
                if (!isNaN(val) && val > 0) {
                    pricing[eq] = val
                }
            }
        })

        const { error } = await supabase
            .from('studios')
            .insert({
                owner_id: user.id,
                name,
                location,
                address,
                hourly_rate: 0,
                reformers_count: reformersCount,
                equipment: equipment,
                contact_number: contactNumber,
                bir_certificate_url: birPath,
                gov_id_url: govIdPath,
                insurance_url: insurancePath,
                bir_certificate_expiry: birExpiry || null,
                gov_id_expiry: govIdExpiry || null,
                insurance_expiry: insuranceExpiry || null,
                space_photos_urls: spacePhotosUrls,
                inventory: inventory,
                pricing: pricing,
                google_maps_url: googleMapsUrl || null,
                floor_or_unit: floorOrUnit || null,
                lat: lat,
                lng: lng,
                amenities: formData.getAll('amenities') as string[]
            })


        if (error) {
            console.error('Error creating studio:', error)
            return { error: `Failed to create studio: ${error.message} (Code: ${error.code})` }
        }

        revalidatePath('/studio')
        return { success: true }
    } catch (err: any) {
        console.error('CRITICAL ERROR inside createStudio:', err)
        return { error: `Server exception: ${err.message || 'Unknown processing error'}` }
    }
}

export async function updateStudio(formData: FormData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const studioId = formData.get('studioId') as string
    const name = formData.get('name') as string
    const location = formData.get('location') as string
    const contactNumber = formData.get('contactNumber') as string
    const address = formData.get('address') as string
    const floorOrUnit = formData.get('floorOrUnit') as string
    const description = formData.get('description') as string
    let lat = parseFloat(formData.get('lat') as string)
    let lng = parseFloat(formData.get('lng') as string)

    // Check if address changed to trigger re-geocoding
    const { data: currentStudio } = await supabase.from('studios').select('address, location').eq('id', studioId).single()
    if (currentStudio && (currentStudio.address !== address || currentStudio.location !== location)) {
        const geoResult = await getGeocodeAction(`${address}, ${location}`);
        if (geoResult?.data?.location) {
            lat = geoResult.data.location.lat;
            lng = geoResult.data.location.lng;
        }
    }

    // Fallback: resolve from Google Maps URL if coordinates are still missing
    const googleMapsUrlRaw = formData.get('googleMapsUrl') as string
    if ((isNaN(lat) || isNaN(lng)) && googleMapsUrlRaw) {
        const { resolveGoogleMapsUrlAction } = await import('@/lib/actions/location');
        const urlResult = await resolveGoogleMapsUrlAction(googleMapsUrlRaw);
        if (urlResult?.data) {
            lat = urlResult.data.lat;
            lng = urlResult.data.lng;
        }
    }

    // Parse equipment
    const inventory: Record<string, number> = {}
    let reformersCount = 0

    const allKeys = Array.from(formData.keys())
    allKeys.forEach(key => {
        if (key.startsWith('qty_')) {
            const eq = key.replace('qty_', '')
            const val = parseInt(formData.get(key) as string)
            if (!isNaN(val) && val >= 0) {
                inventory[eq] = val
                if (eq === 'Reformer') {
                    reformersCount = val
                }
            }
        }
    })

    const equipment: string[] = []

    if (formData.get('reformer') === 'on' && (inventory['Reformer'] === undefined || inventory['Reformer'] > 0)) equipment.push('Reformer')
    if (formData.get('cadillac') === 'on' && (inventory['Cadillac'] === undefined || inventory['Cadillac'] > 0)) equipment.push('Cadillac')
    if (formData.get('tower') === 'on' && (inventory['Tower'] === undefined || inventory['Tower'] > 0)) equipment.push('Tower')
    if (formData.get('chair') === 'on' && (inventory['Chair'] === undefined || inventory['Chair'] > 0)) equipment.push('Chair')
    if (formData.get('ladderBarrel') === 'on' && (inventory['Ladder Barrel'] === undefined || inventory['Ladder Barrel'] > 0)) equipment.push('Ladder Barrel')
    if (formData.get('mat') === 'on' && (inventory['Mat'] === undefined || inventory['Mat'] > 0)) equipment.push('Mat')

    allKeys.forEach(key => {
        if (key.startsWith('eq_') && formData.get(key) === 'on') {
            const eqName = key.replace('eq_', '')
            if (!equipment.includes(eqName)) {
                if (inventory[eqName] === undefined || inventory[eqName] > 0) {
                    equipment.push(eqName)
                }
            }
        }
    })

    const otherEquipment = formData.get('otherEquipment') as string
    if (otherEquipment) {
        otherEquipment.split(',').forEach(item => {
            if (item.trim()) equipment.push(item.trim())
        })
    }

    const pricing: Record<string, number> = {}
    allKeys.forEach(key => {
        if (key.startsWith('price_')) {
            const eq = key.replace('price_', '')
            const val = parseFloat(formData.get(key) as string)
            if (!isNaN(val) && val > 0) {
                pricing[eq] = val
            }
        }
    })

    if (!studioId || !name || !location || !contactNumber || !address || !formData.get('googleMapsUrl')) {
        return { error: 'All fields are required (including Display Address and Google Maps Link)' }
    }

    const adminSupabase = createAdminClient()
    const timestamp = Date.now()

    let newLogoUrl: string | null = null
    const logoFile = formData.get('logo') as File
    if (logoFile && logoFile.size > 0) {
        const ext = logoFile.name.split('.').pop() || 'jpg'
        const path = `studios/${studioId}/logo_${timestamp}.${ext}`
        const { error: logoErr } = await adminSupabase.storage.from('avatars').upload(path, logoFile, {
            contentType: uploadContentType(logoFile),
            upsert: true,
        })
        if (!logoErr) {
            const { data: { publicUrl } } = adminSupabase.storage.from('avatars').getPublicUrl(path)
            newLogoUrl = publicUrl
        } else {
            console.error('Logo upload error:', logoErr)
            return { error: `Logo upload failed: ${logoErr.message}` }
        }
    }

    let newBannerUrl: string | null = null
    const bannerFile = formData.get('banner') as File
    if (bannerFile && bannerFile.size > 0) {
        const ext = bannerFile.name.split('.').pop() || 'jpg'
        const path = `studios/${studioId}/banner_${timestamp}.${ext}`
        const { error: bannerErr } = await adminSupabase.storage.from('avatars').upload(path, bannerFile, {
            contentType: uploadContentType(bannerFile),
            upsert: true,
        })
        if (!bannerErr) {
            const { data: { publicUrl } } = adminSupabase.storage.from('avatars').getPublicUrl(path)
            newBannerUrl = publicUrl
        } else {
            console.error('Banner upload error:', bannerErr)
            return { error: `Banner upload failed: ${bannerErr.message}` }
        }
    }

    const existingPhotosJson = formData.get('existingPhotos') as string
    const existingPhotos: string[] = existingPhotosJson ? JSON.parse(existingPhotosJson) : []
    const newPhotoFiles = formData.getAll('newSpacePhoto') as File[]
    const additionalPhotoUrls: string[] = []

    for (let i = 0; i < newPhotoFiles.length; i++) {
        const file = newPhotoFiles[i]
        if (!file || file.size === 0) continue
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `studios/${studioId}/space_${timestamp}_${i}.${ext}`
        const { error: photoErr } = await adminSupabase.storage.from('avatars').upload(path, file, {
            contentType: uploadContentType(file),
            upsert: true,
        })
        if (!photoErr) {
            const { data: { publicUrl } } = adminSupabase.storage.from('avatars').getPublicUrl(path)
            additionalPhotoUrls.push(publicUrl)
        } else {
            console.error('Space photo upload error:', photoErr)
            return { error: `Photo upload failed: ${photoErr.message}` }
        }
    }

    const updateData: any = {
        name,
        location,
        address,
        description,
        bio: formData.get('bio') as string,
        equipment: equipment,
        contact_number: contactNumber,
        reformers_count: reformersCount,
        pricing: pricing,
        inventory: inventory,
        google_maps_url: formData.get('googleMapsUrl') as string || null,
        floor_or_unit: floorOrUnit || null,
        amenities: formData.getAll('amenities') as string[],
        lat: isNaN(lat) ? null : lat,
        lng: isNaN(lng) ? null : lng
    }

    if (newLogoUrl) {
        updateData.logo_url = newLogoUrl
    }

    if (newBannerUrl) {
        updateData.banner_url = newBannerUrl
    }

    updateData.space_photos_urls = [...existingPhotos, ...additionalPhotoUrls]

    const { error } = await supabase
        .from('studios')
        .update(updateData)
        .eq('id', studioId)
        .eq('owner_id', user.id)

    if (error) {
        console.error('Error updating studio:', error)
        return { error: 'Failed to update studio' }
    }

    revalidatePath('/studio')
    return { success: true }
}
