-- ── Complementos (add-ons) comprados pelo usuário ────────────────────────────
-- Cada add-on é uma assinatura Stripe própria, separada do plano principal.
-- Sem isso, comprar um extra sobrescrevia o plano/assinatura do perfil.

create table if not exists public.user_addons (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  addon_id               text not null,                 -- ex: addon_bot, addon_voice
  stripe_subscription_id text unique,
  status                 text not null default 'active', -- active | canceled | ...
  created_at             timestamptz default now()
);

create index if not exists user_addons_user_idx on public.user_addons (user_id);

alter table public.user_addons enable row level security;

drop policy if exists "owner_select_addons" on public.user_addons;
create policy "owner_select_addons" on public.user_addons
  for select using (auth.uid() = user_id);
