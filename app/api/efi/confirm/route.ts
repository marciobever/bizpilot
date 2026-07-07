import { NextRequest, NextResponse } from "next/server";
import { requireUser, getServiceSupabase } from "@/lib/api-auth";
import { isEfiPixConfigured, pixChargeStatus, getEfi } from "@/lib/billing/efi";
import { applyPaidCharge, type ChargeRow } from "@/lib/billing/activate";

// Confirma o pagamento consultando a Efí direto — a ativação NÃO depende
// do webhook. O checkout faz polling aqui enquanto o QR está na tela.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const { chargeId } = await req.json() as { chargeId?: string };
  if (!chargeId) return NextResponse.json({ error: "chargeId obrigatório." }, { status: 400 });

  const supabase = getServiceSupabase();
  const { data: charge } = await supabase
    .from("billing_charges")
    .select("*")
    .eq("id", chargeId)
    .single();

  if (!charge) return NextResponse.json({ error: "Cobrança não encontrada." }, { status: 404 });
  // A cobrança precisa ser do usuário logado (não ativar plano alheio).
  if (charge.user_id !== auth.user.id) {
    return NextResponse.json({ error: "Esta cobrança não pertence à sua conta." }, { status: 403 });
  }

  if (charge.status === "paid") return NextResponse.json({ active: true });

  try {
    if (charge.method === "pix") {
      if (!isEfiPixConfigured()) return NextResponse.json({ error: "Efí não configurada." }, { status: 501 });
      const status = await pixChargeStatus(charge.txid);
      if (status === "CONCLUIDA") {
        await applyPaidCharge(supabase, charge as ChargeRow);
        return NextResponse.json({ active: true });
      }
      const expired = status.startsWith("REMOVIDA");
      if (expired) {
        await supabase.from("billing_charges").update({ status: "expired" }).eq("id", charge.id).eq("status", "pending");
      }
      return NextResponse.json({ active: false, expired });
    }

    // Cartão pendente: consulta a assinatura.
    if (charge.method === "card" && charge.efi_subscription_id) {
      const efi = getEfi();
      const res = await efi.detailSubscription({ id: Number(charge.efi_subscription_id) });
      const subStatus = String(res?.data?.status ?? "").toLowerCase();
      const history: any[] = res?.data?.history || [];
      const lastCharge = history[history.length - 1];
      const st = String(lastCharge?.status ?? "").toLowerCase();

      // Cobrança recusada/cancelada: encerra.
      const failed = ["unpaid", "refused", "canceled"].includes(st) || subStatus === "canceled";
      if (failed) {
        await supabase.from("billing_charges").update({ status: "failed" }).eq("id", charge.id).eq("status", "pending");
        return NextResponse.json({ active: false, failed: true, status: st || subStatus });
      }

      // A autorização do cartão é síncrona na criação (recusa viraria erro na
      // hora). Assinatura "active" = cartão autorizado — libera o acesso; o
      // "waiting" é só a liquidação, e se a captura falhar depois a notificação
      // da Efí rebaixa pra past_due.
      const approved = subStatus === "active" || ["paid", "settled", "identified", "approved"].includes(st);
      if (approved) {
        await applyPaidCharge(supabase, charge as ChargeRow);
        return NextResponse.json({ active: true });
      }
      return NextResponse.json({ active: false, status: st || subStatus });
    }

    return NextResponse.json({ active: false });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro ao consultar a Efí." }, { status: 500 });
  }
}
