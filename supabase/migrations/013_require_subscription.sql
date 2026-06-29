-- ── Trava de assinatura no nível do banco ────────────────────────────────────
-- Defesa em profundidade: mesmo que o gate do front-end seja burlado
-- (ex.: chamada direta ao Supabase pelo devtools), o banco recusa criar
-- agentes para quem não tem assinatura ativa.

create or replace function public.enforce_active_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select subscription_status into v_status
  from public.profiles
  where id = new.user_id;

  if v_status is null or v_status not in ('active', 'trialing') then
    raise exception 'SUBSCRIPTION_REQUIRED: é necessário ter uma assinatura ativa para criar agentes.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists agents_require_subscription on public.agents;
create trigger agents_require_subscription
  before insert on public.agents
  for each row execute function public.enforce_active_subscription();
