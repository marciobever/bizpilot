-- ── Integrações (automações): garante 1 registro por provedor por usuário ────
ALTER TABLE public.integrations
  ADD CONSTRAINT integrations_user_provider_unique UNIQUE (user_id, provider);
