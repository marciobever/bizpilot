// Fonte única dos valores COBRADOS (em centavos). A apresentação (strings
// "R$ 29,90") vive em src/lib/planTiers.ts e nas telas — aqui é o que o PSP
// efetivamente cobra. Mudou preço? Atualizar os dois lugares.

export type BillingItem = {
  kind: "plan" | "addon";
  name: string;        // nome exibido na cobrança (extrato/QR)
  cents: number;
};

export const BILLING_ITEMS: Record<string, BillingItem> = {
  starter:  { kind: "plan", name: "BizPilot — Plano Starter",  cents: 2990 },
  pro:      { kind: "plan", name: "BizPilot — Plano Pro",      cents: 7990 },
  business: { kind: "plan", name: "BizPilot — Plano Business", cents: 14900 },
  // Cobrança de teste em produção — só o admin consegue comprar (gate no checkout).
  addon_test:            { kind: "addon", name: "BizPilot — Teste de Pagamento", cents: 100 },
  addon_bot:             { kind: "addon", name: "BizPilot — Bot Adicional",    cents: 1990 },
  addon_campaigns:       { kind: "addon", name: "BizPilot — Campanhas Extras", cents: 2990 },
  addon_voice:           { kind: "addon", name: "BizPilot — Voz Inteligente",  cents: 3990 },
  addon_whatsapp_number: { kind: "addon", name: "BizPilot — Número WhatsApp",  cents: 4990 },
};

// Aliases legados de plano (basico/profissional/avancado) ainda circulam em
// links antigos da landing.
export function normalizeBillingItem(item: string): string {
  if (item === "basico") return "starter";
  if (item === "profissional") return "pro";
  if (item === "avancado") return "business";
  return item;
}

// Dias de acesso comprados por cada pagamento Pix (mensal).
export const PIX_PERIOD_DAYS = 30;
// Carência após vencer antes de bloquear o painel (dunning via bot depois).
export const GRACE_DAYS = 7;

export function centsToReais(cents: number): string {
  return (cents / 100).toFixed(2);
}
