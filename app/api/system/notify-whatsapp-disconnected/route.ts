import { NextRequest, NextResponse } from "next/server";
import { requireInternalSecret } from "@/lib/api-auth";
import { sendWhatsappDisconnectedEmail } from "@/lib/whatsappConnectionAlerts";

// Rota fina, só pra permitir testar o e-mail de desconexão isoladamente
// (via curl) sem precisar simular uma queda real de instância. O fluxo real
// chama sendWhatsappDisconnectedEmail direto de recordConnectionObservation.
export async function POST(req: NextRequest) {
  const auth = requireInternalSecret(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { userId, agentId, agentName, instanceName } = body as Record<string, string>;
  if (!userId || !agentId || !agentName || !instanceName) {
    return NextResponse.json({ error: "userId, agentId, agentName e instanceName são obrigatórios" }, { status: 400 });
  }

  try {
    await sendWhatsappDisconnectedEmail({ userId, agentId, agentName, instanceName });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    const notFound = /não encontrado/i.test(e?.message || "");
    return NextResponse.json({ error: e?.message || "Erro ao enviar e-mail." }, { status: notFound ? 404 : 500 });
  }
}
