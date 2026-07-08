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
  campaignsBase: number; // disparos de campanha incluídos no plano, por mês
}> = {
  starter:  { bots: 1,  conversations: 500,   kbDocs: 50,  historyDays: 30,  campaignsBase: 0    },
  pro:      { bots: 3,  conversations: 3000,  kbDocs: 200, historyDays: 90,  campaignsBase: 500  },
  business: { bots: -1, conversations: -1,    kbDocs: -1,  historyDays: 365, campaignsBase: 2000 },
};

// Cota de disparos de campanha do mês = base do plano + 1.000 por addon_campaigns.
export function computeCampaignQuota(plan: string | null | undefined, extraCampaigns: number): number {
  const base = PLAN_LIMITS[normalizePlan(plan)].campaignsBase;
  return base + extraCampaigns * 1000;
}

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

// ─── Complementos (add-ons) ───────────────────────────────────────────────────
export type AddonId = "addon_bot" | "addon_campaigns" | "addon_voice" | "addon_whatsapp_number";

export interface EffectiveLimits {
  bots: number;            // base + addon_bot (-1 = ilimitado)
  conversations: number;   // limite base do plano (-1 = ilimitado)
  kbDocs: number;          // limite base do plano (-1 = ilimitado)
  historyDays: number;
  voice: boolean;          // liberado por addon_voice
  extraCampaigns: number;  // qtde de addon_campaigns (cada um = +1.000 disparos/mês)
  extraWhatsappNumbers: number; // qtde de addon_whatsapp_number
}

// 7 dias de carência após vencer (mesmo prazo do gate do plano) antes de
// parar de contar o complemento — dá tempo do Pix de renovação compensar.
const ADDON_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

// Soma linhas de user_addons em contagem por addon_id (apenas status ativo/trialing
// E dentro do período pago + carência — complemento pago por Pix que venceu
// há mais de 7 dias para de contar, mesmo que a linha ainda diga "active").
export function addonCountsFromRows(
  rows: Array<{ addon_id: string; status?: string | null; current_period_end?: string | null }> | null | undefined
): Record<string, number> {
  const counts: Record<string, number> = {};
  const now = Date.now();
  for (const r of rows ?? []) {
    if (r.status && r.status !== "active" && r.status !== "trialing") continue;
    if (r.current_period_end) {
      const endMs = new Date(r.current_period_end).getTime();
      if (Number.isFinite(endMs) && now > endMs + ADDON_GRACE_MS) continue;
    }
    counts[r.addon_id] = (counts[r.addon_id] ?? 0) + 1;
  }
  return counts;
}

// Limites efetivos = limites do plano + complementos comprados.
export function computeEffectiveLimits(
  plan: string | null | undefined,
  addonCounts: Record<string, number>
): EffectiveLimits {
  const base = PLAN_LIMITS[normalizePlan(plan)];
  const extraBots = addonCounts["addon_bot"] ?? 0;
  return {
    bots: base.bots === -1 ? -1 : base.bots + extraBots,
    conversations: base.conversations,
    kbDocs: base.kbDocs,
    historyDays: base.historyDays,
    voice: (addonCounts["addon_voice"] ?? 0) > 0,
    extraCampaigns: addonCounts["addon_campaigns"] ?? 0,
    extraWhatsappNumbers: addonCounts["addon_whatsapp_number"] ?? 0,
  };
}

// ─── Limite de consumo de IA (proteção de margem) ─────────────────────────────
// 35% do preço do plano reservado para custo bruto de IA (tokens OpenAI/Gemini),
// convertido em USD a este câmbio fixo — revisar periodicamente.
// Preços de referência (src/lib/planTiers.ts): Starter R$29,90 / Pro R$79,90 / Business R$149,00.
// Por ora é só instrumentação (exibido em Configurações > Plano) — sem bloqueio automático.
export const USD_BRL_RATE = 5.5;

export const AI_COST_LIMIT_USD: Record<PlanId, number> = {
  starter: 1.90,
  pro: 5.08,
  business: 9.48,
};

// Normaliza nomes de planos antigos → novo padrão
export function normalizePlan(plan: string | null | undefined): PlanId {
  if (!plan) return "starter";
  if (plan === "basico")       return "starter";
  if (plan === "profissional") return "pro";
  if (plan === "avancado")     return "business";
  if (plan === "starter" || plan === "pro" || plan === "business") return plan as PlanId;
  return "starter";
}
