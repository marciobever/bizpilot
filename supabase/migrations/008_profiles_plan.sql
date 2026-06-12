-- ── Perfis de usuário e plano de assinatura ──────────────────────────────────
-- Tabela simples para guardar o plano do usuário (basico | profissional | avancado),
-- usada para liberar/bloquear recursos (ex: aba Addons) na UI do agente.
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan        TEXT NOT NULL DEFAULT 'basico' CHECK (plan IN ('basico', 'profissional', 'avancado')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_select" ON profiles FOR SELECT USING (auth.uid() = id);

-- Cria automaticamente um perfil (plano básico) para cada novo usuário cadastrado.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Cria perfis para usuários que já existem.
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;
