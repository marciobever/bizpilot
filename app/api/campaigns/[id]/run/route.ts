import { NextRequest, NextResponse } from "next/server";
import { requireInternalSecret, getServiceSupabase } from "@/lib/api-auth";

// Chamado pelo Windmill (7_campaign_sender.ts) para buscar os dados do
// disparo: mensagem, credenciais Evolution da instância e a lista de
// destinatários pendentes.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireInternalSecret(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const supabase = getServiceSupabase();
  const { data: campaign, error } = await supabase
    .from("campaigns").select("id, message, agent_id, status").eq("id", id).single();
  if (error || !campaign) return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });

  const { data: agent } = await supabase.from("agents").select("config").eq("id", campaign.agent_id).single();
  const cfg = typeof agent?.config === "string" ? JSON.parse(agent.config) : agent?.config || {};
  const wa = cfg.whatsapp || {};
  if (!wa.instanceToken) {
    return NextResponse.json({ error: "Instância Evolution sem token salvo." }, { status: 400 });
  }

  const { data: recipients } = await supabase
    .from("campaign_recipients")
    .select("id, phone, name")
    .eq("campaign_id", id)
    .eq("status", "pending");

  await supabase.from("campaigns").update({ status: "sending", started_at: new Date().toISOString() }).eq("id", id).eq("status", "queued");

  return NextResponse.json({
    message: campaign.message,
    instanceToken: wa.instanceToken,
    instanceName: wa.evolution?.instanceName || wa.instanceName,
    recipients: recipients ?? [],
  });
}
