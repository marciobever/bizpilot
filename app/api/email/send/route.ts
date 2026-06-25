import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Transforma URLs (http/https) em links clicáveis. Recebe texto já escapado.
function linkify(escaped: string) {
  return escaped.replace(/(https?:\/\/[^\s<]+)/g, (url) => {
    const trail = (url.match(/[.,;:!?)]+$/) || [''])[0];
    const clean = trail ? url.slice(0, url.length - trail.length) : url;
    return `<a href="${clean}" style="color:#1e88ff;text-decoration:underline;word-break:break-all;">${clean}</a>${trail}`;
  });
}

function buildEmailHtml(body: string, fromName?: string, templateId?: string, brandColor?: string) {
  const color = brandColor?.match(/^#[0-9a-fA-F]{3,6}$/) ? brandColor : '#6366f1';
  const safe = linkify(escapeHtml(body)).replace(/\r\n|\r|\n/g, '<br>');
  const BASE = 'font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;';
  const WRAP = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:24px 0;"><tr><td align="center">`;
  const WRAP_END = `</td></tr></table>`;
  const signature = fromName
    ? `<div style="margin-top:20px;border-top:1px solid #e5e7eb;padding-top:14px;color:#6b7280;font-size:13px;">— ${escapeHtml(fromName)}</div>`
    : '';

  if (templateId === 'branded') {
    const initial = fromName ? fromName.charAt(0).toUpperCase() : '?';
    return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7;">${WRAP}
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:${color};padding:20px 32px;text-align:center;">
          <span style="display:inline-block;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.25);line-height:36px;text-align:center;color:#fff;font-size:16px;font-weight:700;${BASE}margin-right:10px;vertical-align:middle;">${initial}</span>
          ${fromName ? `<span style="color:#fff;font-size:17px;font-weight:600;${BASE}vertical-align:middle;">${escapeHtml(fromName)}</span>` : ''}
        </td></tr>
        <tr><td style="padding:28px 32px;${BASE}color:#1f2937;font-size:15px;line-height:1.6;">${safe}</td></tr>
        <tr><td style="padding:14px 32px 20px;border-top:1px solid #e5e7eb;background:#f9fafb;"><p style="margin:0;${BASE}font-size:12px;color:#9ca3af;text-align:center;">E-mail enviado automaticamente.</p></td></tr>
      </table>${WRAP_END}</body></html>`;
  }

  if (templateId === 'professional') {
    return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7;">${WRAP}
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:12px;overflow:hidden;border-top:4px solid ${color};">
        ${fromName ? `<tr><td style="padding:20px 32px 16px;border-bottom:1px solid #e5e7eb;"><p style="margin:0;${BASE}font-size:16px;font-weight:700;color:#111827;">${escapeHtml(fromName)}</p></td></tr>` : ''}
        <tr><td style="padding:28px 32px;${BASE}color:#1f2937;font-size:15px;line-height:1.6;">${safe}</td></tr>
        <tr><td style="padding:16px 32px 20px;border-top:1px solid #e5e7eb;"><p style="margin:0;${BASE}font-size:12px;color:#9ca3af;">Atenciosamente${fromName ? `,<br><strong style="color:#6b7280;">${escapeHtml(fromName)}</strong>` : '.'}</p></td></tr>
      </table>${WRAP_END}</body></html>`;
  }

  if (templateId === 'modern') {
    return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7;">${WRAP}
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:28px 32px 0;">
          <div style="width:40px;height:4px;background:${color};border-radius:2px;margin-bottom:16px;"></div>
          ${fromName ? `<p style="margin:0 0 18px;${BASE}font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${color};">${escapeHtml(fromName)}</p>` : ''}
        </td></tr>
        <tr><td style="padding:0 32px 28px;${BASE}color:#1f2937;font-size:15px;line-height:1.6;">${safe}${signature}</td></tr>
      </table>${WRAP_END}</body></html>`;
  }

  // minimal (default)
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7;">${WRAP}
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border:1px solid #e5e7eb;border-radius:12px;">
      <tr><td style="padding:28px 32px;${BASE}color:#1f2937;font-size:15px;line-height:1.6;">${safe}${signature}</td></tr>
    </table>${WRAP_END}</body></html>`;
}

async function sendViaResend(apiKey: string, from: string, to: string, subject: string, text: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Erro ao enviar e-mail via Resend.');
}

async function sendViaSendgrid(apiKey: string, from: string, to: string, subject: string, text: string, html: string) {
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      // SendGrid exige text/plain antes de text/html.
      content: [{ type: 'text/plain', value: text }, { type: 'text/html', value: html }],
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
  from: string, to: string, subject: string, text: string, html: string,
) {
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
  });
  await transporter.sendMail({ from, to, subject, text, html });
}

// Envia via Gmail API usando o refresh token obtido no "Entrar com Google".
async function sendViaGoogle(refreshToken: string, from: string, to: string, subject: string, text: string, html: string) {
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

  // Monta a mensagem RFC 822 multipart/alternative (texto puro + HTML).
  // Assunto codificado em MIME para suportar acentos.
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
  const boundary = `bp_${Date.now()}`;
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(text, 'utf-8').toString('base64'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html, 'utf-8').toString('base64'),
    '',
    `--${boundary}--`,
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
  const { provider, apiKey, fromEmail, fromName, templateId, brandColor } = config as {
    provider: string; apiKey?: string; fromEmail: string; fromName?: string; templateId?: string; brandColor?: string;
  };

  if (!fromEmail) {
    return NextResponse.json({ error: 'Provedor de e-mail não configurado corretamente.' }, { status: 400 });
  }

  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  const html = buildEmailHtml(body, fromName, templateId, brandColor);

  try {
    if (provider === 'sendgrid') {
      if (!apiKey) throw new Error('Chave de API ausente.');
      await sendViaSendgrid(apiKey, fromEmail, to, subject, body, html);
    } else if (provider === 'smtp') {
      if (!config.host || !config.user || !config.pass) throw new Error('Dados de SMTP incompletos.');
      await sendViaSmtp(
        { host: config.host, port: Number(config.port) || 465, secure: config.secure !== false, user: config.user, pass: config.pass },
        from, to, subject, body, html,
      );
    } else if (provider === 'google') {
      if (!config.refreshToken) throw new Error('Conta Google não autorizada. Reconecte via SMTP.');
      await sendViaGoogle(config.refreshToken, from, to, subject, body, html);
    } else {
      if (!apiKey) throw new Error('Chave de API ausente.');
      await sendViaResend(apiKey, from, to, subject, body, html);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
