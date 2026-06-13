import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function sendViaResend(apiKey: string, from: string, to: string, subject: string, body: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text: body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Erro ao enviar e-mail via Resend.');
}

async function sendViaSendgrid(apiKey: string, from: string, to: string, subject: string, body: string) {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: 'text/plain', value: body }],
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.errors?.[0]?.message || 'Erro ao enviar e-mail via SendGrid.');
  }
}

// POST /api/email/send
// Chamado pelo Windmill (tool `enviar_email`) quando o agente decide enviar
// um e-mail para o lead durante a conversa.
export async function POST(req: NextRequest) {
  const { agentId, to, subject, body } = await req.json();

  if (!agentId || !to || !subject || !body) {
    return NextResponse.json({ error: 'agentId, to, subject e body são obrigatórios' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const { data: agent, error: agentErr } = await supabase
    .from('agents').select('user_id').eq('id', agentId).single();
  if (agentErr || !agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 });

  const { data: integration, error: intErr } = await supabase
    .from('integrations').select('status, config')
    .eq('user_id', agent.user_id).eq('provider', 'email').maybeSingle();

  if (intErr || !integration || integration.status !== 'connected') {
    return NextResponse.json({ error: 'Provedor de e-mail não conectado para este usuário.' }, { status: 400 });
  }

  const config = integration.config as any;
  const { provider, apiKey, fromEmail, fromName } = config as { provider: string; apiKey: string; fromEmail: string; fromName?: string };

  if (!apiKey || !fromEmail) {
    return NextResponse.json({ error: 'Provedor de e-mail não configurado corretamente.' }, { status: 400 });
  }

  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

  try {
    if (provider === 'sendgrid') await sendViaSendgrid(apiKey, fromEmail, to, subject, body);
    else await sendViaResend(apiKey, from, to, subject, body);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
