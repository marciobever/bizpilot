-- ── Bucket de arquivos para envio (catálogos, tabelas de preço, contratos) ──
-- Permite que o usuário faça upload de arquivos direto pela UI, sem precisar
-- hospedar em outro lugar e colar uma URL manualmente.
INSERT INTO storage.buckets (id, name, public)
VALUES ('agent-media', 'agent-media', true)
ON CONFLICT (id) DO NOTHING;

-- Cada usuário só pode enviar/ver/remover arquivos dentro da sua própria pasta
-- (primeiro segmento do caminho = seu user id). Leitura pública é liberada
-- pelo bucket público, necessária para o WhatsApp baixar o arquivo.
CREATE POLICY "agent_media_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'agent-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "agent_media_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'agent-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "agent_media_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'agent-media' AND (storage.foldername(name))[1] = auth.uid()::text);
