-- ── Base de contatos reaproveitável ───────────────────────────────────────────
-- Toda vez que uma campanha é disparada, os números vão entrando aqui (upsert
-- por telefone), pra não precisar colar a mesma lista de novo em campanhas
-- futuras.

create table if not exists public.campaign_contacts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  phone      text not null,
  name       text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, phone)
);

create index if not exists campaign_contacts_user_idx on public.campaign_contacts (user_id, updated_at desc);

alter table public.campaign_contacts enable row level security;

drop policy if exists "owner_select_campaign_contacts" on public.campaign_contacts;
create policy "owner_select_campaign_contacts" on public.campaign_contacts
  for select using (auth.uid() = user_id);
