// ─── Planos e gating de recursos ──────────────────────────────────────────────
// Starter / Pro / Business — todas as integrações abertas em todos os planos.
// A diferenciação é por volume: bots, conversas/mês, docs de KB, histórico.

export type PlanId = "starter" | "pro" | "business";

export const PLAN_RANK: Record<PlanId, number> = { starter: 0, pro: 1, business: 2 };

export const PLAN_LABEL: Record<PlanId, string> = {
  starter:  "Starter",
  pro:      "Pro",
  business: "Business",
};

export const PLAN_LIMITS: Record<PlanId, {
  bots: number;         // -1 = ilimitado
  conversations: number;
  kbDocs: number;
  historyDays: number;
}> = {
  starter:  { bots: 1,  conversations: 500,   kbDocs: 50,  historyDays: 30  },
  pro:      { bots: 3,  conversations: 3000,  kbDocs: 200, historyDays: 90  },
  business: { bots: -1, conversations: -1,    kbDocs: -1,  historyDays: 365 },
};

// Todas as integrações abertas para todos os planos.
// Gating é por volume (PLAN_LIMITS), não por feature.
export const FEATURE_MIN_PLAN: Record<string, PlanId> = {
  whatsapp:    "starter",
  rag:         "starter",
  handoff:     "starter",
  supabase:    "starter",
  voice:       "starter",
  memory:      "starter",
  tools:       "starter",
  email:       "starter",
  payments:    "starter",
  webhook:     "starter",
  calendar:    "starter",
  external_db: "starter",
  instagram:   "starter",
  facebook:    "starter",
  multichannel:"starter",
  affiliate:   "starter",
};

export function planAllows(plan: string | null | undefined, feature: string): boolean {
  const need = FEATURE_MIN_PLAN[feature];
  if (!need) return true;
  const rank = PLAN_RANK[(plan || "starter") as PlanId] ?? 0;
  return rank >= PLAN_RANK[need];
}

export function requiredPlanLabel(feature: string): string {
  const need = FEATURE_MIN_PLAN[feature];
  return need ? PLAN_LABEL[need] : "";
}

// Normaliza nomes de planos antigos → novo padrão
export function normalizePlan(plan: string | null | undefined): PlanId {
  if (!plan) return "starter";
  if (plan === "basico")       return "starter";
  if (plan === "profissional") return "pro";
  if (plan === "avancado")     return "business";
  if (plan === "starter" || plan === "pro" || plan === "business") return plan as PlanId;
  return "starter";
}
