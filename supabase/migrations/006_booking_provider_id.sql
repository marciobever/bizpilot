-- ── ID do agendamento no provedor (Cal.com uid / Google event id) ────────────
-- Necessário para poder reagendar ou cancelar um agendamento existente.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS provider_booking_id TEXT;
