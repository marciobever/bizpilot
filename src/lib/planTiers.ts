// Fonte única dos planos exibidos no site (home + /precos).
// Os limites técnicos (gates) vivem em src/lib/plans.ts — aqui é só apresentação.

export type PlanTier = {
  name: string;
  planId: string;
  desc: string;
  price: string;
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
    features: [
      "1 Agente Inteligente",
      "500 conversas/mês",
      "50 documentos na base de conhecimento",
      "Histórico de 30 dias",
      "Todas as integrações inclusas",
      "Repasse para atendimento humano",
      "WhatsApp Evolution (QR Code) ou Meta Oficial",
    ],
    cta: "Começar no Starter",
    highlight: false,
  },
  {
    name: "Pro",
    planId: "pro",
    desc: "Para quem quer escalar o atendimento com múltiplos agentes.",
    price: "79,90",
    features: [
      "3 Agentes Inteligentes",
      "3.000 conversas/mês",
      "200 documentos na base de conhecimento",
      "Histórico de 90 dias",
      "Todas as integrações inclusas",
      "Suporte prioritário",
    ],
    cta: "Assinar o Pro",
    highlight: true,
  },
  {
    name: "Business",
    planId: "business",
    desc: "Para operações maiores com agentes e conversas ilimitados.",
    price: "149,00",
    features: [
      "Agentes Inteligentes ilimitados",
      "Conversas ilimitadas",
      "Documentos ilimitados",
      "Histórico de 1 ano",
      "Todas as integrações inclusas",
      "Suporte dedicado",
    ],
    cta: "Assinar o Business",
    highlight: false,
  },
];

export const PLAN_EXTRAS = [
  { name: "Bot Adicional", price: "19,90", desc: "Adicione um agente a mais além do seu plano." },
  { name: "Campanhas Extras", price: "29,90", desc: "+1.000 disparos/mês para campanhas em massa." },
  { name: "Voz Inteligente", price: "39,90", desc: "Respostas em áudio com TTS de alta qualidade." },
  { name: "Número WhatsApp", price: "49,90", desc: "Número virtual dedicado conectado à nossa infra." },
];
