import { NextRequest, NextResponse } from "next/server";
import { requireInternalSecret, agentIdFromInstanceName } from "@/lib/api-auth";
import { recordConnectionObservation, normalizeEvolutionState } from "@/lib/whatsappConnectionAlerts";

// Chamado pelo windmill/1_webhook_receiver.ts quando a Evolution manda o
// evento CONNECTION (sessão caiu/voltou) — repassado em tempo real, em vez
// de esperar o usuário logar ou um cron rodar.
// Sempre 200: nunca queremos que o Windmill reenvie ou registre erro por
// causa de uma instância que não reconhecemos.
export async function POST(req: NextRequest) {
  const auth = requireInternalSecret(req);
  if (!auth.ok) return auth.response;

  const { instanceName, state } = await req.json().catch(() => ({ instanceName: "", state: "" }));
  const agentId = agentIdFromInstanceName(instanceName || "");
  if (!agentId) return NextResponse.json({ ok: false, reason: "instanceName não reconhecido" });

  const result = await recordConnectionObservation({
    agentId, instanceName, normalizedState: normalizeEvolutionState(state),
  });
  return NextResponse.json({ ok: true, ...result });
}
