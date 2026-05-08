import { createAdminClient } from '@/lib/supabase/server'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { normalizeStudioSlug } from './slug'
import { getManilaTodayStr } from '@/lib/timezone'

/**
 * Fetch studio data by slug for the storefront.
 * Uses admin client to bypass RLS for public access.
 */
export const getStudioBySlug = cache(async (slug: string) => {
    const admin = createAdminClient()
    const requestedSlug = (slug || '').trim()
    const normalizedSlug = normalizeStudioSlug(slug)

    if (!requestedSlug && !normalizedSlug) {
        return null
    }

    // Try multiple matching strategies for robustness
    let { data: studio, error } = await admin
        .from('studios')
        .select(`
            id,
            name,
            slug,
            owner_id,
            logo_url,
            banner_url,
            bio,
            whatsapp_number,
            show_whatsapp_button,
            enable_manual_payments,
            manual_payment_instructions,
            website_config,
            subscription_tier,
            subscription_status,
            address,
            enable_xendit,
            service_rates,
            hourly_rate,
            ai_chat_limit,
            ai_chat_usage,
            profiles!owner_id(
                full_name,
                avatar_url,
                origin_portal
            ),
            outlets(
                id,
                name,
                slug,
                address,
                status,
                is_active,
                hero_image_url,
                website_config
            )
        `)
        .eq('slug', requestedSlug)
        .maybeSingle()

    if (error || !studio) {
        // Fallback to normalized slug if direct match fails
        const secondTry = await admin
            .from('studios')
            .select(`
                id,
                name,
                slug,
                owner_id,
                logo_url,
                banner_url,
                bio,
                whatsapp_number,
                show_whatsapp_button,
                enable_manual_payments,
                manual_payment_instructions,
                website_config,
                subscription_tier,
                subscription_status,
                address,
                enable_xendit,
                service_rates,
                hourly_rate,
                ai_chat_limit,
                ai_chat_usage,
                profiles!owner_id(
                    full_name,
                    avatar_url,
                    origin_portal
                ),
                outlets(
                    id,
                    name,
                    slug,
                    address,
                    status,
                    is_active,
                    hero_image_url,
                    website_config
                )
            `)
            .eq('slug', normalizedSlug)
            .maybeSingle()
        
        if (secondTry.data) {
            studio = secondTry.data
        } else {
            // Only log if there's an actual database error, not just a missing studio
            if (error || secondTry.error) {
                console.error('[Storefront] Error fetching studio by slug:', {
                    requestedSlug,
                    normalizedSlug,
                    error: error ? JSON.stringify(error, null, 2) : null,
                    secondTryError: secondTry.error ? JSON.stringify(secondTry.error, null, 2) : null
                })
            }
            return null
        }
    }

    return studio
})

/**
 * Fetch all required data for a studio storefront (slots, instructors, reviews).
 * Optimized to filter by outletId at the DB level and cached via unstable_cache.
 */
export async function getStorefrontData(studioId: string, ownerId: string, outletId?: string) {
    return unstable_cache(
        async () => {
            const admin = createAdminClient()
            
            // Build the slots query with optional outlet filtering
            let slotsQuery = admin.from('slots')
                .select(`
                    id, 
                    outlet_id, 
                    instructor_id, 
                    service_id,
                    date, 
                    start_time, 
                    end_time, 
                    pax_capacity, 
                    waitlist_pax_capacity,
                    display_name,
                    location_name,
                    calendar_color,
                    equipment,
                    service:services!service_id(id, name, difficulty),
                    instructor:profiles!instructor_id(full_name, avatar_url),
                    bookings_count:bookings(count)
                `)
                .eq('studio_id', studioId)
                .eq('is_published', true)
                .gte('date', getManilaTodayStr());

            if (outletId) {
                slotsQuery = slotsQuery.eq('outlet_id', outletId);
            }

            const [
                { data: slots },
                { data: instructors },
                { data: reviews }
            ] = await Promise.all([
                slotsQuery,
                admin.from('profiles')
                    .select('id, full_name, avatar_url, bio, rates, expertise, studio_members!inner(studio_id)')
                    .eq('role', 'instructor')
                    .eq('studio_members.studio_id', studioId)
                    .is('is_suspended', false),
                admin.from('reviews')
                    .select('id, rating, comment, user_name, user_avatar, created_at')
                    .eq('reviewee_id', ownerId)
                    .order('created_at', { ascending: false })
                    .limit(20) // Limit reviews for performance
            ])

            return {
                slots: (slots || []).map((s: any) => ({
                    ...s,
                    bookings_count: s.bookings_count?.[0]?.count || 0
                })),
                instructors: instructors || [],
                reviews: reviews || []
            }
        },
        [`storefront-data-${studioId}-${outletId || 'all'}`],
        {
            revalidate: 60, // Cache for 1 minute
            tags: [`studio-${studioId}`, `storefront-${studioId}`]
        }
    )()
}

/**
 * Fetch all active and published outlets for a studio.
 */
export async function getOutletsForStudio(studioId: string) {
    const admin = createAdminClient()
    const { data: outlets, error } = await admin
        .from('outlets')
        .select('*')
        .eq('studio_id', studioId)
        .eq('is_active', true)
        .eq('status', 'published')
        .order('name', { ascending: true })
    
    if (error) {
        console.error('[Storefront] Error fetching outlets:', error)
        return []
    }

    return outlets || []
}

/**
 * Fetch all studio slugs for static generation.
 */
export async function getAllStudioSlugs() {
    const admin = createAdminClient()
    const { data } = await admin.from('studios').select('slug')
    return data?.map(s => s.slug) || []
}

/**
 * Fetch all branch slugs for all studios for static generation.
 */
export async function getAllBranchSlugs() {
    const admin = createAdminClient()
    const { data } = await admin
        .from('outlets')
        .select(`
            slug,
            studios!inner(slug)
        `)
        .eq('is_active', true)
        .eq('status', 'published')
    
    return data?.map(o => ({
        slug: (o.studios as any).slug,
        branchSlug: o.slug
    })) || []
}

export async function getStorefrontSlot(slotId: string) {
    const admin = createAdminClient()
    const { data: slot, error } = await admin
        .from('slots')
        .select(`
            *,
            service:services!service_id(*),
            instructor:profiles!instructor_id(*),
            studio:studios(*),
            outlet:outlets!outlet_id(*),
            bookings_count:bookings(count)
        `)
        .eq('id', slotId)
        .maybeSingle()
    
    if (error || !slot) {
        console.error('[Storefront] Error fetching slot:', JSON.stringify(error, null, 2))
        return null
    }

    return slot
}
