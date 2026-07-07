// Ativação de acesso após pagamento Efí — chamada pelo confirm (volta do
// checkout) e pelo webhook. Idempotente: cobrança já paga não reprocessa.
// Escreve nos MESMOS campos que o fluxo Stripe usava (profiles.plan,
// subscription_status, current_period_end) — o gate do painel não muda.

import type { SupabaseClient } from "@supabase/supabase-js";
import { PIX_PERIOD_DAYS } from "./prices";

export type ChargeRow = {
  id: string;
  user_id: string;
  kind: "plan" | "addon";
  item: string;
  method: "pix" | "card";
  efi_subscription_id: string | null;
  addon_row_id: string | null;
  status: string;
};

function nextPeriodEnd(currentEnd: string | null): string {
  const base = currentEnd && new Date(currentEnd) > new Date() ? new Date(currentEnd) : new Date();
  base.setDate(base.getDate() + PIX_PERIOD_DAYS);
  return base.toISOString();
}

// Marca a cobrança como paga e libera o acesso correspondente.
// Retorna false se a cobrança já tinha sido processada (idempotência).
export async function applyPaidCharge(supabase: SupabaseClient, charge: ChargeRow): Promise<boolean> {
  // Claim atômico: só o primeiro update pending→paid processa a liberação.
  const { data: claimed } = await supabase
    .from("billing_charges")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", charge.id)
    .eq("status", "pending")
    .select("id");
  if (!claimed || claimed.length === 0) return false;

  if (charge.kind === "plan") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_period_end")
      .eq("id", charge.user_id)
      .single();

    const update: Record<string, any> = {
      plan: charge.item,
      subscription_status: "active",
      billing_provider: "efi",
      current_period_end: nextPeriodEnd(profile?.current_period_end ?? null),
    };
    if (charge.method === "card" && charge.efi_subscription_id) {
      update.efi_subscription_id = charge.efi_subscription_id;
    }
    await supabase.from("profiles").update(update).eq("id", charge.user_id);
    return true;
  }

  // Add-on: renovação atualiza a linha existente; compra nova insere outra
  // (o limite efetivo conta linhas ativas — 2x addon_bot = +2 bots).
  if (charge.addon_row_id) {
    const { data: row } = await supabase
      .from("user_addons")
      .select("current_period_end")
      .eq("id", charge.addon_row_id)
      .single();
    await supabase.from("user_addons").update({
      status: "active",
      current_period_end: nextPeriodEnd(row?.current_period_end ?? null),
    }).eq("id", charge.addon_row_id);
  } else {
    await supabase.from("user_addons").insert({
      user_id: charge.user_id,
      addon_id: charge.item,
      status: "active",
      current_period_end: nextPeriodEnd(null),
      efi_subscription_id: charge.method === "card" ? charge.efi_subscription_id : null,
    });
  }
  return true;
}

// Renovação/cancelamento vindos das notificações de cartão da Efí.
export async function applyCardSubscriptionStatus(
  supabase: SupabaseClient,
  subscriptionId: string,
  status: "paid" | "unpaid" | "canceled",
): Promise<void> {
  const subId = String(subscriptionId);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, current_period_end")
    .eq("efi_subscription_id", subId)
    .maybeSingle();

  if (profile) {
    if (status === "paid") {
      await supabase.from("profiles").update({
        subscription_status: "active",
        current_period_end: nextPeriodEnd(profile.current_period_end ?? null),
      }).eq("id", profile.id);
    } else {
      await supabase.from("profiles").update({
        subscription_status: status === "canceled" ? "canceled" : "past_due",
      }).eq("id", profile.id);
    }
    return;
  }

  const { data: addon } = await supabase
    .from("user_addons")
    .select("id, current_period_end")
    .eq("efi_subscription_id", subId)
    .maybeSingle();

  if (addon) {
    if (status === "paid") {
      await supabase.from("user_addons").update({
        status: "active",
        current_period_end: nextPeriodEnd(addon.current_period_end ?? null),
      }).eq("id", addon.id);
    } else {
      await supabase.from("user_addons").update({ status: "canceled" }).eq("id", addon.id);
    }
  }
}
