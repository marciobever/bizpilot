-- ── Trava de limite de agentes no nível do banco ─────────────────────────────
-- Substitui a função do trigger (013) para, além de exigir assinatura ativa,
-- respeitar o limite de bots do plano + complementos addon_bot comprados.
-- Defesa em profundidade: nem via chamada direta ao Supabase dá para estourar.

create or replace function public.enforce_active_subscription()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status     text;
  v_plan       text;
  v_base_limit int;
  v_addon_bots int;
  v_effective  int;
  v_current    int;
begin
  select subscription_status, plan
    into v_status, v_plan
  from public.profiles
  where id = new.user_id;

  -- 1) Precisa de assinatura ativa.
  if v_status is null or v_status not in ('active', 'trialing') then
    raise exception 'SUBSCRIPTION_REQUIRED: é necessário ter uma assinatura ativa para criar agentes.'
      using errcode = 'P0001';
  end if;

  -- 2) Limite base de bots por plano (-1 = ilimitado).
  v_base_limit := case
    when v_plan in ('business', 'avancado')   then -1
    when v_plan in ('pro', 'profissional')    then 3
    else 1   -- starter / basico / default
  end;

  if v_base_limit <> -1 then
    -- Complementos addon_bot ativos somam +1 cada.
    select count(*) into v_addon_bots
    from public.user_addons
    where user_id = new.user_id
      and addon_id = 'addon_bot'
      and status in ('active', 'trialing');

    v_effective := v_base_limit + coalesce(v_addon_bots, 0);

    select count(*) into v_current
    from public.agents
    where user_id = new.user_id;

    if v_current >= v_effective then
      raise exception 'BOT_LIMIT_REACHED: limite de % agente(s) atingido. Faça upgrade ou compre um Bot Adicional.', v_effective
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

-- Garante o trigger (idempotente).
drop trigger if exists agents_require_subscription on public.agents;
create trigger agents_require_subscription
  before insert on public.agents
  for each row execute function public.enforce_active_subscription();
