import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { 
      fieldName, 
      context = {}, 
      tone = 'Professional', 
      length = 'Standard' 
    } = await req.json()

    const prompt = `
      You are a Senior SEO Copywriter and Wellness Expert for Pilates Bridge.
      
      # CONTEXT FOR GENERATION
      Current Field: ${fieldName}
      Page Title: ${context.title || 'N/A'}
      Surrounding Content: ${context.description || 'N/A'}
      Category: ${context.category || 'N/A'}
      
      # USER PREFERENCES
      Desired Tone: ${tone} (Options: Professional, Casual, Exciting)
      Desired Length: ${length} (Options: Shorten, Standard, Lengthen)
      
      # INSTRUCTIONS
      1. Generate a high-converting, SEO-friendly ${fieldName}.
      2. If Tone is Professional: Use authoritative, clear, and result-oriented language.
      3. If Tone is Casual: Use friendly, inclusive, and conversational language.
      4. If Tone is Exciting: Use high-energy, transformative, and punchy language.
      5. AVOID AI CLICHÉS: "Unlock your potential", "Game-changer", "Embark on a journey", "Revolutionize".
      6. Output ONLY the text for the field. No chat, no quotes.
    `

    const { text } = await generateText({
      model: openai('gpt-4o-mini'),
      system: "You are a specialized CMS content assistant. You provide only the direct text output requested, optimized for SEO and conversion.",
      prompt: prompt,
    })

    return Response.json({ suggestion: text.trim() })
  } catch (error) {
    console.error('[AI Content Assist Error]:', error)
    return Response.json({ error: 'Failed to generate suggestion' }, { status: 500 })
  }
}
