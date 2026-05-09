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

    // 0. Input Validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages are required' }), { status: 400 })
    }

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

    // Limit slots to next 7 days for better schedule coverage
    const now = new Date()
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const upcomingSlots = storefront.slots.filter((s: any) => {
        const slotDate = new Date(s.date)
        return slotDate <= sevenDaysLater
    })

    const contextText = `
STUDIO INFO:
Name: ${studio.name}
Bio: ${studio.bio || 'N/A'}
Address: ${studio.address || 'N/A'}

PRICING & PACKAGES:
${pricing.packages.map(p => `- ${p.name}: ₱${p.price} (${p.credits} credits, ${p.validity_value} ${p.validity_unit})${p.description ? `. Description: ${p.description}` : ''}`).join('\n')}
${pricing.memberships.map(m => `- ${m.name}: ₱${m.price} (${m.credits} credits/month)${m.description ? `. Description: ${m.description}` : ''}`).join('\n')}

INSTRUCTORS:
${storefront.instructors.map(i => `- ${i.full_name}: ${i.expertise || 'General Pilates'}`).join('\n')}

UPCOMING CLASSES (Next 7 Days):
${upcomingSlots.map((s: any) => `- ${s.display_name || s.service?.name} on ${s.date} at ${s.start_time} with ${s.instructor?.full_name}`).join('\n')}
`.trim()

    // 3. Convert UIMessages to model messages
    const modelMessages = await convertToModelMessages(messages)

    // 4. Stream the response
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: `You are the helpful AI Concierge for ${studio.name}.

# SCOPE & RULES
- Your ONLY goal is to help visitors with questions about this specific studio: classes, pricing, instructors, and studio details.
- STRICTLY ONLY answer questions based on the CONTEXT provided below.
- If a user asks something NOT related to the studio or its website (e.g., general knowledge, cooking, other businesses), politely decline and redirect them to ask about ${studio.name}.
- Help customers understand what each package offers using their descriptions.
- Clearly explain when packages expire based on their validity.
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
