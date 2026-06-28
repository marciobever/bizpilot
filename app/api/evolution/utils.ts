import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key);
}

// Extrai o agentId do instanceName (formato: agent_{uuid} ou agent_{uuid}_{nome})
// e retorna o token + instanceId guardados no config do agente.
export async function resolveInstanceToken(
  instanceNameOrPrefix: string
): Promise<{ token: string; instanceId: string; agentId: string } | null> {
  const match = instanceNameOrPrefix.match(
    /^agent_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  if (!match) return null;
  const agentId = match[1];
  const supabase = getSupabase();
  const { data } = await supabase.from('agents').select('config').eq('id', agentId).single();
  const token = data?.config?.whatsapp?.instanceToken;
  const instanceId = data?.config?.whatsapp?.instanceId ?? '';
  if (!token) return null;
  return { token, instanceId, agentId };
}
