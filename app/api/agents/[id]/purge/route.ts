import { NextRequest, NextResponse } from "next/server";
import { requireUser, getServiceSupabase, userOwnsAgent } from "@/lib/api-auth";
import { purgeAgentData } from "@/lib/agentPurge";

// Apaga o agente e seu histórico agora mesmo — usado logo depois do usuário
// baixar o arquivo de arquivamento (fluxo "Arquivar e baixar" em /app/agents).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const { id: agentId } = await params;

  if (!(await userOwnsAgent(agentId, auth.user.id))) {
    return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
  }

  await purgeAgentData(getServiceSupabase(), agentId);
  return NextResponse.json({ success: true });
}
