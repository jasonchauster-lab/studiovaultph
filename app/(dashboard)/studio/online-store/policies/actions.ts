'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function upsertPolicyAction(formData: {
    id?: string
    studioId: string
    title: string
    content: string
    type: string
    status?: string
}) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Unauthorized' }

    try {
        if (formData.id) {
            // Update
            const { error } = await supabase
                .from('studio_policies')
                .update({
                    title: formData.title,
                    content: formData.content,
                    type: formData.type,
                    status: formData.status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', formData.id)
                .eq('studio_id', formData.studioId)

            if (error) {
                console.error('Error updating policy:', error)
                return { error: 'Failed to update policy' }
            }
        } else {
            // Create
            const { error } = await supabase
                .from('studio_policies')
                .insert({
                    studio_id: formData.studioId,
                    title: formData.title,
                    content: formData.content,
                    type: formData.type,
                    status: formData.status || 'Active',
                })

            if (error) {
                console.error('Error creating policy:', error)
                return { error: 'Failed to create policy. The studio_policies table may not exist yet.' }
            }
        }
    } catch (err) {
        console.error('Policy upsert exception:', err)
        return { error: 'An unexpected error occurred' }
    }

    revalidatePath('/studio/online-store/policies')
    return { success: true }
}

export async function deletePolicyAction(id: string, studioId: string) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Unauthorized' }

    try {
        const { error } = await supabase
            .from('studio_policies')
            .delete()
            .eq('id', id)
            .eq('studio_id', studioId)

        if (error) {
            console.error('Error deleting policy:', error)
            return { error: 'Failed to delete policy' }
        }
    } catch (err) {
        return { error: 'An unexpected error occurred' }
    }

    revalidatePath('/studio/online-store/policies')
    return { success: true }
}

export async function updateCancellationRulesAction(
    studioId: string, 
    lateCancelHours: number, 
    noShowPenalty: boolean
) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser();
    const user = data?.user
    if (!user) return { error: 'Unauthorized' }

    const { error } = await supabase
        .from('studios')
        .update({ 
            late_cancel_hours: lateCancelHours,
            no_show_penalty: noShowPenalty 
        })
        .eq('id', studioId)
        .eq('owner_id', user.id)

    if (error) {
        console.error('Error updating cancellation rules:', error)
        return { error: `Failed to save: ${error.message}` }
    }

    revalidatePath('/studio/online-store/policies')
    return { success: true }
}
