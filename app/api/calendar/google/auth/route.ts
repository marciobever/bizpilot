import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// GET /api/calendar/google/auth?userId=...
// Redireciona o usuário para a tela de consentimento do Google usando o
// Client ID/Secret que ele mesmo cadastrou (BYO OAuth app).
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { data: integration } = await supabase
    .from('integrations').select('config')
    .eq('user_id', userId).eq('provider', 'calendar').maybeSingle();

  const clientId = integration?.config?.clientId;
  if (!clientId) return NextResponse.json({ error: 'Configure o Client ID do Google primeiro.' }, { status: 400 });

  const redirectUri = `${req.nextUrl.origin}/api/calendar/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/calendar',
    access_type: 'offline',
    prompt: 'consent',
    state: userId,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
