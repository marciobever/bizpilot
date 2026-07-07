// Cliente Efí (ex-Gerencianet) — PSP único do BizPilot.
// Pix usa mTLS (certificado .p12 em base64 na env); cartão usa só client/secret.
// Sem as envs setadas, isEfiPixConfigured/isEfiCardConfigured retornam false e
// o checkout cai no fallback Stripe — mesmo padrão de gate do Awin.

import EfiPay from "sdk-node-apis-efi";
import { BILLING_ITEMS, centsToReais } from "./prices";
import type { SupabaseClient } from "@supabase/supabase-js";

function sandbox(): boolean {
  return process.env.EFI_SANDBOX !== "false"; // default: homologação
}

export function isEfiPixConfigured(): boolean {
  return !!(
    process.env.EFI_CLIENT_ID &&
    process.env.EFI_CLIENT_SECRET &&
    process.env.EFI_CERT_BASE64 &&
    process.env.EFI_PIX_KEY
  );
}

export function isEfiCardConfigured(): boolean {
  return !!(
    process.env.EFI_CLIENT_ID &&
    process.env.EFI_CLIENT_SECRET &&
    process.env.NEXT_PUBLIC_EFI_PAYEE_CODE
  );
}

export function getEfi(): any {
  return new EfiPay({
    sandbox: sandbox(),
    client_id: process.env.EFI_CLIENT_ID!,
    client_secret: process.env.EFI_CLIENT_SECRET!,
    certificate: process.env.EFI_CERT_BASE64,
    cert_base64: true,
  });
}

// ── Pix ──────────────────────────────────────────────────────────────────────

export type PixCharge = {
  txid: string;
  copiaECola: string;
  qrImage: string; // data:image/png;base64
};

export async function createPixCharge(item: string): Promise<PixCharge> {
  const billing = BILLING_ITEMS[item];
  if (!billing) throw new Error(`Item de cobrança desconhecido: ${item}`);
  const efi = getEfi();

  const cob = await efi.pixCreateImmediateCharge({}, {
    calendario: { expiracao: 3600 },
    valor: { original: centsToReais(billing.cents) },
    chave: process.env.EFI_PIX_KEY!,
    solicitacaoPagador: billing.name,
  });

  const qr = await efi.pixGenerateQRCode({ id: cob.loc.id });
  return {
    txid: cob.txid,
    copiaECola: qr.qrcode || cob.pixCopiaECola,
    qrImage: qr.imagemQrcode,
  };
}

// Status CONCLUIDA = pago. ATIVA = aguardando; REMOVIDA_* = expirada/cancelada.
export async function pixChargeStatus(txid: string): Promise<string> {
  const efi = getEfi();
  const cob = await efi.pixDetailCharge({ txid });
  return cob.status as string;
}

// ── Cartão (assinatura recorrente da Efí) ────────────────────────────────────

// Planos de cartão são criados sob demanda na Efí (uma vez por item) e
// cacheados em efi_plans — o equivalente aos Price IDs da Stripe.
export async function getOrCreateEfiPlanId(supabase: SupabaseClient, item: string): Promise<number> {
  const { data: cached } = await supabase.from("efi_plans").select("plan_id").eq("name", item).maybeSingle();
  if (cached?.plan_id) return Number(cached.plan_id);

  const billing = BILLING_ITEMS[item];
  const efi = getEfi();
  // interval 1 = mensal; repeats null = até cancelar.
  const created = await efi.createPlan({}, { name: billing.name, interval: 1, repeats: null });
  const planId = Number(created.data.plan_id);
  await supabase.from("efi_plans").insert({ name: item, plan_id: planId });
  return planId;
}

export type CardCustomer = {
  name: string;
  cpf: string;
  email: string;
  birth: string;        // YYYY-MM-DD
  phone_number: string; // só dígitos
};

export type CardSubscriptionResult = {
  subscriptionId: string;
  status: string;       // new | active | canceled ... (status da assinatura)
  chargeStatus: string; // waiting | paid | unpaid ... (primeira cobrança)
};

export async function createCardSubscription(
  planId: number,
  item: string,
  paymentToken: string,
  customer: CardCustomer,
  notificationUrl: string,
  customId: string,
): Promise<CardSubscriptionResult> {
  const billing = BILLING_ITEMS[item];
  const efi = getEfi();
  const res = await efi.oneStepSubscription({ id: planId }, {
    items: [{ name: billing.name, value: billing.cents, amount: 1 }],
    metadata: { notification_url: notificationUrl, custom_id: customId },
    payment: {
      credit_card: {
        installments: 1,
        payment_token: paymentToken,
        customer,
      },
    },
  });
  const data = res.data || {};
  return {
    subscriptionId: String(data.subscription_id ?? data.id ?? ""),
    status: String(data.status ?? ""),
    chargeStatus: String(data.charge?.status ?? data.status ?? ""),
  };
}

export async function cancelEfiSubscription(subscriptionId: string): Promise<void> {
  const efi = getEfi();
  await efi.cancelSubscription({ id: Number(subscriptionId) });
}

// Notificações de cartão: a Efí manda um token e a gente busca o histórico.
export async function getEfiNotification(token: string): Promise<any[]> {
  const efi = getEfi();
  const res = await efi.getNotification({ token });
  return res.data || [];
}
