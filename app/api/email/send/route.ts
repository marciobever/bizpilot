import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

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

// SMTP genérico (Gmail, Outlook, Zoho, Hostinger, etc.) via nodemailer.
async function sendViaSmtp(
  cfg: { host: string; port: number; secure: boolean; user: string; pass: string },
  from: string, to: string, subject: string, body: string,
) {
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  await transporter.sendMail({ from, to, subject, text: body });
}

// Envia via Gmail API usando o refresh token obtido no "Entrar com Google".
async function sendViaGoogle(refreshToken: string, from: string, to: string, subject: string, body: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID/SECRET não configurados no servidor.');

  // Troca o refresh token por um access token válido.
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData?.error_description || 'Não foi possível renovar o acesso ao Google. Reconecte a conta.');
  }

  // Monta a mensagem RFC 822. Assunto codificado em MIME para suportar acentos.
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body, 'utf-8').toString('base64'),
  ].join('\r\n');

  const raw = Buffer.from(message, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenData.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
  if (!sendRes.ok) {
    const data = await sendRes.json().catch(() => ({}));
    throw new Error(data?.error?.message || 'Erro ao enviar e-mail via Google.');
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
  const { provider, apiKey, fromEmail, fromName, refreshToken } = config as {
    provider: string; apiKey?: string; fromEmail: string; fromName?: string; refreshToken?: string;
  };

  if (!fromEmail) {
    return NextResponse.json({ error: 'Provedor de e-mail não configurado corretamente.' }, { status: 400 });
  }

  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

  try {
    if (provider === 'sendgrid') {
      if (!apiKey) throw new Error('Chave de API ausente.');
      await sendViaSendgrid(apiKey, fromEmail, to, subject, body);
    } else if (provider === 'smtp') {
      if (!config.host || !config.user || !config.pass) throw new Error('Dados de SMTP incompletos.');
      await sendViaSmtp(
        { host: config.host, port: Number(config.port) || 465, secure: config.secure !== false, user: config.user, pass: config.pass },
        from, to, subject, body,
      );
    } else if (provider === 'google') {
      if (!refreshToken) throw new Error('Conta Google não autorizada. Reconecte.');
      await sendViaGoogle(refreshToken, from, to, subject, body);
    } else {
      if (!apiKey) throw new Error('Chave de API ausente.');
      await sendViaResend(apiKey, from, to, subject, body);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
