import { supabase } from './supabase';

// Wrapper de fetch para chamar as rotas /api autenticadas.
// Anexa automaticamente o token da sessão como `Authorization: Bearer <jwt>`,
// que o servidor valida via `requireUser()`. Use no lugar de `fetch()` para
// qualquer rota que dependa do usuário logado.
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  return fetch(input, { ...init, headers });
}
