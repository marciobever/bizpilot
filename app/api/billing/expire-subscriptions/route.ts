import { NextRequest, NextResponse } from "next/server";
import { requireInternalSecret, getServiceSupabase } from "@/lib/api-auth";
import { GRACE_DAYS } from "@/lib/billing/prices";
import { sendRenewalReminderEmail, sendTrialEndingEmail, sendSuspendedEmail } from "@/lib/billing/notices";
import { reconcileCardSubscriptions } from "@/lib/billing/reconcile";

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

  // -1. Reconciliação de cartão ANTES de qualquer rebaixamento: se a Efí
  // cobrou e o webhook se perdeu, credita o período agora — senão o passo 1
  // rebaixaria um cliente que pagou.
  const reconciled = await reconcileCardSubscriptions(supabase);

  // 0. Dunning (e-mails são deduplicados por período em billing_notices):
  //    Pix vencendo em até 3 dias (quem tem cartão renova sozinho) e trial
  //    acabando em até 2 dias.
  let remindersSent = 0;
  const in3days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: expiring } = await supabase
    .from("profiles")
    .select("id, current_period_end")
    .eq("billing_provider", "efi")
    .eq("subscription_status", "active")
    .is("efi_subscription_id", null)
    .gte("current_period_end", now)
    .lte("current_period_end", in3days);
  for (const p of expiring ?? []) {
    await sendRenewalReminderEmail(supabase, p.id, p.current_period_end);
    remindersSent++;
  }

  const in2days = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
  const { data: trialsEnding } = await supabase
    .from("profiles")
    .select("id, current_period_end")
    .eq("billing_provider", "efi")
    .eq("subscription_status", "trialing")
    .gte("current_period_end", now)
    .lte("current_period_end", in2days);
  for (const p of trialsEnding ?? []) {
    await sendTrialEndingEmail(supabase, p.id, p.current_period_end);
    remindersSent++;
  }

  // 1. Ativa com período vencido além da carência → past_due.
  const { data: expired, error } = await supabase
    .from("profiles")
    .select("id, current_period_end")
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
    for (const p of expired ?? []) {
      await sendSuspendedEmail(supabase, p.id, p.current_period_end, false);
    }
  }

  // 1b. Trial vencido → incomplete (sem carência: trial vale até a data).
  const { data: trialEnded, error: trialError } = await supabase
    .from("profiles")
    .select("id, current_period_end")
    .eq("billing_provider", "efi")
    .eq("subscription_status", "trialing")
    .lt("current_period_end", now);
  if (trialError) return NextResponse.json({ error: trialError.message }, { status: 500 });

  const trialEndedIds = (trialEnded ?? []).map((p) => p.id);
  if (trialEndedIds.length > 0) {
    const { error: updError } = await supabase
      .from("profiles")
      .update({ subscription_status: "incomplete" })
      .in("id", trialEndedIds);
    if (updError) return NextResponse.json({ error: updError.message }, { status: 500 });
    for (const p of trialEnded ?? []) {
      await sendSuspendedEmail(supabase, p.id, p.current_period_end, true);
    }
  }

  // 2. Desliga agentes de quem está sem acesso: past_due (inclui os recém-
  // rebaixados) e cancelados com o período pago já encerrado (cancelado mantém
  // acesso até o fim do período, sem carência). Idempotente: só toca agente
  // 'online', e o gate do runtime já bloqueia se o usuário religar na mão.
  const { data: locked } = await supabase
    .from("profiles")
    .select("id")
    .eq("billing_provider", "efi")
    .or(`subscription_status.eq.past_due,subscription_status.eq.incomplete,and(subscription_status.eq.canceled,current_period_end.lt.${now})`);
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

  return NextResponse.json({ downgraded: expiredIds.length, trials_ended: trialEndedIds.length, agents_paused: agentsPaused, reminders_sent: remindersSent, card_reconciled: reconciled });
}
