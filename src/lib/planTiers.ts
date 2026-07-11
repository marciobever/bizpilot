// Fonte única dos planos exibidos no site (home + /precos).
// Os limites técnicos (gates) vivem em src/lib/plans.ts — aqui é só apresentação.

export type PlanTier = {
  name: string;
  planId: string;
  desc: string;
  price: string;
  annualPrice: string; // 10x o mensal (2 meses grátis), Pix à vista
  features: string[];
  cta: string;
  highlight: boolean;
};

export const PLAN_TIERS: PlanTier[] = [
  {
    name: "Starter",
    planId: "starter",
    desc: "Ideal para começar a automatizar o atendimento com o essencial.",
    price: "29,90",
    annualPrice: "299,00",
    features: [
      "1 Agente Inteligente",
      "500 conversas/mês",
      "50 documentos na base de conhecimento",
      "Histórico de 30 dias",
      "Todas as integrações inclusas",
      "Repasse para atendimento humano",
      "WhatsApp Evolution (QR Code) ou Meta Oficial",
    ],
    cta: "Testar grátis por 7 dias",
    highlight: false,
  },
  {
    name: "Pro",
    planId: "pro",
    desc: "Para quem quer escalar o atendimento com múltiplos agentes.",
    price: "79,90",
    annualPrice: "799,00",
    features: [
      "3 Agentes Inteligentes",
      "3.000 conversas/mês",
      "200 documentos na base de conhecimento",
      "Histórico de 90 dias",
      "Todas as integrações inclusas",
      "Suporte prioritário",
    ],
    cta: "Testar o Pro grátis por 7 dias",
    highlight: true,
  },
  {
    name: "Business",
    planId: "business",
    desc: "Para operações maiores com agentes e conversas ilimitados.",
    price: "149,00",
    annualPrice: "1.490,00",
    features: [
      "Agentes Inteligentes ilimitados",
      "Conversas ilimitadas",
      "Documentos ilimitados",
      "Histórico de 1 ano",
      "Todas as integrações inclusas",
      "Suporte dedicado",
    ],
    cta: "Testar o Business grátis por 7 dias",
    highlight: false,
  },
];

export const PLAN_EXTRAS: { name: string; price: string; desc: string; comingSoon?: boolean }[] = [
  { name: "Bot Adicional", price: "19,90", desc: "Adicione um agente a mais além do seu plano." },
  { name: "Conversas Extras", price: "14,90", desc: "+500 conversas/mês além do limite do seu plano." },
  { name: "Campanhas Extras", price: "29,90", desc: "+1.000 disparos/mês para campanhas em massa." },
  { name: "Voz Inteligente", price: "39,90", desc: "Respostas em áudio com TTS de alta qualidade." },
  // Em breve: ainda não há estoque de números (whatsapp_number_pool) — não
  // vender o que não conseguimos entregar automaticamente.
  { name: "Número WhatsApp", price: "49,90", desc: "Número virtual dedicado conectado à nossa infra.", comingSoon: true },
];
