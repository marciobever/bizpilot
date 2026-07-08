import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getServiceSupabase } from '@/lib/api-auth';
import { signOAuthState } from '@/lib/oauth-state';

// POST /api/calendar/google/auth { agentId? } — devolve a URL de consentimento
// do Google. userId vem SEMPRE da sessão autenticada (nunca do body), e vai
// assinado dentro do state — sem isso, um link forjado poderia levar a
// vítima a autorizar o Google dela e o token acabar salvo na conta de outra
// pessoa (CSRF no round-trip do OAuth, que não carrega header de auth).
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

  const body = await req.json().catch(() => ({}));
  const agentId = String(body?.agentId || '');

  const supabase = getServiceSupabase();
  const { data: integration } = await supabase
    .from('integrations').select('config')
    .eq('user_id', userId).eq('provider', 'calendar').maybeSingle();

  const clientId = integration?.config?.clientId;
  if (!clientId) return NextResponse.json({ error: 'Configure o Client ID do Google primeiro.' }, { status: 400 });

  const redirectUri = `${req.nextUrl.origin}/api/calendar/google/callback`;
  const state = signOAuthState({ userId, agentId });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return NextResponse.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
}
