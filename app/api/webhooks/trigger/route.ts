import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// POST /api/webhooks/trigger
// Dispara o webhook customizado do usuário para um evento (ex: lead qualificado).
export async function POST(req: NextRequest) {
  const { userId, event, payload } = await req.json();
  if (!userId || !event) return NextResponse.json({ error: 'userId e event são obrigatórios' }, { status: 400 });

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
