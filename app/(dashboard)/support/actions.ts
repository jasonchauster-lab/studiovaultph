'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTicket(message: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    // 1. Create Ticket
    const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
            user_id: user.id,
            status: 'open'
        })
        .select()
        .single()

    if (ticketError) {
        console.error('Error creating ticket:', ticketError)
        return { error: ticketError.message || 'Failed to start conversation' }
    }

    // 2. Add Initial Message
    const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
            ticket_id: ticket.id,
            sender_id: user.id,
            message: message
        })

    if (messageError) {
        console.error('Error sending message:', messageError)
        return { error: 'Failed to send message' }
    }

    revalidatePath('/support')
    return { success: true, ticketId: ticket.id }
}

export async function sendMessage(ticketId: string, message: string, messageId?: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    const messageData: any = {
        ticket_id: ticketId,
        sender_id: user.id,
        message: message
    };

    if (messageId) {
        messageData.id = messageId;
    }

    const { error } = await supabase
        .from('support_messages')
        .insert(messageData)

    if (error) {
        console.error('Error sending message:', error)
        return { error: 'Failed to send message' }
    }

    // Update ticket timestamp
    await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId)

    revalidatePath('/support')
    return { success: true }
}

export async function resolveTicket(ticketId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('support_tickets')
        .update({ status: 'resolved' })
        .eq('id', ticketId)

    if (error) {
        return { error: 'Failed to resolve ticket' }
    }

    revalidatePath('/admin/support')
    return { success: true }
}

export async function markMessagesAsRead(ticketId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    // Mark messages as read where sender is NOT the current user
    const { error } = await supabase
        .from('support_messages')
        .update({ is_read: true })
        .eq('ticket_id', ticketId)
        .neq('sender_id', user.id)
        .eq('is_read', false)

    if (error) {
        console.error('Error marking messages as read:', error)
        return { error: 'Failed to mark as read' }
    }

    revalidatePath('/admin/support')
    revalidatePath('/support')
    return { success: true }
}
