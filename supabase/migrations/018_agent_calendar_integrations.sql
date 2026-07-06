-- ── Calendário específico por agente (override do calendário da conta) ────────
-- Por padrão todo agente usa o calendário conectado em Integrações (tabela
-- integrations, escopo = conta). Esta tabela é opcional: se existir uma linha
-- aqui pra um agente, ela tem prioridade sobre o calendário da conta. Ver
-- src/lib/calendarConfig.ts (resolveCalendarConfig) pra lógica de fallback.

CREATE TABLE IF NOT EXISTS public.agent_calendar_integrations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   UUID NOT NULL UNIQUE REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider   TEXT NOT NULL CHECK (provider IN ('google', 'calcom', 'calendly')),
  status     TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  config     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_calendar_integrations_user_idx ON public.agent_calendar_integrations (user_id);

ALTER TABLE public.agent_calendar_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON public.agent_calendar_integrations FOR ALL USING (auth.uid() = user_id);
