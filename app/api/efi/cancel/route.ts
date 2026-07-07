import { NextRequest, NextResponse } from "next/server";
import { requireUser, getServiceSupabase } from "@/lib/api-auth";
import { cancelEfiSubscription } from "@/lib/billing/efi";

// Cancela a assinatura Efí do usuário logado.
// Sem body: cancela o plano principal (cartão) ou marca o plano Pix como
// cancelado (Pix não tem recorrência — só não renova).
// Com { addonRowId }: cancela aquele add-on.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

  let body: { addonRowId?: string } = {};
  try { body = await req.json(); } catch { /* body opcional */ }

  const supabase = getServiceSupabase();

  try {
    if (body.addonRowId) {
      const { data: addon } = await supabase
        .from("user_addons").select("id, user_id, efi_subscription_id")
        .eq("id", body.addonRowId).single();
      if (!addon || addon.user_id !== userId) {
        return NextResponse.json({ error: "Complemento não encontrado." }, { status: 404 });
      }
      if (addon.efi_subscription_id) await cancelEfiSubscription(addon.efi_subscription_id);
      await supabase.from("user_addons").update({ status: "canceled" }).eq("id", addon.id);
      return NextResponse.json({ canceled: true });
    }

    const { data: profile } = await supabase
      .from("profiles").select("efi_subscription_id, current_period_end")
      .eq("id", userId).single();

    if (profile?.efi_subscription_id) {
      await cancelEfiSubscription(profile.efi_subscription_id);
    }
    // Mantém o acesso até o fim do período já pago.
    await supabase.from("profiles").update({
      subscription_status: "canceled",
      efi_subscription_id: null,
    }).eq("id", userId);

    return NextResponse.json({ canceled: true, accessUntil: profile?.current_period_end ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erro ao cancelar." }, { status: 500 });
  }
}
