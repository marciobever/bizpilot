-- Botões opcionais (até 3, resposta rápida) no disparo em massa.
alter table public.campaigns add column if not exists buttons jsonb;
