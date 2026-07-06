import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// GET /api/calendar/google/callback?code=...&state=<userId>:<agentId?>
// Troca o código de autorização por um refresh token. Sem agentId, salva no
// calendário padrão da conta; com agentId, salva como override daquele bot.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state') || '';
  const [userId, agentId] = state.split(':');
  const redirectBack = (status: string) =>
    NextResponse.redirect(agentId
      ? `${req.nextUrl.origin}/app/agents/${agentId}?tab=channels&calendar=${status}`
      : `${req.nextUrl.origin}/app/automations?calendar=${status}`);

  if (!code || !userId) return redirectBack('error');

  try {
    const supabase = getServiceSupabase();
    const { data: integration } = await supabase
      .from('integrations').select('config')
      .eq('user_id', userId).eq('provider', 'calendar').maybeSingle();

    const { clientId, clientSecret } = integration?.config || {};
    if (!clientId || !clientSecret) return redirectBack('error');

    const redirectUri = `${req.nextUrl.origin}/api/calendar/google/callback`;
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
    if (!tokenRes.ok || !tokens.refresh_token) return redirectBack('error');

    if (agentId) {
      await supabase.from('agent_calendar_integrations').upsert({
        agent_id: agentId,
        user_id: userId,
        provider: 'google',
        status: 'connected',
        config: { provider: 'google', clientId, clientSecret, refreshToken: tokens.refresh_token, calendarId: 'primary' },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'agent_id' });
    } else {
      await supabase.from('integrations').upsert({
        user_id: userId,
        provider: 'calendar',
        name: 'Calendário / Agenda',
        status: 'connected',
        config: { ...integration?.config, refreshToken: tokens.refresh_token, calendarId: integration?.config?.calendarId || 'primary' },
      }, { onConflict: 'user_id,provider' });
    }

    return redirectBack('connected');
  } catch {
    return redirectBack('error');
  }
}
