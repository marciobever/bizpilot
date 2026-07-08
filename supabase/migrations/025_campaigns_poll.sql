-- Enquete opcional no disparo em massa, substituindo os botões de resposta
-- rápida (/send/button da Evolution ficou instável/não-documentado; enquete
-- usa /send/poll, endpoint estável e documentado). Reaproveita a coluna
-- `buttons` (jsonb) como as opções da enquete.
alter table public.campaigns add column if not exists poll_question text;
