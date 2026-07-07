-- ── Billing Efí (Pix avulso mensal + assinatura de cartão) ──────────────────
-- A Efí substitui a Stripe como PSP. Pix: cada mês vira uma cobrança (cob)
-- registrada aqui; cartão: assinatura recorrente da Efí. Os campos de acesso
-- (profiles.plan / subscription_status / current_period_end) não mudam.

-- Cobranças geradas (Pix e primeira cobrança de cartão). O txid amarra o
-- webhook/confirm ao usuário e ao item comprado — nunca confiar no client.
create table if not exists public.billing_charges (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  kind                text not null check (kind in ('plan', 'addon')),
  item                text not null,            -- starter | pro | business | addon_*
  amount_cents        integer not null,
  method              text not null default 'pix' check (method in ('pix', 'card')),
  txid                text unique,              -- Pix
  efi_subscription_id text,                     -- cartão
  addon_row_id        uuid references public.user_addons(id) on delete set null,
  status              text not null default 'pending', -- pending | paid | failed | expired | canceled
  created_at          timestamptz default now(),
  paid_at             timestamptz
);

create index if not exists billing_charges_user_idx on public.billing_charges (user_id);

alter table public.billing_charges enable row level security;

drop policy if exists "owner_select_billing_charges" on public.billing_charges;
create policy "owner_select_billing_charges" on public.billing_charges
  for select using (auth.uid() = user_id);

-- Cache dos planos de cartão criados na Efí (equivalente aos Prices da Stripe,
-- mas criados sob demanda pela API). Só o service role mexe aqui.
create table if not exists public.efi_plans (
  name       text primary key,                  -- ex: starter, addon_voice
  plan_id    bigint not null,
  created_at timestamptz default now()
);

alter table public.efi_plans enable row level security;

-- Add-ons pagos via Efí: assinatura de cartão própria ou renovação Pix.
alter table public.user_addons add column if not exists efi_subscription_id text unique;
alter table public.user_addons add column if not exists current_period_end timestamptz;

-- Assinatura de cartão Efí do plano principal.
alter table public.profiles add column if not exists efi_subscription_id text;
-- 'efi' quando o plano foi pago via Efí — o gate do painel só aplica a
-- expiração por current_period_end (modelo Pix mensal) nesses perfis;
-- contas legadas Stripe continuam avaliadas só pelo subscription_status.
alter table public.profiles add column if not exists billing_provider text;
