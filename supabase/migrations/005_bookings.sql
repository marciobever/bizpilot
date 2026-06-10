-- ── Agendamentos confirmados (para lembretes automáticos) ────────────────────
CREATE TABLE IF NOT EXISTS public.bookings (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  agent_id        UUID NOT NULL REFERENCES agents(id)        ON DELETE CASCADE,
  lead_id         UUID REFERENCES leads(id)                  ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id)          ON DELETE SET NULL,
  provider        TEXT NOT NULL,
  datetime        TIMESTAMPTZ NOT NULL,
  customer_name   TEXT,
  customer_email  TEXT,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, reminded, cancelled
  reminder_sent_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bookings_pending_reminder_idx
  ON bookings(datetime) WHERE status = 'scheduled' AND reminder_sent_at IS NULL;

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON bookings FOR ALL USING (auth.uid() = user_id);

-- ── Configuração de lembrete (horas de antecedência) ──────────────────────────
-- Armazenado em integrations.config->>'reminderHours' (provider = 'calendar').
