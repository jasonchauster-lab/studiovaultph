-- Enable pgvector extension
create extension if not exists vector;

-- Table for site knowledge (chunks of website content)
create table if not exists site_knowledge (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  embedding vector(1536), -- Dimension for OpenAI text-embedding-3-small
  created_at timestamp with time zone default now()
);

-- Index for semantic search (using ivfflat for speed)
-- Note: In production with many rows, HNSW might be better but requires more memory.
create index on site_knowledge using ivfflat (embedding vector_cosine_ops);

-- RLS: Only allow service role to write, but anon can potentially read if we want public search
alter table site_knowledge enable row level security;

create policy "Allow service role full access to site_knowledge"
on site_knowledge
for all
to service_role
using (true)
with check (true);

create policy "Allow public read-only access to site_knowledge"
on site_knowledge
for select
to anon, authenticated
using (true);

-- Function for semantic search
create or replace function match_site_knowledge (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    sk.id,
    sk.content,
    sk.metadata,
    1 - (sk.embedding <=> query_embedding) as similarity
  from site_knowledge sk
  where 1 - (sk.embedding <=> query_embedding) > match_threshold
  order by sk.embedding <=> query_embedding
  limit match_count;
end;
$$;
