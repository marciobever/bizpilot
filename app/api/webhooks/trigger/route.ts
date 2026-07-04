import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireUser, getServiceSupabase, assertPublicHttpUrl, SsrfError } from '@/lib/api-auth';

// POST /api/webhooks/trigger
// Dispara o webhook customizado do usuário para um evento (ex: lead qualificado).
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

  const { event, payload } = await req.json();
  if (!event) return NextResponse.json({ error: 'event é obrigatório' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { data: integration } = await supabase
    .from('integrations')
    .select('status, config')
    .eq('user_id', userId)
    .eq('provider', 'webhook')
    .maybeSingle();

  if (!integration || integration.status !== 'connected') {
    return NextResponse.json({ skipped: true, reason: 'webhook não conectado' });
  }

  const config = integration.config || {};
  const events: string[] = config.events || [];
  if (!config.url || !events.includes(event)) {
    return NextResponse.json({ skipped: true, reason: 'evento não habilitado' });
  }

  try {
    await assertPublicHttpUrl(String(config.url));
  } catch (e) {
    if (e instanceof SsrfError) {
      return NextResponse.json({ delivered: false, error: `URL de webhook não permitida: ${e.message}` }, { status: 400 });
    }
    throw e;
  }

  const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() });
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.secret) {
    headers['X-Synapse-Signature'] = crypto.createHmac('sha256', config.secret).update(body).digest('hex');
  }

  try {
    const res = await fetch(config.url, { method: 'POST', headers, body });
    return NextResponse.json({ delivered: res.ok, status: res.status });
  } catch (e: any) {
    return NextResponse.json({ delivered: false, error: e.message });
  }
}
