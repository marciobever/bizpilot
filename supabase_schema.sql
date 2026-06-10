-- Setup inicial do banco de dados Synapse no Supabase

-- 1. Tabela de Leads (Contatos/Clientes)
CREATE TABLE public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'novo', -- novo, em_atendimento, qualificado, convertido, perdido
    score INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Agentes (Robôs de IA)
CREATE TABLE public.agents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- vendas, suporte, triagem
    system_prompt TEXT,
    status TEXT DEFAULT 'offline', -- online, offline, paused
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Integrações (WhatsApp, Instagram, etc)
CREATE TABLE public.integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider TEXT NOT NULL, -- evolution, instagram, facebook, webhook
    name TEXT NOT NULL,
    status TEXT DEFAULT 'disconnected', -- connected, disconnected, error
    config JSONB DEFAULT '{}'::jsonb, -- Armazena tokens, urls, IDs de instâncias
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Conversas (Sessões de chat)
CREATE TABLE public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    channel TEXT NOT NULL, -- whatsapp, instagram, facebook
    status TEXT DEFAULT 'active', -- active, closed, transferred
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Mensagens (Histórico do chat)
CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_type TEXT NOT NULL, -- lead, agent, human
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ==============================================================================
-- Configuração de Segurança de Nível de Linha (RLS - Row Level Security)
-- Isso garante que cada usuário só possa ver e editar os seus próprios dados.
-- ==============================================================================

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Políticas para Leads
CREATE POLICY "Usuários gerenciam seus próprios leads" 
  ON public.leads FOR ALL USING (auth.uid() = user_id);

-- Políticas para Agentes
CREATE POLICY "Usuários gerenciam seus próprios agentes" 
  ON public.agents FOR ALL USING (auth.uid() = user_id);

-- Políticas para Integrações
CREATE POLICY "Usuários gerenciam suas próprias integrações" 
  ON public.integrations FOR ALL USING (auth.uid() = user_id);

-- Políticas para Conversas
CREATE POLICY "Usuários gerenciam suas próprias conversas" 
  ON public.conversations FOR ALL USING (auth.uid() = user_id);

-- Políticas para Mensagens (Baseado no dono da conversa)
CREATE POLICY "Usuários gerenciam mensagens de suas conversas" 
  ON public.messages FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = messages.conversation_id AND c.user_id = auth.uid()
    )
  );

-- Gatilhos para atualizar automaticamente a coluna `updated_at`

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON public.integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
