-- Alerta de conexão WhatsApp caída, por agente (uma linha por agente,
-- upsert — não é log histórico). Serve pra: (a) throttle de e-mail
-- (notified_email_at), (b) indicador global no header, (c) ponto de
-- convergência entre o webhook em tempo real da Evolution e a checagem
-- de segurança no login (ambos escrevem na mesma linha via
-- recordConnectionObservation()).
create table if not exists public.whatsapp_connection_alerts (
  id                 uuid primary key default gen_random_uuid(),
  agent_id           uuid not null references public.agents(id) on delete cascade,
  user_id            uuid not null references auth.users(id) on delete cascade,
  provider           text not null default 'evolution' check (provider in ('evolution', 'meta')),
  instance_name      text not null,
  status             text not null default 'down' check (status in ('down', 'resolved')),
  dropped_at         timestamptz not null default now(),
  notified_email_at  timestamptz,
  resolved_at        timestamptz,
  last_checked_at    timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (agent_id)
);

create index if not exists whatsapp_connection_alerts_active_idx
  on public.whatsapp_connection_alerts (user_id) where status = 'down';

alter table public.whatsapp_connection_alerts enable row level security;

drop policy if exists "wa_alerts_owner_select" on public.whatsapp_connection_alerts;
create policy "wa_alerts_owner_select" on public.whatsapp_connection_alerts
  for select using (auth.uid() = user_id);
