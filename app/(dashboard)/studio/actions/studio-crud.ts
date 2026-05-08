'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { getGeocodeAction } from '@/lib/actions/location'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { buildDefaultWebsiteConfig } from '@/lib/studio/default-website-config'
import { normalizeStudioSlug } from '@/lib/studio/slug'
import { verifyStudioAccess } from '@/lib/studio/auth'
import { sanitizeHtml } from '@/lib/utils/security'
import { uploadContentType } from '@/lib/utils/image-utils'

import { ServerActionResponse } from './types'

export async function createStudio(formData: FormData): Promise<ServerActionResponse> {
    try {
        const supabase = await createClient()

        const { data } = await supabase.auth.getUser();
    const user = data?.user
        if (!user) {
            console.error('[createStudio] Authentication failed: No user found')
            return { success: false, error: 'Not authenticated' }
        }

        // Check for existing studio to prevent duplicates
        const { data: existingStudio } = await supabase
            .from('studios')
            .select('id, name')
            .eq('owner_id', user.id)
            .limit(1)

        if (existingStudio && existingStudio.length > 0) {
            return { success: false, error: 'You have already registered a studio.' }
        }

        const name = formData.get('name') as string
        const contactNumber = formData.get('contactNumber') as string
        const dateOfBirth = formData.get('dateOfBirth') as string
        const address = formData.get('address') as string
        const floorOrUnit = formData.get('floorOrUnit') as string
        const googleMapsUrl = formData.get('googleMapsUrl') as string

        let lat = parseFloat(formData.get('lat') as string) || null;
        let lng = parseFloat(formData.get('lng') as string) || null;

        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
            const geoResult = await getGeocodeAction(address);
            if (geoResult?.data?.location) {
                lat = geoResult.data.location.lat;
                lng = geoResult.data.location.lng;
            }
        }

        if ((!lat || !lng) && googleMapsUrl) {
            const { resolveGoogleMapsUrlAction } = await import('@/lib/actions/location');
            const urlResult = await resolveGoogleMapsUrlAction(googleMapsUrl);
            if (urlResult?.data) {
                lat = urlResult.data.lat;
                lng = urlResult.data.lng;
            }
        }

        const headersList = await headers()
        const host = headersList.get('host') || ''
        const isCmaPortal = host.includes('studiovault.co') || host.includes('studiovault.local')
        const slug = normalizeStudioSlug(formData.get('slug') as string)

        const { data: profileFetch } = await supabase
            .from('profiles')
            .select('origin_portal, role')
            .eq('id', user.id)
            .maybeSingle()

        const isCmaUser = isCmaPortal || profileFetch?.origin_portal === 'cms'

        if (isCmaUser) {
            if (profileFetch?.origin_portal === 'marketplace' && (profileFetch.role === 'customer' || profileFetch.role === 'instructor')) {
                return { success: false, error: 'Strict Identity Firewall: Please use a different email address to link your studio account.' }
            }

            if (!name || !contactNumber || !dateOfBirth || !address || !slug) {
                return { success: false, error: 'Please complete all required fields.' }
            }
        }

        // Equipment & Inventory parsing
        const equipment: string[] = []
        const inventory: Record<string, number> = {}
        let reformersCount = 0

        const allKeys = Array.from(formData.keys())
        allKeys.forEach(key => {
            if (['Reformer', 'Cadillac', 'Tower', 'Chair', 'Ladder Barrel', 'Mat'].includes(key)) {
                if (formData.get(key) === 'on') {
                    const qtyVal = parseInt(formData.get(`qty_${key}`) as string)
                    inventory[key] = isNaN(qtyVal) ? 1 : qtyVal
                    if (key === 'Reformer') reformersCount = inventory[key]
                    if (inventory[key] > 0) equipment.push(key)
                }
            }
        })

        const otherEquipment = formData.get('otherEquipment') as string
        if (otherEquipment) {
            otherEquipment.split(',').forEach(item => {
                if (item.trim()) equipment.push(item.trim())
            })
        }

        // Sync Profile data via Admin Client
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const profileUpdate: any = {
            id: user.id,
            full_name: user.user_metadata?.full_name || 'Studio Owner',
            email: user.email,
            contact_number: contactNumber,
            date_of_birth: dateOfBirth,
            origin_portal: isCmaUser ? 'cms' : (profileFetch?.origin_portal || 'marketplace'),
            updated_at: new Date().toISOString()
        }

        await supabaseAdmin.from('profiles').upsert(profileUpdate)

        // Parse pricing
        const pricing: Record<string, number> = {}
        allKeys.forEach(key => {
            if (key.startsWith('price_')) {
                const eq = key.replace('price_', '')
                const val = parseFloat(formData.get(key) as string)
                if (!isNaN(val) && val > 0) pricing[eq] = val
            }
        })

        const defaultWebsiteConfig = buildDefaultWebsiteConfig({ name, address })
        
        const { data: newStudio, error: studioError } = await supabase
            .from('studios')
            .insert({
                owner_id: user.id,
                name,
                is_cma_enabled: isCmaUser,
                verified: isCmaUser,
                address,
                hourly_rate: 0,
                reformers_count: reformersCount,
                equipment,
                contact_number: contactNumber,
                inventory,
                pricing,
                google_maps_url: googleMapsUrl || null,
                floor_or_unit: floorOrUnit || null,
                lat,
                lng,
                amenities: formData.getAll('amenities') as string[],
                slug,
                plan: formData.get('plan') as string || 'starter',
                subscription_tier: formData.get('plan') as string || 'starter',
                subscription_status: 'trial',
                trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                is_public: formData.get('is_public') === 'true',
                marketplace_status: 'inactive',
                waitlist_limit: parseInt(formData.get('waitlistLimit') as string) || 5,
                website_config: defaultWebsiteConfig
            })
            .select('id')
            .single()

        if (studioError) return { success: false, error: `Failed to create studio: ${studioError.message}` }

        // Create Default Outlet
        await supabase.from('outlets').insert({
            studio_id: newStudio.id,
            name: `${name} (Main)`,
            address,
            floor_or_unit: floorOrUnit,
            google_maps_url: googleMapsUrl,
            lat,
            lng,
            equipment,
            inventory,
            reformers_count: reformersCount,
            amenities: formData.getAll('amenities') as string[],
            timezone: 'Asia/Manila'
        })

        revalidatePath('/studio')
        return { success: true, data: { studioId: newStudio.id } }
    } catch (err: any) {
        await ErrorService.logServiceError('StudioCrud', 'createStudio', err)
        return { success: false, error: err.message || 'Unknown processing error' }
    }
}

import { StudioUpdateSchema, STUDIO_TAGS } from '@/lib/studio/schemas'
import { ErrorService } from '@/lib/services/error-service'

export async function updateStudio(formData: FormData): Promise<ServerActionResponse> {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { success: false, error: 'Not authenticated' }

    const studioId = formData.get('studioId') as string
    const { isOwner } = await verifyStudioAccess(studioId)
    if (!isOwner) {
        await ErrorService.logSecurityEvent('Unauthorized studio update attempt', { studioId, userId: user.id })
        return { success: false, error: 'Unauthorized' }
    }

    // 1. DATA VALIDATION (Hardening)
    const rawData = {
        name: formData.get('name') as string,
        address: formData.get('address') as string,
        location: formData.get('location') as string,
        description: formData.get('description') as string,
        bio: formData.get('bio') as string,
        is_public: formData.get('is_public') === 'true',
        waitlist_limit: parseInt(formData.get('waitlistLimit') as string) || 0
    }

    const validation = StudioUpdateSchema.safeParse(rawData)
    if (!validation.success) {
        return { success: false, error: 'Validation failed: ' + validation.error.issues[0].message }
    }

    const data = validation.data

    let lat = parseFloat(formData.get('lat') as string)
    let lng = parseFloat(formData.get('lng') as string)

    // Selective Geocoding
    const { data: currentStudio } = await supabase.from('studios').select('address, location').eq('id', studioId).single()
    if (currentStudio && (currentStudio.address !== data.address || currentStudio.location !== data.location)) {
        const geoResult = await getGeocodeAction(`${data.address}, ${data.location}`);
        if (geoResult?.data?.location) {
            lat = geoResult.data.location.lat;
            lng = geoResult.data.location.lng;
        }
    }

    const inventory: Record<string, number> = {}
    let reformersCount = 0
    const allKeys = Array.from(formData.keys())
    allKeys.forEach(key => {
        if (key.startsWith('qty_')) {
            const eq = key.replace('qty_', '')
            const val = parseInt(formData.get(key) as string)
            if (!isNaN(val) && val >= 0) {
                inventory[eq] = val
                if (eq === 'Reformer') reformersCount = val
            }
        }
    })

    const equipment: string[] = []
    const standardEquip = ['Reformer', 'Cadillac', 'Tower', 'Chair', 'Ladder Barrel', 'Mat']
    standardEquip.forEach(eq => {
        if (formData.get(eq.toLowerCase().replace(' ', '')) === 'on') {
            if (inventory[eq] === undefined || inventory[eq] > 0) equipment.push(eq)
        }
    })

    const pricing: Record<string, number> = {}
    allKeys.forEach(key => {
        if (key.startsWith('price_')) {
            const eq = key.replace('price_', '')
            const val = parseFloat(formData.get(key) as string)
            if (!isNaN(val) && val > 0) pricing[eq] = val
        }
    })

    const adminSupabase = createAdminClient()
    const timestamp = Date.now()

    // Handle Logo/Banner uploads if present
    let logoUrl: string | undefined
    const logoFile = formData.get('logo') as File
    if (logoFile && logoFile.size > 0) {
        const path = `studios/${studioId}/logo_${timestamp}.${logoFile.name.split('.').pop()}`
        const { error } = await adminSupabase.storage.from('studios').upload(path, logoFile, { contentType: uploadContentType(logoFile), upsert: true })
        if (!error) logoUrl = adminSupabase.storage.from('studios').getPublicUrl(path).data.publicUrl
    }

    const updateData: any = {
        ...data,
        description: sanitizeHtml(data.description || ''),
        bio: sanitizeHtml(data.bio || ''),
        equipment,
        inventory,
        pricing,
        reformers_count: reformersCount,
        lat: isNaN(lat) ? null : lat,
        lng: isNaN(lng) ? null : lng,
        marketplace_status: data.is_public ? 'active' : 'inactive',
        updated_at: new Date().toISOString()
    }

    if (logoUrl) updateData.logo_url = logoUrl

    const { error } = await supabase.from('studios').update(updateData).eq('id', studioId).eq('owner_id', user.id)
    if (error) {
        await ErrorService.logServiceError('StudioCrud', 'updateStudio', error, { studioId, updateData })
        return { success: false, error: 'Failed to update studio' }
    }

    revalidatePath('/studio')
    return { success: true }
}

export async function enableCma(studioId: string): Promise<ServerActionResponse> {
    const supabase = await createClient()
    const { isOwner } = await verifyStudioAccess(studioId)
    if (!isOwner) return { success: false, error: 'Unauthorized' }

    const { error } = await supabase.from('studios').update({ is_cma_enabled: true }).eq('id', studioId)
    if (error) return { success: false, error: error.message }

    revalidatePath('/studio/website')
    return { success: true }
}

export async function toggleStudioVisibilityAction(studioId: string, currentStatus: boolean): Promise<ServerActionResponse> {
    const supabase = await createClient()
    const { isOwner } = await verifyStudioAccess(studioId)
    if (!isOwner) return { success: false, error: 'Unauthorized' }

    const newStatus = !currentStatus
    const { error } = await supabase.from('studios').update({ is_public: newStatus, marketplace_status: newStatus ? 'active' : 'inactive' }).eq('id', studioId)
    if (error) return { success: false, error: 'Failed to update visibility' }

    revalidatePath('/studio')
    return { success: true, data: { newStatus } }
}

export async function getStudioDashboardStatsAction(studioId: string, outletId?: string): Promise<ServerActionResponse> {
    await verifyStudioAccess(studioId)

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const weekEnd = now.toISOString().split('T')[0]

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('get_studio_dashboard_stats_v6', {
        p_studio_id: studioId,
        p_last_30_days_date: thirtyDaysAgo,
        p_week_start: weekStart,
        p_week_end: weekEnd,
        p_outlet_id: outletId || null
    })

    if (error) return { success: false, error: `Failed to fetch dashboard stats: ${error.message}` }
    return { success: true, data }
}
