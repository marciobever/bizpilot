-- ── Campanhas em massa (addon_campaigns) ─────────────────────────────────────
-- Disparo da mesma mensagem para uma lista de contatos via WhatsApp Evolution
-- (Meta Oficial exige template pré-aprovado fora da janela de 24h — fica de
-- fora por ora). Envio real é feito pelo Windmill com espaçamento entre
-- mensagens (evitar bloqueio da instância); esta tabela só guarda o pedido
-- e o progresso.

create table if not exists public.campaigns (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  agent_id          uuid not null references public.agents(id) on delete cascade,
  name              text not null,
  message           text not null,
  status            text not null default 'queued', -- queued | sending | done | failed | canceled
  total_recipients  int not null default 0,
  sent_count        int not null default 0,
  failed_count      int not null default 0,
  created_at        timestamptz default now(),
  started_at        timestamptz,
  finished_at       timestamptz
);

create index if not exists campaigns_user_idx on public.campaigns (user_id, created_at desc);

alter table public.campaigns enable row level security;

drop policy if exists "owner_select_campaigns" on public.campaigns;
create policy "owner_select_campaigns" on public.campaigns
  for select using (auth.uid() = user_id);

create table if not exists public.campaign_recipients (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns(id) on delete cascade,
  phone        text not null,
  name         text,
  status       text not null default 'pending', -- pending | sent | failed
  error        text,
  sent_at      timestamptz
);

create index if not exists campaign_recipients_campaign_idx on public.campaign_recipients (campaign_id);

alter table public.campaign_recipients enable row level security;

drop policy if exists "owner_select_campaign_recipients" on public.campaign_recipients;
create policy "owner_select_campaign_recipients" on public.campaign_recipients
  for select using (
    exists (select 1 from public.campaigns c where c.id = campaign_id and c.user_id = auth.uid())
  );
