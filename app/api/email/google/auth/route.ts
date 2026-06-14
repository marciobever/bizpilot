import { NextRequest, NextResponse } from 'next/server';

// GET /api/email/google/auth?userId=...
// Redireciona o usuário para a tela de consentimento do Google pedindo permissão
// para enviar e-mails em nome dele (escopo gmail.send). Usa o app OAuth central
// do BizPilot (GOOGLE_CLIENT_ID/SECRET), então o usuário final só clica e autoriza.
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return NextResponse.json({ error: 'Login com Google indisponível: GOOGLE_CLIENT_ID não configurado.' }, { status: 500 });

  const redirectUri = `${req.nextUrl.origin}/api/email/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
    access_type: 'offline',
    prompt: 'consent',
    state: userId,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
