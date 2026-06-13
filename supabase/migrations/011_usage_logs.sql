-- ── Registro de uso/custo de IA (tokens OpenAI/Gemini) ───────────────────────
-- Cada chamada à OpenAI ou Gemini (chat, embeddings, TTS, extração de memória)
-- grava uma linha aqui, já com o custo estimado em USD (ver MODEL_PRICING em
-- windmill/2_ai_processor.ts). Permite consultar consumo por usuário/agente/dia.

CREATE TABLE IF NOT EXISTS public.usage_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id         UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  conversation_id  UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  provider         TEXT NOT NULL CHECK (provider IN ('openai', 'gemini')),
  model            TEXT NOT NULL,
  endpoint         TEXT NOT NULL, -- chat_completion | embedding | tts | memory_extraction
  prompt_tokens    INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens     INTEGER NOT NULL DEFAULT 0,
  cost_usd         NUMERIC(12, 6) NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_logs_user_created_idx ON public.usage_logs (user_id, created_at);
CREATE INDEX IF NOT EXISTS usage_logs_agent_created_idx ON public.usage_logs (agent_id, created_at);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Cada usuário só vê o próprio consumo. Inserts são feitos pelo Windmill com a
-- service role key, que ignora RLS, então não há policy de INSERT.
CREATE POLICY "owner_select" ON public.usage_logs FOR SELECT USING (auth.uid() = user_id);
