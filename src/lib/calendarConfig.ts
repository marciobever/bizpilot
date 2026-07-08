import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/lib/secret-crypto";

export type CalendarConfig = { provider: string; [key: string]: any };
export type CalendarResolution = { userId: string; config: CalendarConfig; source: "agent" | "account" };

// refreshToken é criptografado em repouso (ver src/lib/secret-crypto.ts) —
// decryptSecret devolve o valor como veio se não estiver no formato
// criptografado, então registros antigos em texto puro continuam funcionando.
function decryptConfig(config: CalendarConfig): CalendarConfig {
  if (!config?.refreshToken) return config;
  return { ...config, refreshToken: decryptSecret(config.refreshToken) };
}

// Resolve qual calendário usar pra um agente: primeiro tenta um override
// específico do bot (agent_calendar_integrations), senão cai pro calendário
// padrão da conta (integrations). Retorna null se nenhum dos dois estiver
// conectado.
export async function resolveCalendarConfig(supabase: SupabaseClient, agentId: string): Promise<CalendarResolution | null> {
  const { data: agent } = await supabase.from("agents").select("user_id").eq("id", agentId).single();
  if (!agent) return null;

  const { data: override } = await supabase
    .from("agent_calendar_integrations")
    .select("status, config")
    .eq("agent_id", agentId)
    .maybeSingle();
  if (override?.status === "connected") {
    return { userId: agent.user_id, config: decryptConfig(override.config as CalendarConfig), source: "agent" };
  }

  const { data: account } = await supabase
    .from("integrations")
    .select("status, config")
    .eq("user_id", agent.user_id).eq("provider", "calendar")
    .maybeSingle();
  if (account?.status === "connected") {
    return { userId: agent.user_id, config: decryptConfig(account.config as CalendarConfig), source: "account" };
  }

  return null;
}
