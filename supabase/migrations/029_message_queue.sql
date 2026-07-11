-- message_queue: janela de debounce/anti-encavalamento do webhook_receiver
-- (windmill/1_webhook_receiver.ts). A tabela existia só no banco (criada à
-- mão) — esta migration a traz para o repo para o ambiente ser reproduzível.
-- Colunas espelham exatamente o que o receiver insere/consulta via REST:
-- insert de {remote_jid, instance_name, message_id, message}, select ordenado
-- por id, delete por (remote_jid, instance_name).
create table if not exists public.message_queue (
  id            bigint generated always as identity primary key,
  remote_jid    text not null,
  instance_name text not null,
  message_id    text not null,
  message       text not null,
  created_at    timestamptz not null default now()
);

create index if not exists message_queue_scope_idx
  on public.message_queue (remote_jid, instance_name);

-- Só o service role (Windmill) mexe aqui. RLS ligada sem policies = anon/user
-- bloqueados, service role passa direto.
alter table public.message_queue enable row level security;

-- Correção da 026: api_rate_limits foi criada sem RLS — sem isso a chave anon
-- consegue ler/escrever a tabela via PostgREST. Mesmo modelo: service role only.
alter table public.api_rate_limits enable row level security;
