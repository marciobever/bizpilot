import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/api-auth';
import { signOAuthState } from '@/lib/oauth-state';

// POST /api/email/google/auth — devolve a URL de consentimento do Google
// pedindo permissão para enviar e-mails em nome do usuário (escopo
// gmail.send). userId vem SEMPRE da sessão autenticada (nunca do body), e
// vai assinado dentro do state — ver comentário em calendar/google/auth
// sobre o motivo (CSRF no round-trip do OAuth).
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: 'Login com Google indisponível: GOOGLE_CLIENT_ID não configurado.' }, { status: 500 });

  const redirectUri = `${req.nextUrl.origin}/api/email/google/callback`;
  const state = signOAuthState({ userId: auth.user.id });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return NextResponse.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
}
