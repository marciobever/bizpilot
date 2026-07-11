-- Controle de e-mails de billing (recibo, aviso de vencimento, suspensão):
-- uma linha por (usuário, tipo, período) garante que o job diário não manda
-- o mesmo aviso duas vezes. Só o service role escreve.
create table if not exists public.billing_notices (
  user_id    uuid not null,
  kind       text not null,          -- receipt | renewal_d3 | trial_ending | suspended | trial_ended
  period_end timestamptz not null,   -- período a que o aviso se refere
  sent_at    timestamptz not null default now(),
  primary key (user_id, kind, period_end)
);

alter table public.billing_notices enable row level security;
