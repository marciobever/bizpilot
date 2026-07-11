import { NextRequest, NextResponse } from "next/server";
import { requireUser, getServiceSupabase } from "@/lib/api-auth";
import { normalizePlan } from "@/lib/plans";

// Define em qual plano o trial roda (o trigger handle_new_user cria todo mundo
// como starter/trialing; quem veio de /precos escolhendo Pro ou Business testa
// o plano que escolheu). Só mexe no campo plan e SÓ enquanto está em trial —
// não estende prazo, não muda status, não vale pra quem já pagou.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const plan = normalizePlan(typeof body.plan === "string" ? body.plan : "");

  const supabase = getServiceSupabase();
  const { error } = await supabase
    .from("profiles")
    .update({ plan })
    .eq("id", auth.user.id)
    .eq("subscription_status", "trialing");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, plan });
}
