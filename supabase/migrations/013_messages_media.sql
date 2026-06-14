-- 013_messages_media.sql
-- Adiciona suporte a mídia nas mensagens do painel de Conversas.
-- Usado para exibir o QR Code do Pix e documentos que o bot envia ao cliente.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_url  TEXT,
  ADD COLUMN IF NOT EXISTS media_type TEXT,   -- 'image' | 'document' | 'audio'
  ADD COLUMN IF NOT EXISTS media_name TEXT;
