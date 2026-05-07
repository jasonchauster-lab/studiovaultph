import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function test() {
  const query = 'where can I manage my equipment'
  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: query,
  })
  const queryEmbedding = embeddingRes.data[0].embedding
  const embeddingStr = `[${queryEmbedding.join(',')}]`

  // Test 1: Check if pgvector extension is enabled
  const { data: extData, error: extErr } = await supabase.rpc('match_site_knowledge', {
    query_embedding: embeddingStr,
    match_threshold: 0.0,
    match_count: 27
  })
  console.log('Test 1 - RPC results:', extData?.length, 'error:', extErr?.message)

  // Test 2: Just do a basic select without vector operations
  const { data: allRows } = await supabase.from('site_knowledge').select('id, content, metadata').limit(27)
  console.log('Test 2 - Total rows:', allRows?.length)

  // Test 3: Check embedding column — is it stored as text or vector?
  // Try fetching the embedding and checking its raw representation
  const { data: embRow } = await supabase
    .from('site_knowledge')
    .select('embedding')
    .limit(1)
    .single()

  const emb = embRow?.embedding
  console.log('\nTest 3 - Embedding info:')
  console.log('  typeof:', typeof emb)
  console.log('  starts with [:', String(emb).startsWith('['))
  console.log('  first 50 chars:', String(emb).slice(0, 50))
  
  // Test 4: Drop and recreate the function with explicit casting
  // First let's try passing the embedding as an array instead
  const { data: t4, error: e4 } = await supabase.rpc('match_site_knowledge', {
    query_embedding: queryEmbedding, // Pass raw array
    match_threshold: 0.0,
    match_count: 5
  })
  console.log('\nTest 4 - RPC with raw array:', t4?.length, 'error:', e4?.message)
}

test()
