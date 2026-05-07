import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

export interface StudioBranding {
    id: string
    name: string
    logoUrl?: string
    primaryColor?: string
    fromName: string
}

export const getStudioBranding = cache(async (studioId: string): Promise<StudioBranding | null> => {
    const supabase = await createClient()
    const { data: studio } = await supabase
        .from('studios')
        .select('id, name, logo_url, website_config')
        .eq('id', studioId)
        .single()

    if (!studio) return null

    const config = studio.website_config as any
    const primaryColor = config?.theme?.primaryColor || '#1a1f2c'

    return {
        id: studio.id,
        name: studio.name,
        logoUrl: studio.logo_url || undefined,
        primaryColor,
        fromName: `${studio.name} via StudioVault`
    }
})

export const getStudioBrandingBySlug = cache(async (slug: string): Promise<StudioBranding | null> => {
    const supabase = await createClient()
    const { data: studio } = await supabase
        .from('studios')
        .select('id, name, logo_url, website_config')
        .eq('slug', slug)
        .single()

    if (!studio) return null

    const config = studio.website_config as any
    const primaryColor = config?.theme?.primaryColor || '#1a1f2c'

    return {
        id: studio.id,
        name: studio.name,
        logoUrl: studio.logo_url || undefined,
        primaryColor,
        fromName: `${studio.name} via StudioVault`
    }
})
