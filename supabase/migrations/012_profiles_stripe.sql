-- ── Vincula o perfil do usuário à assinatura no Stripe ───────────────────────
-- Esses campos são preenchidos/atualizados pelo webhook do Stripe
-- (/api/stripe/webhook) conforme o ciclo de vida da assinatura.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS subscription_status    TEXT, -- active | trialing | past_due | canceled | incomplete | ...
  ADD COLUMN IF NOT EXISTS current_period_end     TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS profiles_stripe_customer_idx ON public.profiles (stripe_customer_id);
