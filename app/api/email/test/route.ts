import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Valida a credencial do provedor de e-mail consultando um endpoint
// autenticado simples. Usado pelo botão "Salvar Conexão" da integração "E-mail".
export async function POST(req: Request) {
  try {
    const { provider, apiKey, host, port, secure, user, pass } = await req.json();

    if (provider === 'smtp') {
      if (!host || !user || !pass) {
        return NextResponse.json({ success: false, error: 'Informe servidor, usuário e senha do SMTP.' }, { status: 400 });
      }
      const transporter = nodemailer.createTransport({
        host,
        port: Number(port) || 465,
        secure: secure !== false,
        auth: { user, pass },
      });
      try {
        await transporter.verify();
        return NextResponse.json({ success: true });
      } catch (e: any) {
        const msg = e?.message || 'Não foi possível conectar ao servidor SMTP.';
        const hint = /auth|credenc|password|username|5\.7\.\d/i.test(msg)
          ? ' Para o Gmail, use uma "Senha de app" (não a senha normal da conta).'
          : '';
        return NextResponse.json({ success: false, error: msg + hint }, { status: 400 });
      }
    }

    if (!provider || !apiKey) {
      return NextResponse.json({ success: false, error: 'Informe o provedor e a chave de API.' }, { status: 400 });
    }

    if (provider === 'resend') {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json({ success: false, error: data?.message || 'Chave de API inválida.' }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (provider === 'sendgrid') {
      const res = await fetch('https://api.sendgrid.com/v3/user/profile', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json({ success: false, error: data?.errors?.[0]?.message || 'Chave de API inválida.' }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Provedor não suportado.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
