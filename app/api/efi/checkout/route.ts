import { NextRequest, NextResponse } from "next/server";
import { requireUser, getServiceSupabase } from "@/lib/api-auth";
import { BILLING_ITEMS, normalizeBillingItem } from "@/lib/billing/prices";
import {
  isEfiPixConfigured, isEfiCardConfigured,
  createPixCharge, getOrCreateEfiPlanId, createCardSubscription,
  type CardCustomer,
} from "@/lib/billing/efi";

// GET: quais métodos de pagamento estão habilitados (sem envs EFI_* o
// frontend mostra "pagamentos temporariamente indisponíveis").
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ pix: isEfiPixConfigured(), card: isEfiCardConfigured() });
}

type CheckoutBody = {
  item?: string;
  method?: "pix" | "card";
  addonRowId?: string; // renovação de add-on Pix: atualiza a linha em vez de inserir outra
  card?: { paymentToken: string; name: string; cpf: string; birth: string; phone: string };
};

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

  const body = await req.json() as CheckoutBody;
  const item = normalizeBillingItem(body.item || "");
  const billing = BILLING_ITEMS[item];
  if (!billing) return NextResponse.json({ error: "Item inválido." }, { status: 400 });

  const supabase = getServiceSupabase();

  try {
    // ── Pix: gera a cobrança do mês e devolve o QR ──────────────────────────
    if (body.method === "pix") {
      if (!isEfiPixConfigured()) {
        return NextResponse.json({ error: "Pix Efí não configurado." }, { status: 501 });
      }
      const pix = await createPixCharge(item);
      const { data: row, error } = await supabase.from("billing_charges").insert({
        user_id: userId,
        kind: billing.kind,
        item,
        amount_cents: billing.cents,
        method: "pix",
        txid: pix.txid,
        addon_row_id: body.addonRowId ?? null,
      }).select("id").single();
      if (error) throw new Error(`Falha ao registrar cobrança: ${error.message}`);

      return NextResponse.json({
        method: "pix",
        chargeId: row.id,
        qrImage: pix.qrImage,
        copiaECola: pix.copiaECola,
        amountCents: billing.cents,
      });
    }

    // ── Cartão: assinatura recorrente da Efí ────────────────────────────────
    if (body.method === "card") {
      if (!isEfiCardConfigured()) {
        return NextResponse.json({ error: "Cartão Efí não configurado." }, { status: 501 });
      }
      const card = body.card;
      if (!card?.paymentToken || !card.name || !card.cpf || !card.birth || !card.phone) {
        return NextResponse.json({ error: "Dados do cartão incompletos." }, { status: 400 });
      }

      const customer: CardCustomer = {
        name: card.name.trim(),
        cpf: card.cpf.replace(/\D/g, ""),
        email: auth.user.email || "",
        birth: card.birth,
        phone_number: card.phone.replace(/\D/g, ""),
      };

      const planId = await getOrCreateEfiPlanId(supabase, item);
      const origin = req.nextUrl.origin;
      const secret = process.env.EFI_WEBHOOK_SECRET || "";
      const sub = await createCardSubscription(
        planId, item, card.paymentToken, customer,
        `${origin}/api/efi/webhook/${secret}`,
        `${userId}|${item}`,
      );

      const { data: row, error } = await supabase.from("billing_charges").insert({
        user_id: userId,
        kind: billing.kind,
        item,
        amount_cents: billing.cents,
        method: "card",
        efi_subscription_id: sub.subscriptionId,
        addon_row_id: body.addonRowId ?? null,
      }).select("*").single();
      if (error) throw new Error(`Falha ao registrar cobrança: ${error.message}`);

      // Cartão aprovado na hora: libera sem esperar notificação.
      const paidNow = ["active", "paid", "approved", "identified", "settled"]
        .includes(sub.chargeStatus.toLowerCase());
      if (paidNow) {
        const { applyPaidCharge } = await import("@/lib/billing/activate");
        await applyPaidCharge(supabase, row as any);
        return NextResponse.json({ method: "card", chargeId: row.id, active: true });
      }
      return NextResponse.json({
        method: "card",
        chargeId: row.id,
        active: false,
        pending: true,
        status: sub.chargeStatus,
      });
    }

    return NextResponse.json({ error: "Método inválido (pix|card)." }, { status: 400 });
  } catch (e: any) {
    const detail = e?.error_description || e?.mensagem || e?.message || "Erro na Efí.";
    return NextResponse.json({ error: typeof detail === "string" ? detail : JSON.stringify(detail) }, { status: 500 });
  }
}
