-- ── Tickets de suporte ────────────────────────────────────────────────────
-- Permite que o usuário abra um chamado (dúvida, problema, pedido) e troque
-- mensagens com a equipe (admin). O admin é identificado pelo e-mail fixo
-- 'bevervansomarcio@gmail.com'.

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email  TEXT NOT NULL,
  subject     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES auth.users(id),
  is_admin    BOOLEAN NOT NULL DEFAULT false,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Usuário comum: só vê e cria seus próprios chamados.
CREATE POLICY "tickets_owner_select" ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id OR (auth.jwt() ->> 'email') = 'bevervansomarcio@gmail.com');

CREATE POLICY "tickets_owner_insert" ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin pode atualizar status de qualquer chamado; usuário pode atualizar (ex: reabrir) o próprio.
CREATE POLICY "tickets_update" ON public.support_tickets FOR UPDATE
  USING (auth.uid() = user_id OR (auth.jwt() ->> 'email') = 'bevervansomarcio@gmail.com');

-- Mensagens: dono do chamado ou admin podem ver/enviar.
CREATE POLICY "messages_select" ON public.support_messages FOR SELECT
  USING (
    (auth.jwt() ->> 'email') = 'bevervansomarcio@gmail.com'
    OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
  );

CREATE POLICY "messages_insert" ON public.support_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      (auth.jwt() ->> 'email') = 'bevervansomarcio@gmail.com'
      OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    )
  );
