// Determina se um agente tem um número de WhatsApp conectado (Evolution ou Meta).
// Fonte da verdade: config.whatsapp. Sem número conectado, o agente não pode
// ficar "ligado" — o toggle de status fica desabilitado.
export function agentHasNumber(config: any): boolean {
  const cfg = typeof config === "string" ? safeParse(config) : config;
  const wa = cfg?.whatsapp;
  if (!wa) return false;
  if (wa.provider === "meta") return wa.meta?.connected === true;
  if (wa.provider === "evolution") return wa.evolution?.connected === true;
  // Sem provider definido: considera conectado se qualquer canal estiver ativo.
  return wa.meta?.connected === true || wa.evolution?.connected === true;
}

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return null; }
}
