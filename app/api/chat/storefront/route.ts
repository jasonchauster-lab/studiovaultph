import { openai } from '@ai-sdk/openai'
import { streamText, convertToModelMessages } from 'ai'
import { createAdminClient } from '@/lib/supabase/server'
import { PricingService } from '@/lib/services/pricing'
import { getStudioBySlug, getStorefrontData } from '@/lib/studio/website'

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { messages = [], studioSlug } = body

    if (!studioSlug) {
      return new Response(JSON.stringify({ error: 'Studio slug is required' }), { status: 400 })
    }

    const supabase = createAdminClient()

    // 1. Fetch Studio Data & Credit Limits
    const studio = await getStudioBySlug(studioSlug)
    if (!studio) {
      return new Response(JSON.stringify({ error: 'Studio not found' }), { status: 404 })
    }

    const limit = studio.ai_chat_limit ?? 50
    const usage = studio.ai_chat_usage ?? 0

    if (usage >= limit) {
      return new Response(
        JSON.stringify({ error: 'Monthly AI message limit reached for this studio.' }), 
        { status: 403 }
      )
    }

    // 2. Fetch Context (Packages, Schedule, Instructors)
    const [pricing, storefront] = await Promise.all([
      PricingService.getPricingData(studio.id),
      getStorefrontData(studio.id, studio.owner_id)
    ])

    // Limit slots to next 72 hours for token efficiency
    const now = new Date()
    const threeDaysLater = new Date(now.getTime() + 72 * 60 * 60 * 1000)
    const upcomingSlots = storefront.slots.filter((s: any) => {
        const slotDate = new Date(s.date)
        return slotDate <= threeDaysLater
    })

    const contextText = `
STUDIO INFO:
Name: ${studio.name}
Bio: ${studio.bio || 'N/A'}
Address: ${studio.address || 'N/A'}

PRICING & PACKAGES:
${pricing.packages.map(p => `- ${p.name}: ₱${p.price} (${p.credits} credits, ${p.validity_value} ${p.validity_unit})`).join('\n')}
${pricing.memberships.map(m => `- ${m.name}: ₱${m.price} (${m.credits} credits/month)`).join('\n')}

INSTRUCTORS:
${storefront.instructors.map(i => `- ${i.full_name}: ${i.expertise || 'General Pilates'}`).join('\n')}

UPCOMING CLASSES (Next 72h):
${upcomingSlots.map((s: any) => `- ${s.display_name || s.service?.name} on ${s.date} at ${s.start_time} with ${s.instructor?.full_name}`).join('\n')}
`.trim()

    // 3. Convert UIMessages to model messages
    const modelMessages = await convertToModelMessages(messages)

    // 4. Stream the response
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: `You are the helpful AI Concierge for ${studio.name}.

# RULES
- Help visitors with questions about classes, pricing, instructors, and studio details.
- ALWAYS use the CONTEXT provided below to answer questions.
- If information is not in the context, politely say you don't have that information and suggest they contact the studio via WhatsApp or their contact page.
- Be professional, warm, and encouraging.
- Keep responses concise and focused on helping the user book or buy.
- Use the studio's name in your welcome message if it's the start of the chat.

# STUDIO CONTEXT
${contextText}`,
      messages: modelMessages,
      onFinish: async () => {
        // Increment usage count on successful finish
        await supabase.rpc('increment_studio_ai_usage', { p_studio_id: studio.id })
      }
    })

    return result.toUIMessageStreamResponse()
  } catch (error: any) {
    console.error('[Storefront Chat API] Error:', error?.message)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
