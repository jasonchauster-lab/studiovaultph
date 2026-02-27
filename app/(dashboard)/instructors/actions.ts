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

    const searchStart = new Date(`${dateStr}T${startTimeStr}+08:00`)
    const searchEnd = new Date(`${dateStr}T${endTimeStr}+08:00`)

    // 2. Query Slots in Location
    // We join studios to filter by location
    const { data: slots, error } = await supabase
        .from('slots')
        .select(`
            *,
            studios!inner (
                id,
                name,
                location,
                hourly_rate
            )
        `)
        .eq('is_available', true)
        .eq('studios.location', locationArea) // Assumes exact match on location area text
        .gte('start_time', searchStart.toISOString())
        .lte('end_time', searchEnd.toISOString())
        .order('start_time', { ascending: true })

    if (error) {
        console.error('Matching Error:', error)
        return { studios: [] }
    }

    if (!slots || slots.length === 0) return { studios: [] }

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
