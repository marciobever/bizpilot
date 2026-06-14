// ─── Planos e gating de recursos ──────────────────────────────────────────────
// Fonte única de verdade de "qual recurso entra em qual plano". Usado para travar
// integrações (página Integrações) e recursos de comportamento do agente.

export type PlanId = "basico" | "profissional" | "avancado";

export const PLAN_RANK: Record<PlanId, number> = { basico: 0, profissional: 1, avancado: 2 };
export const PLAN_LABEL: Record<PlanId, string> = {
  basico: "Básico",
  profissional: "Profissional",
  avancado: "Avançado",
};

// Plano MÍNIMO exigido por recurso. Chaves de integração = ids de INTEGRATIONS_META.
export const FEATURE_MIN_PLAN: Record<string, PlanId> = {
  // Núcleo (todos os planos)
  whatsapp: "basico",
  rag: "basico",
  handoff: "basico",
  supabase: "basico", // banco de dados integrado (sempre incluso)
  // Comportamento do agente
  voice: "profissional",
  memory: "profissional",
  tools: "profissional",
  // Integrações de conta
  email: "profissional",
  payments: "profissional",
  webhook: "profissional",
  calendar: "avancado",
  external_db: "avancado",
  instagram: "avancado",
  facebook: "avancado",
  multichannel: "avancado",
};

export function planAllows(plan: string | null | undefined, feature: string): boolean {
  const need = FEATURE_MIN_PLAN[feature];
  if (!need) return true;
  const rank = PLAN_RANK[(plan || "basico") as PlanId] ?? 0;
  return rank >= PLAN_RANK[need];
}

// Rótulo do plano mínimo exigido por um recurso (para selos "Plano X").
export function requiredPlanLabel(feature: string): string {
  const need = FEATURE_MIN_PLAN[feature];
  return need ? PLAN_LABEL[need] : "";
}
