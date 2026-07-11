"use client";
import Link from "next/link";
import { CreditCard, Check, Loader2, ArrowUpRight, AlertTriangle, CheckCircle2, Zap, Bot, Megaphone, Volume2, Phone, MessageCircle } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "R$ 29,90",
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
    price: "R$ 79,90",
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
    price: "R$ 149,00",
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

const ADDONS = [
  {
    id: "addon_bot",
    name: "Bot Adicional",
    price: "R$ 19,90",
    icon: Bot,
    desc: "Adicione mais um agente além do limite do seu plano.",
  },
  {
    id: "addon_conversations",
    name: "Conversas Extras",
    price: "R$ 14,90",
    icon: MessageCircle,
    desc: "+500 conversas/mês além do limite do seu plano.",
  },
  {
    id: "addon_campaigns",
    name: "Campanhas Extras",
    price: "R$ 29,90",
    icon: Megaphone,
    desc: "+1.000 disparos/mês para campanhas em massa.",
  },
  {
    id: "addon_voice",
    name: "Voz Inteligente",
    price: "R$ 39,90",
    icon: Volume2,
    desc: "Respostas em áudio com TTS de alta qualidade.",
  },
  {
    id: "addon_whatsapp_number",
    name: "Número WhatsApp",
    price: "R$ 49,90",
    icon: Phone,
    desc: "Número virtual dedicado conectado à nossa infraestrutura.",
    // Sem estoque de números ainda (whatsapp_number_pool não existe) —
    // não vender o que não conseguimos entregar.
    comingSoon: true,
  },
];

interface UsageMetric { used: number; limit: number }
interface UsageResponse {
  usage?: {
    conversations?: UsageMetric;
    kbDocs?: UsageMetric;
    aiCost?: { used_usd: number; limit_usd: number };
  };
}

interface Props {
  plan: string | null;
  loadingPlan: boolean;
  subscriptionStatus: string | null;
  billingProvider?: string | null;
  currentPeriodEnd?: string | null;
  hasEfiSubscription?: boolean; // assinatura de cartão Efí (renova sozinha)
  planActionLoading: string | null;
  planFeedback: { type: "success" | "error"; message: string } | null;
  addonCounts?: Record<string, number>;
  usage?: UsageResponse | null;
  onUpgrade: (targetPlan: string) => void;
  onCancelEfi?: () => void;
}

function UsageBar({ label, used, limit, currency }: { label: string; used: number; limit: number; currency?: boolean }) {
  const unlimited = limit === -1;
  const pct = unlimited ? 0 : Math.min(100, (used / Math.max(limit, 0.01)) * 100);
  const barColor = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-warning" : "bg-brand-500";
  const fmt = (n: number) => currency ? `R$ ${n.toFixed(2).replace(".", ",")}` : `${Math.round(n)}`;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{unlimited ? "Ilimitado" : `${fmt(used)} de ${fmt(limit)}`}</span>
      </div>
      {!unlimited && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export function PlanoTab({
  plan, loadingPlan, subscriptionStatus,
  billingProvider, currentPeriodEnd, hasEfiSubscription,
  planActionLoading, planFeedback, addonCounts = {}, usage,
  onUpgrade, onCancelEfi,
}: Props) {
  // Normaliza nomes antigos
  const normalizedPlan = plan === "basico" ? "starter" : plan === "profissional" ? "pro" : plan === "avancado" ? "business" : (plan || "starter");
  const currentPlan = PLANS.find((p) => p.id === normalizedPlan) || PLANS[0];
  const isEfi = billingProvider === "efi";
  const periodEndLabel = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : null;

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
                    {subscriptionStatus === "active" && <Badge variant="success">Ativo</Badge>}
                    {subscriptionStatus === "trialing" && <Badge variant="secondary" className="bg-brand-500/10 text-brand-500 border-0">Período de teste</Badge>}
                    {subscriptionStatus === "canceled" && <Badge variant="destructive">Cancelado</Badge>}
                    {subscriptionStatus === "past_due" && <Badge variant="destructive">Pagamento pendente</Badge>}
                    {(!subscriptionStatus || subscriptionStatus === "incomplete") && <Badge variant="secondary">Sem assinatura</Badge>}
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
          <div className="flex items-center gap-3 flex-wrap">
            <Button asChild variant="outline">
              <Link href="/precos">Ver todos os planos <ArrowUpRight className="h-4 w-4 ml-2" /></Link>
            </Button>
            {isEfi && periodEndLabel && (
              <span className="text-xs text-muted-foreground">
                {hasEfiSubscription
                  ? `Renova automaticamente em ${periodEndLabel}.`
                  : subscriptionStatus === "trialing"
                    ? `Teste grátis até ${periodEndLabel} — assine para continuar depois.`
                    : subscriptionStatus === "canceled"
                      ? `Acesso até ${periodEndLabel}.`
                      : `Pago até ${periodEndLabel} — renove com um novo Pix.`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Pix mensal: renovar gera um novo QR do plano atual. */}
            {isEfi && !hasEfiSubscription && subscriptionStatus !== "canceled" && (
              <Button asChild variant="outline">
                <Link href={`/app/checkout?plan=${normalizedPlan}&change=1`}>
                  <CreditCard className="h-4 w-4 mr-2" /> {subscriptionStatus === "trialing" ? "Assinar agora" : "Renovar agora"}
                </Link>
              </Button>
            )}
            {isEfi && subscriptionStatus === "canceled" && (
              <Button asChild>
                <Link href={`/app/checkout?plan=${normalizedPlan}&change=1`}>Reativar assinatura</Link>
              </Button>
            )}
            {isEfi && subscriptionStatus === "active" && onCancelEfi && (
              <Button variant="outline" className="text-destructive hover:bg-destructive/10 border-destructive/20" onClick={onCancelEfi} disabled={planActionLoading !== null}>
                {planActionLoading === "cancel" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Cancelar assinatura
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Consumo do mês */}
      {!loadingPlan && usage?.usage && (
        <Card>
          <CardHeader>
            <CardTitle>Consumo deste mês</CardTitle>
            <CardDescription>Uso do seu plano de acordo com os limites contratados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {usage.usage.conversations && (
              <UsageBar label="Conversas no mês" used={usage.usage.conversations.used} limit={usage.usage.conversations.limit} />
            )}
            {usage.usage.kbDocs && (
              <UsageBar label="Documentos na base de conhecimento" used={usage.usage.kbDocs.used} limit={usage.usage.kbDocs.limit} />
            )}
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm">
              <Link href="/app/uso">Ver consumo de IA por bot, dia e conversa <ArrowUpRight className="h-4 w-4 ml-2" /></Link>
            </Button>
          </CardFooter>
        </Card>
      )}

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

      {/* Extras / Add-ons */}
      {!loadingPlan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-500" />
              Complementos
            </CardTitle>
            <CardDescription>Adicione recursos extras ao seu plano atual, sem precisar fazer upgrade.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {ADDONS.map((addon) => {
              const Icon = addon.icon;
              const owned = addonCounts[addon.id] ?? 0;
              const singleInstance = addon.id === "addon_voice"; // voz é liga/desliga
              const isMaxed = singleInstance && owned > 0;
              const comingSoon = (addon as { comingSoon?: boolean }).comingSoon === true;
              // Business já tem bots e conversas ilimitados — vender esses
              // add-ons nesse plano seria cobrar por nada.
              const includedInPlan = normalizedPlan === "business" && (addon.id === "addon_bot" || addon.id === "addon_conversations");
              const includedDesc = addon.id === "addon_bot" ? "Seu plano já inclui agentes ilimitados." : "Seu plano já inclui conversas ilimitadas.";
              return (
                <div key={addon.id} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{addon.name}</span>
                        {comingSoon ? (
                          <Badge variant="secondary" className="text-[10px]">Em breve</Badge>
                        ) : includedInPlan ? (
                          <Badge variant="success" className="text-[10px]">Incluso no plano</Badge>
                        ) : owned > 0 && (
                          <Badge variant="success" className="text-[10px]">
                            {singleInstance ? "Ativo" : `Ativo (${owned})`}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {includedInPlan ? includedDesc : addon.desc}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    {comingSoon ? (
                      <span className="text-sm font-semibold text-muted-foreground">Em breve</span>
                    ) : includedInPlan ? (
                      <span className="text-sm font-semibold text-emerald-500">Incluso</span>
                    ) : (
                      <span className="text-lg font-bold">{addon.price}<span className="text-xs font-normal text-muted-foreground">/mês</span></span>
                    )}
                    {!includedInPlan && !comingSoon && (
                      <Button size="sm" variant="outline" onClick={() => onUpgrade(addon.id)} disabled={planActionLoading !== null || isMaxed}>
                        {planActionLoading === addon.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                        {isMaxed ? "Contratado" : owned > 0 ? "Adicionar outro" : "Adicionar"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
