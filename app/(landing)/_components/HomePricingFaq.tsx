import Link from "next/link";
import { Check, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PLAN_TIERS } from "@/lib/planTiers";

// Bloco final da home: resumo dos planos, FAQ e CTA de fechamento.

const FAQS = [
  {
    q: "Preciso de um número de WhatsApp novo?",
    a: "Não. Você conecta o número que já usa escaneando um QR Code, igual ao WhatsApp Web. Se preferir, também suportamos a API oficial da Meta — e existe o complemento de número dedicado.",
  },
  {
    q: "Quanto tempo leva pra configurar?",
    a: "O assistente de criação monta seu agente em poucos minutos: você responde perguntas sobre o negócio e a IA escreve as instruções. Conectar o WhatsApp leva 2 minutos.",
  },
  {
    q: "O agente responde qualquer pergunta?",
    a: "Ele responde com base nas informações do SEU negócio: serviços, preços, horários e documentos que você adicionar à base de conhecimento. Quando não sabe ou o cliente pede, ele transfere para um humano.",
  },
  {
    q: "E se o cliente quiser falar com uma pessoa?",
    a: "O repasse humano é nativo: o agente avisa o responsável certo no WhatsApp e pausa a conversa. Você define os contatos de handoff por assunto.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, o plano é mensal e sem fidelidade. Cancelou, não renova — simples assim.",
  },
];

export function PricingTeaser() {
  return (
    <section className="w-full max-w-6xl mx-auto px-6 py-24">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Menos que uma diária de atendente
        </h2>
        <p className="text-lg text-muted-foreground">
          Planos mensais, sem fidelidade. Cupom de 50% no primeiro mês.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 items-stretch">
        {PLAN_TIERS.map((tier) => (
          <div
            key={tier.planId}
            className={`rounded-3xl p-7 flex flex-col ${
              tier.highlight
                ? "border border-brand-500/50 bg-gradient-to-b from-brand-500/10 to-transparent shadow-xl shadow-brand-500/10 relative"
                : "border border-border bg-card"
            }`}
          >
            {tier.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-500 text-white text-[11px] font-bold rounded-full uppercase tracking-wider">
                Mais popular
              </div>
            )}
            <div className="font-bold text-lg">{tier.name}</div>
            <div className="mt-3 mb-5">
              <span className="text-3xl font-bold tabular-nums">R$ {tier.price}</span>
              <span className="text-muted-foreground text-sm">/mês</span>
            </div>
            <ul className="space-y-2.5 mb-7 flex-1">
              {tier.features.slice(0, 4).map((feat) => (
                <li key={feat} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  {feat}
                </li>
              ))}
            </ul>
            <Button
              asChild
              variant={tier.highlight ? "default" : "outline"}
              className={tier.highlight ? "bg-brand-500 hover:bg-brand-600 text-white" : ""}
            >
              <Link href={`/auth/registro?plan=${tier.planId}`}>{tier.cta}</Link>
            </Button>
          </div>
        ))}
      </div>
      <div className="text-center mt-8">
        <Link href="/precos" className="text-sm text-brand-500 hover:text-brand-600 font-medium inline-flex items-center gap-1">
          Comparação completa e complementos <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section className="w-full max-w-3xl mx-auto px-6 pb-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Perguntas frequentes</h2>
      </div>
      <div className="space-y-3">
        {FAQS.map(({ q, a }) => (
          <details key={q} className="group rounded-2xl border border-border bg-card px-6 py-4">
            <summary className="flex items-center justify-between cursor-pointer list-none font-semibold text-sm select-none">
              {q}
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180 shrink-0 ml-4" />
            </summary>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">{a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="w-full px-6 pb-24">
      <div className="max-w-5xl mx-auto rounded-3xl bg-gradient-to-br from-brand-600 to-brand-900 text-white text-center px-8 py-16 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-brand-400/30 blur-[100px] rounded-full pointer-events-none" />
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Seu próximo funcionário não dorme, não falta e custa R$ 1/dia
        </h2>
        <p className="text-white/70 text-lg mb-8 max-w-2xl mx-auto">
          Crie seu agente agora e veja ele atendendo no seu WhatsApp ainda hoje.
        </p>
        <Button size="lg" asChild className="h-12 px-8 bg-white text-brand-900 hover:bg-white/90 font-bold">
          <Link href="/auth/registro?plan=starter">
            Criar meu funcionário virtual <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
