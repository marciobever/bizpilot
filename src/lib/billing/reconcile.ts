// Reconciliação diária das assinaturas de cartão Efí.
// O webhook de notificação é o caminho principal; isto aqui é a rede de
// segurança: se a notificação se perder, a Efí cobra o cartão do cliente mas
// current_period_end não avança — e o cliente pagante seria bloqueado.
// Regras:
//  - Só olha assinaturas cujo período JÁ venceu pelos nossos registros
//    (se está em dia, não há o que reconciliar).
//  - Cada cobrança da Efí é creditada UMA vez: fica registrada em
//    billing_charges com txid "cardrecon_<chargeId>" — sem isso, rodar o job
//    todo dia estenderia o período todo dia.
//  - Cobrança paga só conta se for mais nova que (period_end - 25 dias):
//    exclui a primeira cobrança do ciclo anterior, que já foi creditada
//    no checkout.

import type { SupabaseClient } from "@supabase/supabase-js";
import { isEfiCardConfigured, getEfiSubscriptionDetail } from "./efi";
import { applyCardSubscriptionStatus } from "./activate";
import { BILLING_ITEMS } from "./prices";

type Candidate = {
  subscriptionId: string;
  userId: string;
  item: string;               // plano ou addon_id — só para registrar a cobrança
  kind: "plan" | "addon";
  periodEnd: string | null;
};

async function reconcileOne(supabase: SupabaseClient, c: Candidate): Promise<boolean> {
  let detail: Awaited<ReturnType<typeof getEfiSubscriptionDetail>>;
  try {
    detail = await getEfiSubscriptionDetail(c.subscriptionId);
  } catch (e) {
    console.error(`[reconcile] falha ao consultar assinatura ${c.subscriptionId}:`, e);
    return false;
  }

  if (detail.status === "canceled") {
    await applyCardSubscriptionStatus(supabase, c.subscriptionId, "canceled");
    return false;
  }

  // Cobrança paga mais recente que ainda não creditamos.
  const cutoffMs = c.periodEnd
    ? new Date(c.periodEnd).getTime() - 25 * 24 * 60 * 60 * 1000
    : 0;
  const paid = detail.charges
    .filter((ch) => ch.status === "paid" && new Date(ch.createdAt).getTime() > cutoffMs)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  if (!paid) return false;

  const reconKey = `cardrecon_${paid.chargeId}`;
  const { data: existing } = await supabase
    .from("billing_charges").select("id").eq("txid", reconKey).maybeSingle();
  if (existing) return false; // já creditada (por rodada anterior)

  const billing = BILLING_ITEMS[c.item];
  await supabase.from("billing_charges").insert({
    user_id: c.userId,
    kind: c.kind,
    item: c.item,
    amount_cents: billing?.cents ?? 0,
    method: "card",
    txid: reconKey,
    status: "paid",
    paid_at: new Date().toISOString(),
  });
  await applyCardSubscriptionStatus(supabase, c.subscriptionId, "paid");
  console.warn(`[reconcile] cobrança ${paid.chargeId} creditada via reconciliação (assinatura ${c.subscriptionId}) — webhook não tinha processado.`);
  return true;
}

// Retorna quantas assinaturas foram creditadas.
export async function reconcileCardSubscriptions(supabase: SupabaseClient): Promise<number> {
  if (!isEfiCardConfigured()) return 0;
  const now = new Date().toISOString();
  let credited = 0;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, plan, efi_subscription_id, current_period_end, subscription_status")
    .eq("billing_provider", "efi")
    .not("efi_subscription_id", "is", null)
    .in("subscription_status", ["active", "past_due"])
    .lt("current_period_end", now);
  for (const p of profiles ?? []) {
    if (await reconcileOne(supabase, {
      subscriptionId: String(p.efi_subscription_id),
      userId: p.id,
      item: p.plan || "starter",
      kind: "plan",
      periodEnd: p.current_period_end,
    })) credited++;
  }

  const { data: addons } = await supabase
    .from("user_addons")
    .select("id, user_id, addon_id, efi_subscription_id, current_period_end")
    .not("efi_subscription_id", "is", null)
    .eq("status", "active")
    .lt("current_period_end", now);
  for (const a of addons ?? []) {
    if (await reconcileOne(supabase, {
      subscriptionId: String(a.efi_subscription_id),
      userId: a.user_id,
      item: a.addon_id,
      kind: "addon",
      periodEnd: a.current_period_end,
    })) credited++;
  }

  return credited;
}
