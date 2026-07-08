-- Imagem opcional no disparo em massa (banner de promoção, etc).
alter table public.campaigns add column if not exists image_url text;
