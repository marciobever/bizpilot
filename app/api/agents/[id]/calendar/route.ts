import { NextRequest, NextResponse } from "next/server";
import { requireUser, getServiceSupabase, userOwnsAgent } from "@/lib/api-auth";

// Calendário específico de um agente (override do calendário da conta).
// GET: status do override + do calendário padrão da conta (pra UI comparar).
// POST: salva um calendário Cal.com/Calendly específico pra este bot (a
// validação das credenciais acontece antes, via /api/calendar/test).
// DELETE: remove o override — o agente volta a usar o calendário da conta.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const { id: agentId } = await params;
  if (!(await userOwnsAgent(agentId, auth.user.id))) {
    return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
  }

  const supabase = getServiceSupabase();
  const { data: agent } = await supabase.from("agents").select("user_id").eq("id", agentId).single();

  const [{ data: override }, { data: account }] = await Promise.all([
    supabase.from("agent_calendar_integrations").select("status, config").eq("agent_id", agentId).maybeSingle(),
    supabase.from("integrations").select("status, config").eq("user_id", agent?.user_id).eq("provider", "calendar").maybeSingle(),
  ]);

  return NextResponse.json({
    override: override ? { status: override.status, provider: (override.config as any)?.provider } : null,
    account: account ? { status: account.status, provider: (account.config as any)?.provider } : null,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const { id: agentId } = await params;
  if (!(await userOwnsAgent(agentId, auth.user.id))) {
    return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
  }

  const body = await req.json();
  const { provider } = body;
  if (provider !== "calcom" && provider !== "calendly") {
    return NextResponse.json({ error: "Use /api/calendar/google/auth?agentId=... para conectar o Google." }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  const config = provider === "calcom"
    ? { provider, apiKey: body.apiKey, eventTypeId: body.eventTypeId }
    : { provider, apiToken: body.apiToken, schedulingUrl: body.schedulingUrl, eventTypeUri: body.eventTypeUri, userUri: body.userUri };

  const { error } = await supabase.from("agent_calendar_integrations").upsert({
    agent_id: agentId,
    user_id: auth.user.id,
    provider,
    status: "connected",
    config,
    updated_at: new Date().toISOString(),
  }, { onConflict: "agent_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const { id: agentId } = await params;
  if (!(await userOwnsAgent(agentId, auth.user.id))) {
    return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase.from("agent_calendar_integrations").delete().eq("agent_id", agentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
