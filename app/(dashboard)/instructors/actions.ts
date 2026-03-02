'use server'

import { createClient } from '@/lib/supabase/server'
import { normalizeTimeTo24h } from '@/lib/timezone'

export async function findMatchingStudios(
    dateStr: string, // YYYY-MM-DD
    startTimeStr: string, // any time format
    endTimeStr: string,   // any time format
    locationArea: string
) {
    const supabase = await createClient()

    // Normalize to HH:mm:ss — handles 12h ("3:00 PM"), HH:mm ("15:00"), and HH:mm:ss
    const normalizedStart = normalizeTimeTo24h(startTimeStr)
    const normalizedEnd = normalizeTimeTo24h(endTimeStr)

    const trimmedLocationArea = locationArea?.trim()

    // Query Slots in Location
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
        .eq('date', dateStr)
        .gte('start_time', normalizedStart)
        .lte('end_time', normalizedEnd)
        .order('start_time', { ascending: true })

    if (error) {
        console.error('Matching Error:', error)
        return { studios: [] }
    }

    if (!rawSlots || rawSlots.length === 0) return { studios: [] }

    // JS-level trim + case-insensitive comparison — handles DB values with stray whitespace or casing
    const slots = rawSlots?.filter((s: any) => {
        const dbLoc = (s.studios?.location ?? '').trim().toLowerCase()
        const searchLoc = trimmedLocationArea.toLowerCase()
        return dbLoc === searchLoc || dbLoc.startsWith(searchLoc + ' - ') || searchLoc.startsWith(dbLoc + ' - ')
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
