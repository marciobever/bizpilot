-- Rate limit por usuário/rota — protege /api/support-chat e
-- /api/agents/generate (chamadas OpenAI) contra abuso/automação.
-- Só o service role mexe aqui (sem RLS de select pro usuário).
create table if not exists public.api_rate_limits (
  user_id      uuid not null,
  route        text not null,
  window_start timestamptz not null,
  count        int not null default 1,
  primary key (user_id, route, window_start)
);
