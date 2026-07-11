"use client";

import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight, Rocket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { agentHasNumber } from "@/lib/agentChannel";
import type { Agent } from "@/types/database";

// Checklist de ativação: guia o usuário novo do zero até o agente atendendo.
// Todos os estados derivam de dados reais (nada de flags salvas): some sozinho
// quando os 4 passos estão completos.
type Props = {
  agents: Agent[];
  agentMessagesTotal: number;
};

export function OnboardingChecklist({ agents, agentMessagesTotal }: Props) {
  const hasAgent = agents.length > 0;
  const hasNumber = agents.some((a) => agentHasNumber((a as any).config));
  const hasMessages = agentMessagesTotal > 0;
  const hasOnline = agents.some((a) => a.status === "online");

  const steps = [
    {
      done: hasAgent,
      title: "Crie seu agente de IA",
      desc: "O assistente guiado monta as instruções a partir do seu tipo de negócio.",
      href: "/app/agents/wizard",
      cta: "Criar agente",
    },
    {
      done: hasNumber,
      title: "Conecte seu WhatsApp",
      desc: "Escaneie o QR Code na aba Canais do agente — leva menos de um minuto.",
      href: hasAgent ? `/app/agents/${agents[0]?.id}` : "/app/agents",
      cta: "Conectar",
    },
    {
      done: hasMessages,
      title: "Mande uma mensagem de teste",
      desc: "Envie um \"oi\" do seu celular pro número conectado e veja a IA responder.",
      href: "/app/conversations",
      cta: "Ver conversas",
    },
    {
      done: hasOnline,
      title: "Ative o agente",
      desc: "Com o toggle ligado, ele atende seus clientes 24/7.",
      href: "/app/agents",
      cta: "Ativar",
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  if (doneCount === steps.length) return null;

  // O próximo passo pendente ganha o botão de ação.
  const nextIdx = steps.findIndex((s) => !s.done);

  return (
    <Card className="border-brand-500/30 bg-brand-500/5">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
            <Rocket className="h-5 w-5 text-brand-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">Coloque seu agente no ar</h3>
            <p className="text-sm text-muted-foreground">{doneCount} de {steps.length} passos concluídos</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            {steps.map((s, i) => (
              <div key={i} className={`h-1.5 w-8 rounded-full ${s.done ? "bg-brand-500" : "bg-border"}`} />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-xl border p-3.5 ${step.done ? "border-transparent opacity-60" : i === nextIdx ? "border-brand-500/40 bg-card" : "border-border bg-card"}`}>
              {step.done
                ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                : <Circle className="h-5 w-5 text-muted-foreground shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${step.done ? "line-through" : ""}`}>{step.title}</div>
                {!step.done && <div className="text-xs text-muted-foreground mt-0.5">{step.desc}</div>}
              </div>
              {!step.done && i === nextIdx && (
                <Button asChild size="sm" className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5 shrink-0">
                  <Link href={step.href}>{step.cta} <ArrowRight className="h-3.5 w-3.5" /></Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
