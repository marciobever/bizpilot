import Link from 'next/link';
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Pricing() {
  const tiers = [
    {
      name: "Starter",
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

  const extras = [
    { name: "Bot Adicional", price: "19,90", desc: "Adicione um agente a mais além do seu plano." },
    { name: "Campanhas Extras", price: "29,90", desc: "+1.000 disparos/mês para campanhas em massa." },
    { name: "Voz Inteligente", price: "39,90", desc: "Respostas em áudio com TTS de alta qualidade." },
    { name: "Número WhatsApp", price: "49,90", desc: "Número virtual dedicado conectado à nossa infra." },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-24 md:py-32">
      <div className="text-center max-w-3xl mx-auto mb-20">
        <h2 className="text-4xl font-bold tracking-tight mb-4">Investimento escalável.</h2>
        <p className="text-xl text-muted-foreground">
          Comece grátis, assine um plano quando houver volume. Sem surpresas ou faturamento confuso.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 items-center max-w-6xl mx-auto">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-3xl p-8 ${
              tier.highlight
                ? "bg-gradient-to-b from-brand-500/10 to-transparent border border-brand-500/50 relative shadow-2xl shadow-brand-500/10 scale-105"
                : "bg-card border border-border"
            }`}
          >
            {tier.highlight && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-brand-500 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                Mais Popular
              </div>
            )}
            <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
            <p className="text-sm text-muted-foreground mb-6 h-10">{tier.desc}</p>

            <div className="mb-8">
              <span className="text-4xl font-bold font-sans">R$ {tier.price}</span>
              <span className="text-muted-foreground">/mês</span>
            </div>

            <Button
              asChild
              className={`w-full h-12 mb-8 ${tier.highlight ? "bg-brand-500 hover:bg-brand-600 text-white" : ""}`}
              variant={tier.highlight ? "default" : "outline"}
            >
              <Link href="/app">{tier.cta}</Link>
            </Button>

            <ul className="space-y-4">
              {tier.features.map((feat) => (
                <li key={feat} className="flex items-center gap-3 text-sm">
                  <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3" />
                  </div>
                  {feat}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Extras */}
      <div className="mt-24">
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold mb-2">Complementos disponíveis</h3>
          <p className="text-muted-foreground">Adicione recursos extras em qualquer plano, conforme sua necessidade.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {extras.map((extra) => (
            <div key={extra.name} className="rounded-2xl border border-border bg-card p-5">
              <div className="text-sm font-semibold mb-1">{extra.name}</div>
              <div className="text-2xl font-bold mb-2">R$ {extra.price}<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
              <p className="text-xs text-muted-foreground">{extra.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground max-w-2xl mx-auto">
        *O WhatsApp Oficial (Meta Cloud API) está disponível em qualquer plano. A Meta cobra por mensagem/conversa
        enviada fora da janela gratuita de 24h — esse custo é cobrado diretamente na sua conta Meta Business, à parte da assinatura.
      </p>
    </div>
  );
}
