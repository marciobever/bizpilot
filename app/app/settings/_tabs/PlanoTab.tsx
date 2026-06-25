"use client";
import Link from "next/link";
import { CreditCard, Check, Loader2, ArrowUpRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const PLAN_INFO: Record<string, { name: string; price: string; features: string[]; color: string }> = {
  basico: {
    name: "Básico", price: "R$ 39,99/mês", color: "border-border",
    features: ["1 Agente Inteligente", "Respostas em texto, ilimitadas", "Repasse (Handoff) para atendimento humano", "Base de Conhecimento (RAG)", "WhatsApp via Evolution API ou Meta Oficial"],
  },
  profissional: {
    name: "Profissional", price: "R$ 79,99/mês", color: "border-brand-500/50",
    features: ["Tudo do plano Básico", "Respostas em Áudio (Voz Inteligente / TTS)", "Memória de Dados (registros do cliente)", "Ações e APIs (Tools/Webhooks)", "Até 3 Agentes Inteligentes"],
  },
  avancado: {
    name: "Avançado", price: "R$ 119,99/mês", color: "border-purple-500/50",
    features: ["Tudo do plano Profissional", "Agentes Inteligentes ilimitados", "Múltiplos canais por agente", "Suporte prioritário"],
  },
};

interface Props {
  plan: string | null;
  loadingPlan: boolean;
  subscriptionStatus: string | null;
  hasStripeCustomer: boolean;
  planActionLoading: string | null;
  planFeedback: { type: "success" | "error"; message: string } | null;
  onUpgrade: (targetPlan: string) => void;
  onManageSubscription: () => void;
}

export function PlanoTab({ plan, loadingPlan, subscriptionStatus, hasStripeCustomer, planActionLoading, planFeedback, onUpgrade, onManageSubscription }: Props) {
  const currentPlan = plan ? PLAN_INFO[plan] || PLAN_INFO.basico : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Seu Plano Atual</CardTitle>
          <CardDescription>Veja os detalhes da sua assinatura e os recursos incluídos.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPlan ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando plano...
            </div>
          ) : currentPlan ? (
            <div className={cn("rounded-xl border-2 p-5", currentPlan.color)}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-foreground">{currentPlan.name}</h3>
                    <Badge variant="success">{subscriptionStatus === "canceled" ? "Cancelado" : "Ativo"}</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">{currentPlan.price}</p>
                </div>
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <ul className="space-y-2">
                {currentPlan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm">
                    <div className="h-4 w-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {planFeedback && (
            <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium mt-4", planFeedback.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : "border-red-500/30 bg-red-500/10 text-red-400")}>
              {planFeedback.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
              {planFeedback.message}
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between gap-2 flex-wrap">
          <Button asChild variant="outline">
            <Link href="/precos">Ver detalhes dos planos <ArrowUpRight className="h-4 w-4 ml-2" /></Link>
          </Button>
          {hasStripeCustomer && (
            <Button variant="outline" onClick={onManageSubscription} disabled={planActionLoading !== null}>
              {planActionLoading === "portal" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Gerenciar assinatura
            </Button>
          )}
        </CardFooter>
      </Card>

      {!loadingPlan && plan && (
        <Card>
          <CardHeader>
            <CardTitle>Fazer upgrade</CardTitle>
            <CardDescription>Mude de plano diretamente por aqui — o pagamento é processado pelo Stripe.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {Object.entries(PLAN_INFO).filter(([id]) => id !== plan).map(([id, info]) => (
              <div key={id} className={cn("rounded-xl border-2 p-4 flex flex-col justify-between gap-3", info.color)}>
                <div>
                  <h4 className="font-semibold text-foreground">{info.name}</h4>
                  <p className="text-muted-foreground text-sm">{info.price}</p>
                </div>
                <Button size="sm" onClick={() => onUpgrade(id)} disabled={planActionLoading !== null}>
                  {planActionLoading === id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Mudar para {info.name}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
