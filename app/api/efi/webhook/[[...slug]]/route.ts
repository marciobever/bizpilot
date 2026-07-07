import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/api-auth";
import { pixChargeStatus, getEfiNotification, isEfiPixConfigured } from "@/lib/billing/efi";
import { applyPaidCharge, applyCardSubscriptionStatus, type ChargeRow } from "@/lib/billing/activate";

// Webhook Efí. Registrado como /api/efi/webhook/<EFI_WEBHOOK_SECRET> — o
// segredo vai no PATH (não em query string) porque a Efí anexa "/pix" ao fim
// da URL cadastrada nas notificações de Pix. Catch-all cobre:
//   /api/efi/webhook/<secret>       → validação no cadastro + cartão
//   /api/efi/webhook/<secret>/pix   → Pix recebido
// O webhook é reforço: a ativação principal acontece no /api/efi/confirm.

function authorized(req: NextRequest): boolean {
  const secret = process.env.EFI_WEBHOOK_SECRET;
  if (!secret) return false;
  const parts = req.nextUrl.pathname.split("/").filter(Boolean); // api, efi, webhook, <secret>, [pix]
  return parts[3] === secret;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any = {};
  try { body = await req.json(); } catch { /* cadastro do webhook manda body vazio */ }

  const supabase = getServiceSupabase();

  try {
    // ── Pix recebido: {"pix": [{txid, valor, horario, ...}]} ────────────────
    if (Array.isArray(body?.pix)) {
      for (const evt of body.pix) {
        if (!evt?.txid) continue;
        const { data: charge } = await supabase
          .from("billing_charges").select("*").eq("txid", evt.txid).maybeSingle();
        if (!charge || charge.status !== "pending") continue;
        // Reconfere na Efí antes de liberar (não confia só no POST recebido).
        if (isEfiPixConfigured() && (await pixChargeStatus(evt.txid)) === "CONCLUIDA") {
          await applyPaidCharge(supabase, charge as ChargeRow);
        }
      }
      return NextResponse.json({ ok: true });
    }

    // ── Cartão: {"notification": "<token>"} → busca o histórico na Efí ──────
    if (typeof body?.notification === "string") {
      const events = await getEfiNotification(body.notification);
      // Interessa o último evento de status da assinatura/cobrança.
      const last = [...events].reverse().find((e: any) => e?.type === "subscription_charge" || e?.type === "subscription" || e?.status);
      const status = String(last?.status?.current ?? "").toLowerCase();
      const subscriptionId = last?.identifiers?.subscription_id ?? last?.identifiers?.charge_id;
      if (subscriptionId && status) {
        if (status === "paid" || status === "settled") {
          await applyCardSubscriptionStatus(supabase, String(subscriptionId), "paid");
        } else if (status === "unpaid") {
          await applyCardSubscriptionStatus(supabase, String(subscriptionId), "unpaid");
        } else if (status === "canceled" || status === "expired") {
          await applyCardSubscriptionStatus(supabase, String(subscriptionId), "canceled");
        }
      }
      return NextResponse.json({ ok: true });
    }

    // Requisição de validação da Efí (cadastro do webhook) ou payload novo.
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    // 200 mesmo com erro interno: a Efí re-tenta e o confirm cobre o caminho feliz.
    console.error("[efi/webhook]", e?.message || e);
    return NextResponse.json({ ok: true });
  }
}
