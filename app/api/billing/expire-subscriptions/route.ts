import { NextRequest, NextResponse } from "next/server";
import { requireInternalSecret, getServiceSupabase } from "@/lib/api-auth";
import { GRACE_DAYS } from "@/lib/billing/prices";

// Varredura diária (chamada pelo Windmill via schedule, com x-internal-secret):
// rebaixa para past_due toda assinatura Efí "active" cujo período pago venceu
// há mais de GRACE_DAYS, e desliga (status offline) os agentes de quem perdeu
// o acesso. Complemento server-side do gate do painel (app/app/layout.tsx) e
// do runtime (windmill/2_ai_processor.ts) — sem isso, subscription_status
// ficaria 'active' no banco para sempre após um único Pix.
export async function POST(req: NextRequest) {
  const auth = requireInternalSecret(req);
  if (!auth.ok) return auth.response;

  const supabase = getServiceSupabase();
  const now = new Date().toISOString();
  const graceCutoff = new Date(Date.now() - GRACE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // 1. Ativa com período vencido além da carência → past_due.
  const { data: expired, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("billing_provider", "efi")
    .eq("subscription_status", "active")
    .lt("current_period_end", graceCutoff);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const expiredIds = (expired ?? []).map((p) => p.id);
  if (expiredIds.length > 0) {
    const { error: updError } = await supabase
      .from("profiles")
      .update({ subscription_status: "past_due" })
      .in("id", expiredIds);
    if (updError) return NextResponse.json({ error: updError.message }, { status: 500 });
  }

  // 2. Desliga agentes de quem está sem acesso: past_due (inclui os recém-
  // rebaixados) e cancelados com o período pago já encerrado (cancelado mantém
  // acesso até o fim do período, sem carência). Idempotente: só toca agente
  // 'online', e o gate do runtime já bloqueia se o usuário religar na mão.
  const { data: locked } = await supabase
    .from("profiles")
    .select("id")
    .eq("billing_provider", "efi")
    .or(`subscription_status.eq.past_due,and(subscription_status.eq.canceled,current_period_end.lt.${now})`);
  const lockedIds = (locked ?? []).map((p) => p.id);

  let agentsPaused = 0;
  if (lockedIds.length > 0) {
    const { data: paused, error: pauseError } = await supabase
      .from("agents")
      .update({ status: "offline" })
      .in("user_id", lockedIds)
      .eq("status", "online")
      .select("id");
    if (pauseError) return NextResponse.json({ error: pauseError.message }, { status: 500 });
    agentsPaused = paused?.length ?? 0;
  }

  return NextResponse.json({ downgraded: expiredIds.length, agents_paused: agentsPaused });
}
