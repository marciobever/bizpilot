import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// GET /api/email/google/callback?code=...&state=<userId>
// Troca o código por um refresh token, descobre o e-mail da conta e salva a
// integração de e-mail com provider 'google'.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const userId = req.nextUrl.searchParams.get('state');
  const redirectBack = (status: string) => NextResponse.redirect(`${req.nextUrl.origin}/app/automations?email=${status}`);

  if (!code || !userId) return redirectBack('error');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return redirectBack('error');

  try {
    const redirectUri = `${req.nextUrl.origin}/api/email/google/callback`;
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.refresh_token || !tokens.access_token) return redirectBack('error');

    // Descobre o e-mail da conta autorizada para usar como remetente.
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userRes.json();
    const fromEmail = userInfo?.email;
    if (!fromEmail) return redirectBack('error');

    const supabase = getServiceSupabase();
    const { data: existing } = await supabase
      .from('integrations').select('config')
      .eq('user_id', userId).eq('provider', 'email').maybeSingle();

    await supabase.from('integrations').upsert({
      user_id: userId,
      provider: 'email',
      name: 'E-mail',
      status: 'connected',
      config: {
        provider: 'google',
        refreshToken: tokens.refresh_token,
        fromEmail,
        fromName: existing?.config?.fromName || '',
      },
    }, { onConflict: 'user_id,provider' });

    return redirectBack('connected');
  } catch {
    return redirectBack('error');
  }
}
