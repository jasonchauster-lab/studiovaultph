'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { normalizeStudioSlug } from '@/lib/studio/slug'
import { verifyStudioAccess } from '@/lib/studio/auth'
import { uploadContentType } from '@/lib/utils/image-utils'
import { ErrorService } from '@/lib/services/error-service'

import { ServerActionResponse } from './types'

export async function updateStudioWebsite(formData: FormData): Promise<ServerActionResponse> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const studioId = formData.get('studioId') as string
    const { isOwner } = await verifyStudioAccess(studioId)
    if (!isOwner) {
        await ErrorService.logSecurityEvent('Unauthorized website update attempt', { studioId, userId: user.id })
        return { success: false, error: 'Unauthorized' }
    }

    const outletId = formData.get('outletId') as string
    const slug = normalizeStudioSlug(formData.get('slug') as string)
    const websiteConfigJson = formData.get('websiteConfig') as string
    const customDomain = formData.get('customDomain') as string
    
    if (!studioId) return { success: false, error: 'Studio ID is required' }

    let websiteConfig: any = {}
    try {
        websiteConfig = JSON.parse(websiteConfigJson)
        websiteConfig.is_published = true
    } catch (e) {
        return { success: false, error: 'Invalid website configuration' }
    }

    // Asset Cleanup
    const { data: currentOutlet } = outletId 
        ? await supabase.from('outlets').select('website_config, slug').eq('id', outletId).single()
        : { data: null }
    const { data: currentStudio } = await supabase.from('studios').select('website_config, slug').eq('id', studioId).single()
    const oldConfig = (currentOutlet?.website_config || currentStudio?.website_config) as any

    if (oldConfig) {
        const extractImages = (cfg: any) => {
            const stringified = JSON.stringify(cfg)
            const matches = stringified.match(/https:\/\/[^"]+\/studios\/[^"]+\.(jpg|jpeg|png|webp|gif|svg)/g)
            return (matches || []) as string[]
        }
        const oldUrls = extractImages(oldConfig)
        const newUrls = extractImages(websiteConfig)
        const orphanedUrls = oldUrls.filter(url => !newUrls.includes(url) && url.includes(`${studioId}/`))

        if (orphanedUrls.length > 0) {
            const adminSupabase = createAdminClient()
            const pathsToRemove = orphanedUrls.map(url => {
                const pathMatch = url.match(/studios\/(.+)$/)
                return pathMatch ? `studios/${pathMatch[1]}` : null
            }).filter(Boolean) as string[]

            if (pathsToRemove.length > 0) {
                await adminSupabase.storage.from('studios').remove(pathsToRemove)
            }
        }
    }

    const studioUpdate: any = { updated_at: new Date().toISOString(), website_config: websiteConfig }
    if (slug) studioUpdate.slug = slug
    if (customDomain !== undefined) studioUpdate.custom_domain = customDomain || null

    const { error: sUpdateError } = await supabase.from('studios').update(studioUpdate).eq('id', studioId).eq('owner_id', user.id)
    if (sUpdateError) {
        await ErrorService.logServiceError('StudioWebsite', 'updateStudioWebsite (Studio)', sUpdateError, { studioId, studioUpdate })
    }

    if (outletId) {
        const { error: oUpdateError } = await supabase.from('outlets').update({ website_config: websiteConfig, updated_at: new Date().toISOString() }).eq('id', outletId).eq('studio_id', studioId)
        if (oUpdateError) {
            await ErrorService.logServiceError('StudioWebsite', 'updateStudioWebsite (Outlet)', oUpdateError, { outletId, studioId })
        }
    }

    revalidatePath('/studio/website')
    return { success: true }
}

export async function uploadStudioAsset(formData: FormData): Promise<ServerActionResponse> {
    try {
        const studioId = formData.get('studioId') as string
        const file = formData.get('file') as File
        const type = formData.get('type') as string

        if (!studioId || !file || !type) return { success: false, error: 'Missing required data' }

        const { isOwner, user } = await verifyStudioAccess(studioId)
        if (!isOwner) {
            await ErrorService.logSecurityEvent('Unauthorized asset upload attempt', { studioId, userId: user.id })
            return { success: false, error: 'Unauthorized' }
        }

        const adminSupabase = createAdminClient()
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const path = `studios/${studioId}/${type}_${Date.now()}_${cleanName}`

        const { error: uploadErr } = await adminSupabase.storage.from('studios').upload(path, file, {
            contentType: uploadContentType(file),
            upsert: true,
        })

        if (uploadErr) {
            await ErrorService.logServiceError('StudioWebsite', 'uploadStudioAsset', uploadErr, { studioId, path })
            return { success: false, error: `Upload failed: ${uploadErr.message}` }
        }

        const { data: { publicUrl } } = adminSupabase.storage.from('studios').getPublicUrl(path)
        return { success: true, data: { url: publicUrl } }
    } catch (err: any) {
        await ErrorService.logServiceError('StudioWebsite', 'uploadStudioAsset (Critical)', err)
        return { success: false, error: err.message || 'Unknown processing error' }
    }
}
