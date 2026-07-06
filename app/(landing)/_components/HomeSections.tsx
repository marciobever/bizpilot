import { Bot, QrCode, Rocket, Clock, Zap, CalendarCheck, Wallet } from "lucide-react";

// Seções intermediárias da home: fatos do produto, como funciona e
// casos de uso em bolhas de WhatsApp (a linguagem visual do produto).

const FACTS = [
  { icon: Clock, title: "24h por dia", desc: "Seu agente nunca dorme, nem no feriado." },
  { icon: Zap, title: "Resposta em segundos", desc: "Nenhum cliente esperando na fila." },
  { icon: QrCode, title: "Conecta em 2 minutos", desc: "Escaneou o QR Code, está no ar." },
  { icon: Wallet, title: "Cobra e agenda no chat", desc: "Pix, cartão e agenda sem sair do WhatsApp." },
];

const STEPS = [
  {
    icon: Bot,
    title: "1. Crie seu agente",
    desc: "Responda algumas perguntas sobre o seu negócio e a IA escreve a personalidade e as instruções do seu funcionário virtual.",
  },
  {
    icon: QrCode,
    title: "2. Conecte o WhatsApp",
    desc: "Escaneie um QR Code com o número que você já usa — ou conecte a API oficial da Meta. Sem chip novo, sem burocracia.",
  },
  {
    icon: Rocket,
    title: "3. Ele trabalha por você",
    desc: "Atende, qualifica leads, agenda horários, envia cobranças e chama você só quando precisa de um humano.",
  },
];

type Bubble = { from: "client" | "bot"; text: string };

const USE_CASES: { sector: string; result: string; icon: typeof Bot; bubbles: Bubble[] }[] = [
  {
    sector: "Barbearia",
    result: "Agendamento fechado sem tocar no celular",
    icon: CalendarCheck,
    bubbles: [
      { from: "client", text: "Tem horário pra corte amanhã?" },
      { from: "bot", text: "Tem sim! 10h ou 15h30, qual prefere?" },
      { from: "client", text: "15h30 👍" },
      { from: "bot", text: "Agendado! Te espero amanhã às 15h30 ✂️" },
    ],
  },
  {
    sector: "Loja / E-commerce",
    result: "Venda cobrada com Pix no próprio chat",
    icon: Wallet,
    bubbles: [
      { from: "client", text: "Ainda tem a air fryer em promoção?" },
      { from: "bot", text: "Tem! R$ 299 à vista. Quer que eu já gere o Pix?" },
      { from: "client", text: "Pode gerar" },
      { from: "bot", text: "Aqui está o QR Code 👇 Assim que pagar, já separo o envio." },
    ],
  },
  {
    sector: "Imobiliária",
    result: "Lead qualificado e visita marcada",
    icon: Bot,
    bubbles: [
      { from: "client", text: "Esse apê de 2 quartos aceita financiamento?" },
      { from: "bot", text: "Aceita! Você já tem aprovação de crédito ou quer indicação de banco?" },
      { from: "client", text: "Já tenho aprovado" },
      { from: "bot", text: "Perfeito, você é prioridade! Posso agendar sua visita pra sábado às 10h?" },
    ],
  },
];

export function FactsStrip() {
  return (
    <section className="w-full border-y border-border/60 bg-secondary/20">
      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-8">
        {FACTS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-sm">{title}</div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="w-full max-w-6xl mx-auto px-6 py-24">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">No ar em 3 passos</h2>
        <p className="text-lg text-muted-foreground">
          Do zero ao primeiro atendimento automático em menos tempo que um cafezinho.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {STEPS.map(({ icon: Icon, title, desc }, i) => (
          <div key={title} className="relative rounded-3xl border border-border bg-card p-8">
            <div className="h-12 w-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center mb-5">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-lg mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            {i < STEPS.length - 1 && (
              <div className="hidden md:block absolute top-1/2 -right-3 w-6 border-t-2 border-dashed border-border" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function UseCaseBubbles() {
  return (
    <section className="w-full bg-secondary/20 border-y border-border/60">
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Na prática, é assim</h2>
          <p className="text-lg text-muted-foreground">
            Conversas reais que o seu funcionário virtual resolve sozinho, do primeiro oi ao negócio fechado.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {USE_CASES.map(({ sector, result, icon: Icon, bubbles }) => (
            <div key={sector} className="rounded-3xl border border-border bg-card overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-border/60 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="font-semibold text-sm">{sector}</div>
              </div>
              <div className="p-5 space-y-2.5 flex-1">
                {bubbles.map((b, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed border ${
                      b.from === "client"
                        ? "bg-background border-border rounded-tl-sm"
                        : "bg-brand-500/10 border-brand-500/20 rounded-tr-sm ml-auto"
                    }`}
                  >
                    {b.text}
                  </div>
                ))}
              </div>
              <div className="px-5 py-3.5 border-t border-border/60 text-xs font-semibold text-success flex items-center gap-1.5">
                ✓ {result}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
