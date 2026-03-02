'use server'

import { createClient } from '@/lib/supabase/server'

export async function findMatchingStudios(
    dateStr: string, // YYYY-MM-DD
    startTimeStr: string, // HH:MM:SS
    endTimeStr: string, // HH:MM:SS
    locationArea: string
) {
    const supabase = await createClient()

    // 1. Construct Timestamp Ranges
    // We want slots that fall between [Date + StartTime] and [Date + EndTime]
    // Actually, usually we want slots that start *at or after* StartTime and end *at or before* EndTime?
    // Or just any overlap?
    // Let's assume strict containment for "Full Matching":
    // The slot must allow the session to happen.
    // Ideally, if the instructor is free 9-12, and a studio has a slot 10-11, that matches.

    // So we search for slots where:
    // slot.start_time >= (Date + StartTime) AND slot.end_time <= (Date + EndTime)

    const normalizedStart = startTimeStr.length === 5 ? startTimeStr + ':00' : startTimeStr
    const normalizedEnd = endTimeStr.length === 5 ? endTimeStr + ':00' : endTimeStr

    const searchStart = new Date(`${dateStr}T${normalizedStart}+08:00`)
    const searchEnd = new Date(`${dateStr}T${normalizedEnd}+08:00`)
    // Add a 1-minute buffer to avoid clipping slots that end precisely at searchEnd
    searchEnd.setMinutes(searchEnd.getMinutes() + 1)

    const searchStartISO = searchStart.toISOString()
    const searchEndISO = searchEnd.toISOString()

    const trimmedLocationArea = locationArea?.trim()

    // 2. Query Slots in Location
    // Fetch without the exact .eq() location filter — PostgREST does exact-string match
    // which fails if DB values have trailing/leading whitespace.
    // We apply a JS-level trim filter below instead.
    const { data: rawSlots, error } = await supabase
        .from('slots')
        .select(`
            *,
            studios!inner (
                id,
                name,
                location,
                hourly_rate,
                pricing
            )
        `)
        .eq('is_available', true)
        .gte('start_time', searchStartISO)
        .lte('end_time', searchEndISO)
        .order('start_time', { ascending: true })

    if (error) {
        console.error('Matching Error:', error)
        return { studios: [] }
    }

    if (!rawSlots || rawSlots.length === 0) return { studios: [] }

    // JS-level trim comparison — handles DB values with stray whitespace
    const slots = rawSlots?.filter((s: any) =>
        (s.studios?.location ?? '').trim().toLowerCase() === trimmedLocationArea.toLowerCase()
    ) || []

    if (slots.length === 0) return { studios: [] }

    // 3. Group by Studio
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
