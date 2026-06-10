-- ── Extensão pgvector (embeddings para RAG) ─────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Memória longa por lead ────────────────────────────────────────────────────
-- Um fato por linha: o bot lembra de cada usuário entre conversas.
CREATE TABLE IF NOT EXISTS contact_memory (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id   UUID NOT NULL REFERENCES agents(id)     ON DELETE CASCADE,
  lead_id    UUID NOT NULL REFERENCES leads(id)      ON DELETE CASCADE,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (lead_id, agent_id, key)
);
CREATE INDEX IF NOT EXISTS contact_memory_lead_agent_idx ON contact_memory(lead_id, agent_id);
ALTER TABLE contact_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON contact_memory FOR ALL USING (auth.uid() = user_id);

-- ── Base de conhecimento (documentos/textos por agente) ───────────────────────
CREATE TABLE IF NOT EXISTS knowledge_base (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id    UUID NOT NULL REFERENCES agents(id)     ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'url'
  source_url  TEXT,
  chunk_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_base_agent_idx ON knowledge_base(agent_id);
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON knowledge_base FOR ALL USING (auth.uid() = user_id);

-- ── Chunks com embeddings (vetores para busca semântica) ──────────────────────
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  agent_id          UUID NOT NULL,
  user_id           UUID NOT NULL,
  chunk_text        TEXT NOT NULL,
  embedding         vector(1536),
  chunk_index       INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_chunks_agent_idx ON knowledge_chunks(agent_id);
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx
  ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON knowledge_chunks FOR ALL USING (auth.uid() = user_id);

-- ── Função de busca semântica ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding  vector(1536),
  agent_id_filter  UUID,
  match_count      INTEGER DEFAULT 5,
  min_similarity   FLOAT   DEFAULT 0.3
)
RETURNS TABLE (id UUID, chunk_text TEXT, similarity FLOAT)
LANGUAGE SQL STABLE AS $$
  SELECT
    kc.id,
    kc.chunk_text,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  WHERE kc.agent_id = agent_id_filter
    AND kc.embedding IS NOT NULL
    AND 1 - (kc.embedding <=> query_embedding) >= min_similarity
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;
