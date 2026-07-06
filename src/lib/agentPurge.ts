import type { SupabaseClient } from "@supabase/supabase-js";

// Apaga de vez um agente e tudo que só pertence a ele: mensagens, conversas e
// usage_logs (essas duas tabelas usam ON DELETE SET NULL no banco, então
// precisam ser limpas explicitamente — senão viram lixo órfão). knowledge_base,
// bookings e agent_records já têm ON DELETE CASCADE no schema, então somem
// sozinhos ao apagar o agente. Leads NÃO são tocados — podem ter conversas com
// outros agentes do mesmo usuário.
export async function purgeAgentData(supabase: SupabaseClient, agentId: string): Promise<void> {
  const { data: convs } = await supabase.from("conversations").select("id").eq("agent_id", agentId);
  const conversationIds = (convs ?? []).map((c: any) => c.id);

  if (conversationIds.length > 0) {
    await supabase.from("messages").delete().in("conversation_id", conversationIds);
  }
  await supabase.from("conversations").delete().eq("agent_id", agentId);
  await supabase.from("usage_logs").delete().eq("agent_id", agentId);
  await supabase.from("agents").delete().eq("id", agentId);
}
