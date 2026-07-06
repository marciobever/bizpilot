import { NextRequest, NextResponse } from "next/server";
import { requireUser, getServiceSupabase, userOwnsAgent } from "@/lib/api-auth";

// "Apagar" sem arquivar: some do painel na hora, mas fica no banco por 15 dias
// (carência) antes do Windmill apagar de vez via /api/agents/purge-expired.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const { id: agentId } = await params;

  if (!(await userOwnsAgent(agentId, auth.user.id))) {
    return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
  }

  const supabase = getServiceSupabase();
  const { error } = await supabase.from("agents").update({ deleted_at: new Date().toISOString() }).eq("id", agentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
