import { NextRequest, NextResponse } from "next/server";
import { requireInternalSecret, getServiceSupabase } from "@/lib/api-auth";
import { purgeAgentData } from "@/lib/agentPurge";

const GRACE_PERIOD_DAYS = 15;

// Varredura diária (chamada pelo Windmill via schedule, com x-internal-secret):
// apaga de vez todo agente soft-deleted há mais de 15 dias, em qualquer conta.
export async function POST(req: NextRequest) {
  const auth = requireInternalSecret(req);
  if (!auth.ok) return auth.response;

  const supabase = getServiceSupabase();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - GRACE_PERIOD_DAYS);

  const { data: expired, error } = await supabase
    .from("agents")
    .select("id, name")
    .not("deleted_at", "is", null)
    .lte("deleted_at", cutoff.toISOString());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const purged: string[] = [];
  for (const agent of expired ?? []) {
    await purgeAgentData(supabase, agent.id);
    purged.push(agent.id);
  }

  return NextResponse.json({ purged_count: purged.length, purged_agent_ids: purged });
}
