"use client";
import Link from "next/link";
import { CreditCard, Check, Loader2, ArrowUpRight, AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "R$ 29",
    period: "/mês",
    color: "border-border",
    highlight: false,
    features: [
      "1 agente inteligente",
      "500 conversas/mês",
      "50 documentos na base de conhecimento",
      "Histórico de 30 dias",
      "Todas as integrações inclusas",
      "Repasse para atendimento humano",
      "WhatsApp Evolution ou Meta Oficial",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 79",
    period: "/mês",
    color: "border-brand-500/50",
    highlight: true,
    features: [
      "3 agentes inteligentes",
      "3.000 conversas/mês",
      "200 documentos na base de conhecimento",
      "Histórico de 90 dias",
      "Todas as integrações inclusas",
      "Suporte prioritário",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: "R$ 149",
    period: "/mês",
    color: "border-purple-500/50",
    highlight: false,
    features: [
      "Agentes ilimitados",
      "Conversas ilimitadas",
      "Documentos ilimitados",
      "Histórico de 1 ano",
      "Todas as integrações inclusas",
      "Suporte dedicado",
    ],
  },
];

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

export function PlanoTab({
  plan, loadingPlan, subscriptionStatus, hasStripeCustomer,
  planActionLoading, planFeedback, onUpgrade, onManageSubscription,
}: Props) {
  // Normaliza nomes antigos
  const normalizedPlan = plan === "basico" ? "starter" : plan === "profissional" ? "pro" : plan === "avancado" ? "business" : (plan || "starter");
  const currentPlan = PLANS.find((p) => p.id === normalizedPlan) || PLANS[0];

  return (
    <div className="space-y-6">
      {/* Plano atual */}
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
          ) : (
            <div className={cn("rounded-xl border-2 p-5", currentPlan.color)}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold">{currentPlan.name}</h3>
                    <Badge variant="success">{subscriptionStatus === "canceled" ? "Cancelado" : "Ativo"}</Badge>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    <span className="text-2xl font-bold text-foreground">{currentPlan.price}</span>{currentPlan.period}
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
              <ul className="space-y-2">
                {currentPlan.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm">
                    <div className="h-4 w-4 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 text-emerald-500" />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {planFeedback && (
            <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium mt-4",
              planFeedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            )}>
              {planFeedback.type === "success"
                ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                : <AlertTriangle className="h-4 w-4 shrink-0" />}
              {planFeedback.message}
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-between gap-2 flex-wrap">
          <Button asChild variant="outline">
            <Link href="/precos">Ver todos os planos <ArrowUpRight className="h-4 w-4 ml-2" /></Link>
          </Button>
          {hasStripeCustomer && (
            <Button variant="outline" onClick={onManageSubscription} disabled={planActionLoading !== null}>
              {planActionLoading === "portal"
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <CreditCard className="h-4 w-4 mr-2" />}
              Gerenciar assinatura
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Upgrade */}
      {!loadingPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-brand-500" />
              Fazer upgrade
            </CardTitle>
            <CardDescription>Mais bots, mais conversas, mais escala.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PLANS.filter((p) => p.id !== normalizedPlan).map((p) => (
              <div key={p.id} className={cn("rounded-xl border-2 p-4 flex flex-col justify-between gap-4", p.color)}>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold">{p.name}</h4>
                    {p.highlight && <Badge variant="secondary" className="text-[10px] bg-brand-500/10 text-brand-500 border-0">Popular</Badge>}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    <span className="text-xl font-bold text-foreground">{p.price}</span>{p.period}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {p.features.slice(0, 3).map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="h-3 w-3 text-emerald-500 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button size="sm" className={p.highlight ? "bg-brand-500 hover:bg-brand-600 text-white" : ""} onClick={() => onUpgrade(p.id)} disabled={planActionLoading !== null}>
                  {planActionLoading === p.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Mudar para {p.name}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
