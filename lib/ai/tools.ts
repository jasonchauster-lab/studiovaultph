import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

export const aiTools = {
  get_site_analytics: {
    description: 'Retrieves site-specific analytics such as most searched terms or popular classes.',
    parameters: z.object({
      metric: z.enum(['top_searches', 'popular_classes', 'booking_trends']).describe('The specific analytical metric to retrieve.')
    }),
    execute: async ({ metric }: { metric: string }) => {
      console.log(`[AI Tool] Fetching analytics for: ${metric}`)
      if (metric === 'top_searches') return ['pilates for beginners', 'reformer classes', 'manila studios']
      if (metric === 'popular_classes') return ['Sunset Reformer', 'Core Strength Plus']
      return { total_bookings: 154, trend: '+12%' }
    }
  },
  create_support_ticket: {
    description: 'Creates a human support ticket when the AI cannot answer or the user requests human help.',
    parameters: z.object({
      summary: z.string().describe('A brief summary of the user\'s unanswered question.'),
      priority: z.enum(['low', 'medium', 'high']).optional().default('medium').describe('Priority level.')
    }),
    execute: async ({ summary, priority = 'medium' }: any) => {
      console.log(`[AI Tool] Creating ticket with summary: ${summary}`)
      
      const supabase = await createClient()
      const { data } = await supabase.auth.getUser();
    const user = data?.user

      if (!user) {
        return { error: 'User must be authenticated to create a ticket.' }
      }
      
      // 1. Create the Ticket
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
        return { error: 'Failed to create support ticket.' }
      }

      // 2. Add the Summary as the first message
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          ticket_id: ticket.id,
          sender_id: user.id,
          message: `[AI Escalation - ${priority.toUpperCase()}] ${summary}`
        })

      if (messageError) {
        console.error('Error creating initial message:', messageError)
      }

      // 3. Send alert email to admins
      await sendEmail({
        to: 'support@studiovaultph.com',
        subject: `[AI Hand-off] New Support Ticket - ${priority.toUpperCase()}`,
        text: `User ID: ${user.id}\nEmail: ${user.email}\nIssue: ${summary}\nPriority: ${priority}\nTicket Link: https://studiovaultph.com/admin/support/${ticket.id}`
      })

      return { 
        success: true, 
        ticket_id: ticket.id,
        message: "I've created a support ticket for you. Our team will get back to you soon."
      }
    }
  }
}
