import Link from 'next/link';
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Pricing() {
  const tiers = [
    {
      name: "Básico",
      desc: "Ideal para começar a automatizar o atendimento com o essencial.",
      price: "39,99",
      features: [
        "1 Agente Inteligente",
        "Respostas em texto, ilimitadas",
        "Personalidade, tom de voz e saudação",
        "Repasse (Handoff) para atendimento humano",
        "Base de Conhecimento (RAG)",
        "WhatsApp via Evolution API (QR Code, grátis) ou Meta Oficial*"
      ],
      cta: "Começar no Básico",
      highlight: false
    },
    {
      name: "Profissional",
      desc: "Para quem quer humanizar o atendimento e automatizar tarefas.",
      price: "79,99",
      features: [
        "Tudo do plano Básico",
        "Respostas em Áudio (Voz Inteligente / TTS)",
        "Memória de Dados (registros do cliente)",
        "Ações e APIs (Tools/Webhooks)",
        "Até 3 Agentes Inteligentes"
      ],
      cta: "Assinar o Profissional",
      highlight: true
    },
    {
      name: "Avançado",
      desc: "Para operações maiores, com múltiplos agentes e canais.",
      price: "119,99",
      features: [
        "Tudo do plano Profissional",
        "Agentes Inteligentes ilimitados",
        "Múltiplos canais por agente",
        "Suporte prioritário"
      ],
      cta: "Assinar o Avançado",
      highlight: false
    }
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
              <span className="text-4xl font-bold font-sans">
                {tier.price !== "Personalizado" && "R$"}
                {tier.price}
              </span>
              {tier.price !== "Personalizado" && <span className="text-muted-foreground">/mês</span>}
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

      <div className="mt-16 text-center max-w-2xl mx-auto p-6 rounded-2xl bg-secondary/30 border border-border">
        <h4 className="text-lg font-medium mb-2">Precisa de um número de telefone no formato local?</h4>
        <p className="text-muted-foreground text-sm">
          Oferecemos aluguel de números virtuais dedicados conectados diretamente à nossa infraestrutura por apenas <strong className="text-foreground">R$ 29/mês</strong> por número (Add-on disponível em qualquer plano).
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground max-w-2xl mx-auto">
        *O WhatsApp Oficial (Meta Cloud API) está disponível em qualquer plano. A Meta cobra por mensagem/conversa
        enviada fora da janela gratuita de 24h — esse custo é cobrado diretamente na sua conta Meta Business, à parte da assinatura.
      </p>
    </div>
  )
}
