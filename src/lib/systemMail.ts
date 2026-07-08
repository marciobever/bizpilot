import nodemailer from "nodemailer";

// E-mail transacional do BizPilot (a plataforma) pro dono da conta — distinto
// de app/api/email/send/route.ts, que é o AGENTE mandando e-mail pro LEAD com
// credenciais que o próprio usuário configura. Aqui é sempre a mesma caixa
// fixa (notificacao@bizpilot.com.br via Hostinger).
export async function sendSystemEmail(to: string, subject: string, text: string, html: string): Promise<void> {
  const host = process.env.SYSTEM_SMTP_HOST;
  const user = process.env.SYSTEM_SMTP_USER;
  const pass = process.env.SYSTEM_SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error("SYSTEM_SMTP_HOST/SYSTEM_SMTP_USER/SYSTEM_SMTP_PASS ausentes — e-mail de sistema não configurado.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SYSTEM_SMTP_PORT) || 465,
    secure: process.env.SYSTEM_SMTP_SECURE !== "false",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.SYSTEM_EMAIL_FROM || `BizPilot Alertas <${user}>`,
    to,
    subject,
    text,
    html,
  });
}
