'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCachedStudio } from '@/lib/studio/data'

export async function getWaiversAction() {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) throw new Error('Unauthorized')

    // 1. Fetch Studio (Memoized)
    const studio = await getCachedStudio()
    if (!studio) throw new Error('Studio not found')

    try {
        const { data, error } = await supabase
            .from('waiver_templates')
            .select('*')
            .eq('studio_id', studio.id)
            .order('created_at', { ascending: false })

        if (error) {
            console.warn('Waiver templates query failed (table may not exist):', error.message)
            return []
        }

        // Transform data to match UI expectations
        return (data || []).map(w => ({
            id: w.id,
            title: w.title,
            content: w.content,
            status: w.status,
            last_updated: w.updated_at,
            updated_by: 'System'
        }))
    } catch (err) {
        console.warn('Error fetching waivers:', err)
        return []
    }
}

export async function upsertWaiverAction(formData: {
    id?: string
    title: string
    content: string
    status?: string
}) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) throw new Error('Unauthorized')

    // 1. Fetch Studio (Memoized)
    const studio = await getCachedStudio()
    if (!studio) throw new Error('Studio not found')

    let error;
    if (formData.id) {
        // Update
        const { error: updateError } = await supabase
            .from('waiver_templates')
            .update({
                title: formData.title,
                content: formData.content,
                status: formData.status,
                updated_by: user.id
            })
            .eq('id', formData.id)
            .eq('studio_id', studio.id)
        error = updateError
    } else {
        // Create
        const { error: insertError } = await supabase
            .from('waiver_templates')
            .insert({
                studio_id: studio.id,
                title: formData.title,
                content: formData.content,
                status: formData.status || 'Active',
                updated_by: user.id
            })
        error = insertError
    }

    if (error) {
        console.error('Error upserting waiver:', error)
        throw new Error('Failed to save waiver form')
    }

    revalidatePath('/studio/settings/waiver-form')
    revalidatePath('/studio/online-store/waiver-form')
    return { success: true }
}

export async function deleteWaiverAction(id: string) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user

    if (!user) throw new Error('Unauthorized')

    const { error } = await supabase
        .from('waiver_templates')
        .delete()
        .eq('id', id)
        .eq('updated_by', user.id) // Simple check, ideally check studio_id

    if (error) {
        console.error('Error deleting waiver:', error)
        throw new Error('Failed to delete waiver form')
    }

    revalidatePath('/studio/settings/waiver-form')
    revalidatePath('/studio/online-store/waiver-form')
    return { success: true }
}
