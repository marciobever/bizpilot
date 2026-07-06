-- ── Exclusão de agente com arquivamento/carência ──────────────────────────────
-- "Apagar" um agente agora é um soft-delete (deleted_at). O agente e suas
-- conversas somem do painel na hora, mas só são apagados de vez do banco
-- depois de 15 dias (job agendado no Windmill, ver INTERNAL_API_SECRET em
-- /api/agents/purge-expired). "Arquivar e baixar" não usa esta coluna — baixa
-- o histórico e já apaga tudo na hora (ver /api/agents/[id]/purge).

ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS agents_deleted_at_idx ON public.agents (deleted_at) WHERE deleted_at IS NOT NULL;
