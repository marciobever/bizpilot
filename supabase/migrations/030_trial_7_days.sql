-- ── Trial de 7 dias para toda conta nova ─────────────────────────────────────
-- Conta nova nasce em 'trialing' com current_period_end = +7 dias e
-- billing_provider = 'efi', para os gates por data (painel, runtime do bot e
-- job de expiração) valerem desde o primeiro dia. Sem cartão: quando o trial
-- vence, o job diário rebaixa para 'incomplete' e o checkout assume.
-- Contas existentes não são tocadas (só o trigger de INSERT muda).

-- O CHECK da 008 só aceitava os nomes antigos de plano (basico/profissional/
-- avancado); libera também os atuais antes de o trigger gravar 'starter'.
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('basico', 'profissional', 'avancado', 'starter', 'pro', 'business'));

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, plan, subscription_status, current_period_end, billing_provider)
  values (new.id, 'starter', 'trialing', now() + interval '7 days', 'efi')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
