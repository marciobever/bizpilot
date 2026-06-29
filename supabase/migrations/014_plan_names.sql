-- ── Libera os nomes de plano novos no constraint ─────────────────────────────
-- A tabela profiles foi criada (008) aceitando só basico/profissional/avancado.
-- O fluxo de pagamento grava os nomes novos (starter/pro/business), o que
-- violaria o CHECK e faria o update falhar — quebrando a ativação da assinatura.
-- Aqui ampliamos o constraint para aceitar os dois conjuntos (compatibilidade).

alter table public.profiles drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('basico', 'profissional', 'avancado', 'starter', 'pro', 'business'));
