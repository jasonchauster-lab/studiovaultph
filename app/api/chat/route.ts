import { openai } from '@ai-sdk/openai'
import { streamText, convertToModelMessages } from 'ai'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const messages = body.messages || []

    // Extract last user message text
    const lastMsg = messages[messages.length - 1]
    const lastMessage =
      lastMsg?.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') ||
      lastMsg?.content ||
      ''

    const supabase = await createClient()

    // 1. Fetch ALL knowledge base entries (only 27 rows — very fast)
    let contextText = 'No context found.'
    try {
      const { data: allKnowledge, error: kbError } = await supabase
        .from('site_knowledge')
        .select('content, metadata')
        .order('created_at', { ascending: true })

      if (kbError) {
        console.warn('[Chat API] KB fetch error:', kbError.message)
      } else if (allKnowledge?.length) {
        contextText = allKnowledge
          .map((row: any) => `[${row.metadata?.section || 'general'}] ${row.content}`)
          .join('\n\n---\n\n')
        console.log(`[Chat API] Loaded ${allKnowledge.length} knowledge entries`)
      }
    } catch (e) {
      console.warn('[Chat API] Context retrieval skipped:', (e as Error).message)
    }

    // 2. Convert UIMessages to model messages
    const modelMessages = await convertToModelMessages(messages)

    // 3. Stream the response
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: `You are the StudioVault CMS Assistant for the Pilates Bridge platform.

# RULES
- Help studio owners with CMS tasks: scheduling, services, pricing, customer management, analytics, inventory, etc.
- ALWAYS use the KNOWLEDGE BASE below to answer questions. It contains accurate, up-to-date information about every feature.
- When answering, cite the specific section and URL path (e.g. "Go to Inventory at /studio/inventory").
- If the answer is NOT in the KNOWLEDGE BASE, say: "I'm sorry, I don't have specific details on that in my current knowledge base. Please contact our support team for further assistance."
- If the question is NOT related to the CMS, politely redirect them.
- Be professional, concise, and helpful.

# KNOWLEDGE BASE
${contextText}`,
      messages: modelMessages,
    })

    // 4. Return using UIMessage stream protocol (required by @ai-sdk/react useChat)
    return result.toUIMessageStreamResponse()
  } catch (error: any) {
    console.error('[Chat API] Error:', error?.message)
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
