'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * NOTES ACTIONS
 */

export async function getClientNotes(clientId: string, studioId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('client_notes')
        .select(`
            *,
            author:profiles!author_id(full_name, avatar_url)
        `)
        .eq('client_id', clientId)
        .eq('studio_id', studioId)
        .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
}

export async function addClientNote(formData: {
    clientId: string
    studioId: string
    content: string
    isPrivate?: boolean
}) {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user
    if (!user) throw new Error('Not authenticated')

    const { data: note, error } = await supabase
        .from('client_notes')
        .insert({
            client_id: formData.clientId,
            studio_id: formData.studioId,
            author_id: user.id,
            content: formData.content,
            is_private: formData.isPrivate ?? true
        })
        .select()
        .single()

    if (error) throw error
    revalidatePath(`/studio/customers/${formData.clientId}`)
    return { success: true, data: note }
}

export async function deleteClientNote(noteId: string, clientId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('client_notes')
        .delete()
        .eq('id', noteId)

    if (error) throw error
    revalidatePath(`/studio/customers/${clientId}`)
    return { success: true }
}

/**
 * PROGRESS PHOTO ACTIONS
 */

export async function getClientProgressPhotos(clientId: string, studioId: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('client_progress_photos')
        .select(`
            *,
            author:profiles!author_id(full_name)
        `)
        .eq('client_id', clientId)
        .eq('studio_id', studioId)
        .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
}

export async function addClientProgressPhoto(formData: {
    clientId: string
    studioId: string
    photoUrl: string
    notes?: string
}) {
    const supabase = await createClient()
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user
    if (!user) throw new Error('Not authenticated')

    const { data: photo, error } = await supabase
        .from('client_progress_photos')
        .insert({
            client_id: formData.clientId,
            studio_id: formData.studioId,
            author_id: user.id,
            photo_url: formData.photoUrl,
            notes: formData.notes
        })
        .select()
        .single()

    if (error) throw error
    revalidatePath(`/studio/customers/${formData.clientId}`)
    return { success: true, data: photo }
}

export async function deleteClientProgressPhoto(photoId: string, clientId: string) {
    const supabase = await createClient()
    const { error } = await supabase
        .from('client_progress_photos')
        .delete()
        .eq('id', photoId)

    if (error) throw error
    revalidatePath(`/studio/customers/${clientId}`)
    return { success: true }
}
