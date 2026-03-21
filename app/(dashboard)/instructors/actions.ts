'use server'

import { createClient } from '@/lib/supabase/server'
import { normalizeTimeTo24h } from '@/lib/timezone'
import { getPublicReviews } from '@/app/(dashboard)/reviews/actions'
import { calculateDistance } from '@/lib/utils/location'

export async function getInstructorProfile(instructorId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const [profileRes, certsRes] = await Promise.all([
        supabase
            .from('profiles')
            .select('id, full_name, avatar_url, bio, instagram_handle, gallery_images, rates, teaching_equipment')
            .eq('id', instructorId)
            .maybeSingle(),
        supabase
            .from('certifications')
            .select('certification_name, certification_body, verified')
            .eq('instructor_id', instructorId)
            .eq('verified', true)
    ])

    const { reviews, averageRating, totalCount } = await getPublicReviews(instructorId, user?.id)

    return {
        instructor: profileRes.data,
        certifications: certsRes.data || [],
        reviews,
        averageRating,
        totalCount
    }
}

export async function getStudioProfile(studioId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: studio } = await supabase
        .from('studios')
        .select('id, name, bio, logo_url, location, address, verified, owner_id, space_photos_urls')
        .eq('id', studioId)
        .maybeSingle()

    if (!studio) return { studio: null, reviews: [], averageRating: 0, totalCount: 0 }

    const { reviews, averageRating, totalCount } = await getPublicReviews(studio.owner_id, user?.id)

    return { studio, reviews, averageRating, totalCount }
}

export async function findMatchingStudios(
    dateStr: string, // YYYY-MM-DD
    startTimeStr: string, // any time format
    endTimeStr: string    // any time format
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { studios: [] }

    // 1. Get Instructor Profile for Radius Logic
    const { data: profile } = await supabase
        .from('profiles')
        .select('home_base_lat, home_base_lng, max_travel_km')
        .eq('id', user.id)
        .single()

    const hasRadiusInfo = profile?.home_base_lat && profile?.home_base_lng

    // Normalize to HH:mm:ss
    const normalizedStart = normalizeTimeTo24h(startTimeStr)
    const normalizedEnd = normalizeTimeTo24h(endTimeStr)

    // Query Slots in Location
    const { data: rawSlots, error } = await supabase
        .from('slots')
        .select(`
            *,
            studios!inner (
                id,
                name,
                location,
                address,
                lat,
                lng,
                hourly_rate,
                pricing
            )
        `)
        .eq('is_available', true)
        .eq('date', dateStr)
        .gte('start_time', normalizedStart)
        .lte('end_time', normalizedEnd)
        .order('start_time', { ascending: true })

    if (error) {
        console.error('Matching Error:', error)
        return { studios: [] }
    }

    if (!rawSlots || rawSlots.length === 0) return { studios: [] }

    // 3. Filter by Distance Radius (If instructor has it set)
    const slots = rawSlots?.filter((s: any) => {
        const studio = s.studios
        if (!hasRadiusInfo) return true // Show all if instructor hasn't set home base yet (backward compatible)
        
        if (!studio.lat || !studio.lng) return false // Hide studios without coords if radius is active
        
        const dist = calculateDistance(
            Number(profile.home_base_lat),
            Number(profile.home_base_lng),
            Number(studio.lat),
            Number(studio.lng)
        )
        
        return dist <= (profile.max_travel_km || 10)
    }) || []

    if (slots.length === 0) return { studios: [] }

    // Group by Studio
    const studioMap = new Map()

    slots.forEach((slot: any) => {
        const studioId = slot.studios.id
        if (!studioMap.has(studioId)) {
            studioMap.set(studioId, {
                studio: slot.studios,
                matchingSlots: []
            })
        }
        studioMap.get(studioId).matchingSlots.push(slot)
    })

    return { studios: Array.from(studioMap.values()) }
}
