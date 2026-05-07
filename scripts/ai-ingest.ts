import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as cheerio from 'cheerio'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const BASE_URL = 'http://localhost:3000' // Change to production URL for real crawl
const IGNORE_PATHS = ['/login', '/register', '/api', '/_next']

async function ingest() {
  console.log('🚀 Starting ingestion...')
  
  // 1. Get URLs (In a real scenario, fetch from sitemap.xml)
  const urls = [
    '/',
    '/studio/register',
    '/pricing',
    // Add more core pages here
  ]

  for (const path of urls) {
    const url = `${BASE_URL}${path}`
    console.log(`📄 Processing ${url}...`)
    
    try {
      const response = await fetch(url)
      const html = await response.text()
      const $ = cheerio.load(html)
      
      // Remove noise
      $('header, footer, nav, script, style').remove()
      
      const title = $('title').text()
      const content = $('main').text() || $('body').text()
      const cleanContent = content.replace(/\s+/g, ' ').trim()
      
      // Chunking (Simple implementation)
      const chunks = chunkText(cleanContent, 1000)
      console.log(`   Split into ${chunks.length} chunks.`)
      
      for (const chunk of chunks) {
        const textToEmbed = `URL: ${path}\nTitle: ${title}\nContent: ${chunk}`
        
        // Generate embedding
        const embeddingRes = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: textToEmbed,
        })
        
        const embedding = embeddingRes.data[0].embedding
        
        // Save to Supabase
        const { error } = await supabase.from('site_knowledge').insert({
          content: chunk,
          metadata: { url: path, title },
          embedding,
        })
        
        if (error) console.error('   ❌ Error saving chunk:', error.message)
      }
    } catch (err) {
      console.error(`   ❌ Failed to process ${url}:`, err)
    }
  }
  
  console.log('✅ Ingestion complete.')
}

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = []
  const words = text.split(' ')
  let currentChunk: string[] = []
  let currentSize = 0
  
  for (const word of words) {
    currentChunk.push(word)
    currentSize += word.length + 1
    if (currentSize >= size) {
      chunks.push(currentChunk.join(' '))
      // Overlap by keeping some words
      currentChunk = currentChunk.slice(-10) 
      currentSize = currentChunk.join(' ').length
    }
  }
  if (currentChunk.length > 0) chunks.push(currentChunk.join(' '))
  return chunks
}

ingest()
