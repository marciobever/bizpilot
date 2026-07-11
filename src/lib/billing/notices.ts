// E-mails transacionais de billing (recibo, aviso de vencimento, suspensão).
// Todos best-effort: falha de e-mail nunca pode travar ativação nem o job de
// expiração. Idempotência via billing_notices: um aviso por (user, kind,
// period_end) — se o envio falhar, a linha é removida pra tentar de novo
// na próxima rodada do job.

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendSystemEmail } from "@/lib/systemMail";
import { BILLING_ITEMS, centsToReais } from "./prices";

const APP_URL = () => process.env.APP_BASE_URL || "https://bizpilot.com.br";

export async function getUserEmail(supabase: SupabaseClient, userId: string): Promise<string | null> {
  try {
    const { data } = await supabase.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

function layoutHtml(title: string, bodyHtml: string, ctaLabel: string, ctaPath: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a2e">
    <h2 style="margin:0 0 16px">${title}</h2>
    ${bodyHtml}
    <p style="margin:28px 0">
      <a href="${APP_URL()}${ctaPath}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold">${ctaLabel}</a>
    </p>
    <p style="color:#888;font-size:12px;margin-top:32px">BizPilot — atendimento inteligente no WhatsApp.<br/>Dúvidas? Responda este e-mail ou fale com o suporte no painel.</p>
  </div>`;
}

// Envia no máximo uma vez por (user, kind, periodEnd). Retorna se enviou.
export async function sendBillingNoticeOnce(
  supabase: SupabaseClient,
  userId: string,
  kind: string,
  periodEnd: string,
  subject: string,
  text: string,
  html: string,
): Promise<boolean> {
  const { error: insertError } = await supabase
    .from("billing_notices")
    .insert({ user_id: userId, kind, period_end: periodEnd });
  if (insertError) return false; // já enviado neste período (PK) ou tabela indisponível

  const email = await getUserEmail(supabase, userId);
  if (!email) return false;

  try {
    await sendSystemEmail(email, subject, text, html);
    return true;
  } catch (e) {
    // Libera pra nova tentativa na próxima rodada do job.
    await supabase.from("billing_notices").delete()
      .match({ user_id: userId, kind, period_end: periodEnd });
    console.error(`[billing] falha ao enviar e-mail ${kind} para ${userId}:`, e);
    return false;
  }
}

// Recibo de pagamento confirmado (Pix ou cartão). Chamado na ativação.
export async function sendReceiptEmail(
  supabase: SupabaseClient,
  userId: string,
  item: string,
  method: "pix" | "card",
  periodEnd: string,
): Promise<void> {
  const billing = BILLING_ITEMS[item];
  if (!billing) return;
  const valor = `R$ ${centsToReais(billing.cents).replace(".", ",")}`;
  const ate = new Date(periodEnd).toLocaleDateString("pt-BR");
  const meio = method === "pix" ? "Pix" : "cartão de crédito";

  await sendBillingNoticeOnce(
    supabase, userId, "receipt", periodEnd,
    `Pagamento confirmado — ${billing.name}`,
    `Recebemos seu pagamento de ${valor} (${meio}) referente a ${billing.name}. Seu acesso está garantido até ${ate}. Obrigado!`,
    layoutHtml(
      "Pagamento confirmado ✅",
      `<p>Recebemos seu pagamento de <strong>${valor}</strong> (${meio}) referente a <strong>${billing.name}</strong>.</p>
       <p>Seu acesso está garantido até <strong>${ate}</strong>.</p>`,
      "Abrir o painel", "/app",
    ),
  );
}

// Aviso D-3: Pix mensal vence em breve (só pra quem não tem renovação automática).
export async function sendRenewalReminderEmail(
  supabase: SupabaseClient,
  userId: string,
  periodEnd: string,
): Promise<void> {
  const ate = new Date(periodEnd).toLocaleDateString("pt-BR");
  await sendBillingNoticeOnce(
    supabase, userId, "renewal_d3", periodEnd,
    "Sua assinatura BizPilot vence em breve",
    `Sua assinatura vence em ${ate}. Renove com um novo Pix para o seu agente continuar atendendo sem pausa.`,
    layoutHtml(
      "Sua assinatura vence em breve",
      `<p>Sua assinatura do BizPilot vale até <strong>${ate}</strong>.</p>
       <p>Renove com um novo Pix e seu agente continua atendendo seus clientes sem nenhuma pausa. Após o vencimento há 7 dias de carência — depois disso o agente é pausado automaticamente.</p>`,
      "Renovar agora", "/app/settings?tab=plano",
    ),
  );
}

// Aviso: trial terminando em ~2 dias.
export async function sendTrialEndingEmail(
  supabase: SupabaseClient,
  userId: string,
  periodEnd: string,
): Promise<void> {
  const ate = new Date(periodEnd).toLocaleDateString("pt-BR");
  await sendBillingNoticeOnce(
    supabase, userId, "trial_ending", periodEnd,
    "Seu teste grátis do BizPilot está acabando",
    `Seu período de teste vai até ${ate}. Assine para o seu agente continuar atendendo depois disso.`,
    layoutHtml(
      "Seu teste grátis está acabando",
      `<p>Seu período de teste do BizPilot vai até <strong>${ate}</strong>.</p>
       <p>Gostou do atendimento automático? Assine agora e seu agente segue no ar sem interrupção — todo o que você configurou continua exatamente como está.</p>`,
      "Assinar agora", "/app/checkout",
    ),
  );
}

// Aviso: acesso suspenso (assinatura vencida além da carência ou trial encerrado).
export async function sendSuspendedEmail(
  supabase: SupabaseClient,
  userId: string,
  periodEnd: string,
  wasTrial: boolean,
): Promise<void> {
  await sendBillingNoticeOnce(
    supabase, userId, wasTrial ? "trial_ended" : "suspended", periodEnd,
    wasTrial ? "Seu teste grátis do BizPilot terminou" : "Seu agente BizPilot foi pausado",
    wasTrial
      ? "Seu período de teste terminou e seu agente foi pausado. Assine para reativar — tudo que você configurou continua salvo."
      : "Sua assinatura venceu e o período de carência terminou, então seu agente foi pausado. Renove para reativar — nada foi apagado.",
    layoutHtml(
      wasTrial ? "Seu teste terminou — que tal continuar?" : "Seu agente foi pausado",
      wasTrial
        ? `<p>Seu período de teste do BizPilot terminou e o seu agente foi pausado.</p>
           <p><strong>Nada foi apagado:</strong> agente, base de conhecimento e conversas continuam salvos. Assinando agora, tudo volta ao ar em minutos.</p>`
        : `<p>Sua assinatura venceu e o período de carência de 7 dias terminou, então seu agente foi pausado e parou de responder no WhatsApp.</p>
           <p><strong>Nada foi apagado:</strong> renove e tudo volta ao ar em minutos.</p>`,
      wasTrial ? "Assinar e reativar" : "Renovar e reativar", "/app/checkout",
    ),
  );
}
