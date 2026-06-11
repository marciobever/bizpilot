-- ── Registros genéricos de dados (memória estruturada por lead) ──────────────
-- Tabela única e schema-livre para o agente guardar qualquer informação que o
-- usuário for fornecendo ao longo do tempo (lançamentos financeiros, pedidos,
-- anotações, medições, etc), categorizada livremente pela própria IA. Evita
-- precisar criar uma tabela nova para cada tipo de bot/nicho.
CREATE TABLE IF NOT EXISTS public.agent_records (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id    UUID NOT NULL REFERENCES agents(id)     ON DELETE CASCADE,
  lead_id     UUID NOT NULL REFERENCES leads(id)      ON DELETE CASCADE,
  category    TEXT NOT NULL,        -- ex: "transacao", "pedido", "anotacao" (definido pela IA)
  data        JSONB NOT NULL,       -- conteúdo livre do registro
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_records_lookup_idx
  ON agent_records(agent_id, lead_id, category, created_at);

ALTER TABLE agent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON agent_records FOR ALL USING (auth.uid() = user_id);
