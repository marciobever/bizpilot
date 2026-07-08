import { NextRequest, NextResponse } from "next/server";
import { requireUser, getServiceSupabase } from "@/lib/api-auth";
import { recordConnectionObservation, normalizeEvolutionState } from "@/lib/whatsappConnectionAlerts";

// Rede de segurança da Camada B: chamada pelo painel a cada login (com
// throttle no cliente, ver src/lib/hooks/useWhatsappConnectionAlerts.ts).
// A Camada A (webhook CONNECTION da Evolution, tempo real) é o caminho
// principal — esta rota cobre o caso do webhook falhar/atrasar.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const supabase = getServiceSupabase();
  const { data: agents } = await supabase
    .from("agents")
    .select("id, config")
    .eq("user_id", auth.user.id)
    .is("deleted_at", null);

  const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
  let checked = 0, down = 0;

  for (const agent of agents ?? []) {
    const cfg = typeof agent.config === "string" ? JSON.parse(agent.config) : agent.config || {};
    const wa = cfg.whatsapp;
    if (wa?.provider !== "evolution" || !wa.evolution?.connected || !wa.instanceToken) continue;
    checked++;

    try {
      const res = await fetch(`${EVOLUTION_API_URL}/instance/status`, {
        headers: { apikey: wa.instanceToken },
      });
      const data = await res.json();
      const loggedIn: boolean = data?.data?.LoggedIn ?? false;
      const connected: boolean = data?.data?.Connected ?? false;
      const state = loggedIn ? "open" : connected ? "connecting" : "close";

      const instanceName = wa.evolution?.instanceName || wa.instanceName || `agent_${agent.id}`;
      const result = await recordConnectionObservation({
        agentId: agent.id, instanceName, normalizedState: normalizeEvolutionState(state),
      });
      if (result.changed && state !== "open") down++;
    } catch {
      // Falha ao checar uma instância não deve travar a checagem das outras.
    }
  }

  return NextResponse.json({ ok: true, checked, down });
}
