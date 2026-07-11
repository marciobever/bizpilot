"use client";
import { Suspense, useEffect, useState } from "react";
import { authFetch } from "@/lib/api-client";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Check, LogOut, QrCode, CreditCard, ArrowLeft, Lock, ShieldCheck, Bot } from "lucide-react";
import { BILLING_ITEMS, normalizeBillingItem } from "@/lib/billing/prices";
import { PixPanel } from "./_components/PixPanel";
import { CardForm } from "./_components/CardForm";

const PLANS = [
  {
    id: "starter", name: "Starter", price: "R$ 29,90", annualPrice: "R$ 299,00",
    desc: "Para começar a automatizar o essencial.",
    features: ["1 agente inteligente", "500 conversas/mês", "50 documentos na base", "Histórico de 30 dias"],
    highlight: false,
  },
  {
    id: "pro", name: "Pro", price: "R$ 79,90", annualPrice: "R$ 799,00",
    desc: "Para escalar com múltiplos agentes.",
    features: ["3 agentes inteligentes", "3.000 conversas/mês", "200 documentos na base", "Histórico de 90 dias", "Suporte prioritário"],
    highlight: true,
  },
  {
    id: "business", name: "Business", price: "R$ 149,00", annualPrice: "R$ 1.490,00",
    desc: "Operação sem limites.",
    features: ["Agentes ilimitados", "Conversas ilimitadas", "Documentos ilimitados", "Histórico de 1 ano", "Suporte dedicado"],
    highlight: false,
  },
];

// Resumo mostrado ao lado do pagamento (o que a pessoa está comprando).
const ITEM_DETAILS: Record<string, { desc: string; features?: string[] }> = {
  starter: {
    desc: "Para começar a automatizar o essencial.",
    features: ["1 agente inteligente", "500 conversas/mês", "50 documentos na base", "Histórico de 30 dias", "WhatsApp Evolution ou Meta Oficial"],
  },
  pro: {
    desc: "Para escalar com múltiplos agentes.",
    features: ["3 agentes inteligentes", "3.000 conversas/mês", "200 documentos na base", "Histórico de 90 dias", "Suporte prioritário"],
  },
  business: {
    desc: "Operação sem limites.",
    features: ["Agentes ilimitados", "Conversas ilimitadas", "Documentos ilimitados", "Histórico de 1 ano", "Suporte dedicado"],
  },
  addon_bot: {
    desc: "Mais um agente inteligente além do limite do seu plano — ideal pra atender outro número ou outra área do negócio.",
    features: ["+1 agente no seu limite", "Vale enquanto a assinatura estiver ativa", "Pode contratar mais de um"],
  },
  starter_anual: {
    desc: "Plano Starter por 12 meses — 2 meses grátis, Pix à vista.",
    features: ["Tudo do Starter por 1 ano", "Equivale a 10x a mensalidade", "Pagamento único via Pix"],
  },
  pro_anual: {
    desc: "Plano Pro por 12 meses — 2 meses grátis, Pix à vista.",
    features: ["Tudo do Pro por 1 ano", "Equivale a 10x a mensalidade", "Pagamento único via Pix"],
  },
  business_anual: {
    desc: "Plano Business por 12 meses — 2 meses grátis, Pix à vista.",
    features: ["Tudo do Business por 1 ano", "Equivale a 10x a mensalidade", "Pagamento único via Pix"],
  },
  addon_conversations: {
    desc: "Mais volume de atendimento sem trocar de plano.",
    features: ["+500 conversas/mês", "Soma com o limite do plano", "Pode contratar mais de um"],
  },
  addon_campaigns: {
    desc: "Amplie seus disparos em massa para campanhas e promoções.",
    features: ["+1.000 disparos/mês", "Soma com o limite do plano"],
  },
  addon_voice: {
    desc: "Seu agente responde também em áudio, com voz natural.",
    features: ["Respostas em áudio (TTS)", "Vozes em português", "Liga/desliga por agente"],
  },
  addon_whatsapp_number: {
    desc: "Número virtual dedicado conectado à nossa infraestrutura — sem usar seu chip.",
    features: ["Número exclusivo do seu bot", "Provisionamento pela nossa equipe"],
  },
};

type Phase = "loading" | "picking" | "method" | "pix" | "card" | "cardPending";
type PixData = { chargeId: string; qrImage: string; copiaECola: string; amountCents: number };

function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const canceled = searchParams.get("canceled");
  // change=1: upgrade/renovação/add-on de quem JÁ tem assinatura ativa
  // (sem isso, assinatura ativa redireciona pro painel).
  const isChange = searchParams.get("change") === "1";

  const [phase, setPhase] = useState<Phase>("loading");
  const [annual, setAnnual] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [efi, setEfi] = useState<{ pix: boolean; card: boolean }>({ pix: false, card: false });
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [pendingChargeId, setPendingChargeId] = useState<string | null>(null);
  const [pendingSlow, setPendingSlow] = useState(false);
  const [pendingRound, setPendingRound] = useState(0); // re-arma o polling no "Verificar novamente"

  const selectedBilling = selectedItem ? BILLING_ITEMS[selectedItem] : null;

  function finishPaid(item: string) {
    // Reload real força o layout a reler o subscription_status já ativo.
    window.location.href = item.startsWith("addon_") ? "/app/settings?tab=plano&addon=ok" : "/app";
  }

  async function beginPix(item: string) {
    setBusyPlan(item);
    setErrorMsg("");
    const res = await authFetch("/api/efi/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item, method: "pix" }),
    });
    const json = await res.json();
    setBusyPlan(null);
    if (!res.ok) { setErrorMsg(json.error || "Não foi possível gerar o Pix."); setPhase(selectedItem ? "method" : "picking"); return; }
    setPixData({ chargeId: json.chargeId, qrImage: json.qrImage, copiaECola: json.copiaECola, amountCents: json.amountCents });
    setPhase("pix");
  }

  function startCheckout(item: string) {
    setErrorMsg("");
    setSelectedItem(item);
    if (!efi.pix && !efi.card) {
      setErrorMsg("Pagamentos temporariamente indisponíveis. Tente novamente em alguns minutos ou fale com o suporte.");
      setSelectedItem(null);
      return;
    }
    setPhase("method");
  }

  useEffect(() => {
    let cancelledFlag = false;

    async function run() {
      // Garante sessão de auth (OAuth pode demorar um tick após o redirect).
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await new Promise((r) => setTimeout(r, 1500));
        ({ data: { session } } = await supabase.auth.getSession());
        if (!session) {
          router.replace(planParam ? `/auth/login?plan=${planParam}` : "/auth/login");
          return;
        }
      }
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) { router.replace("/auth/login"); return; }

      // 1) Quais métodos de pagamento estão disponíveis?
      let methods = { pix: false, card: false };
      try {
        const res = await authFetch("/api/efi/checkout");
        if (res.ok) methods = await res.json();
      } catch { /* mostra "indisponível" ao tentar pagar */ }
      if (cancelledFlag) return;
      setEfi(methods);

      // 2) Já tem assinatura PAGA ativa? Vai pro app — exceto upgrade/add-on
      // (change=1). Quem está em trial PODE seguir: veio aqui pra assinar.
      if (!isChange) {
        const { data: profile } = await supabase.from("profiles")
          .select("subscription_status").eq("id", user.id).single();
        if (profile?.subscription_status === "active") {
          router.replace("/app");
          return;
        }
      }

      // 3) Item explícito (landing/upgrade): pula a escolha de plano.
      const item = planParam ? normalizeBillingItem(planParam) : null;
      if (item && BILLING_ITEMS[item] && !canceled) {
        setSelectedItem(item);
        if (!methods.pix && !methods.card) {
          setErrorMsg("Pagamentos temporariamente indisponíveis. Tente novamente em alguns minutos ou fale com o suporte.");
          setSelectedItem(null);
          setPhase("picking");
          return;
        }
        setPhase("method");
        return;
      }

      // 4) Caso geral: mostra os planos.
      setPhase("picking");
    }

    run();
    return () => { cancelledFlag = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planParam, canceled, isChange, router]);

  // Polling do cartão pendente (análise antifraude pode segurar uns segundos).
  useEffect(() => {
    if (phase !== "cardPending" || !pendingChargeId) return;
    let tries = 0;
    const timer = setInterval(async () => {
      tries += 1;
      try {
        const res = await authFetch("/api/efi/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chargeId: pendingChargeId }),
        });
        const json = await res.json();
        if (json.active) { clearInterval(timer); finishPaid(selectedItem || "plan"); return; }
        if (json.failed) {
          clearInterval(timer);
          setErrorMsg("O pagamento não foi aprovado pela operadora do cartão. Tente outro cartão ou pague com Pix.");
          setPhase("method");
        }
      } catch { /* tenta de novo */ }
      // ~80s sem resposta: mostra o estado "demorando" (webhook/confirm cobrem depois).
      if (tries >= 20) { clearInterval(timer); setPendingSlow(true); }
    }, 4000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pendingChargeId, pendingRound]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  }

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
        <p className="text-sm text-muted-foreground">Preparando checkout seguro…</p>
      </div>
    );
  }

  // ── Método / Pix / Cartão (item já escolhido) ──────────────────────────────
  if ((phase === "method" || phase === "pix" || phase === "card" || phase === "cardPending") && selectedBilling && selectedItem) {
    const price = `R$ ${(selectedBilling.cents / 100).toFixed(2).replace(".", ",")}`;
    const details = ITEM_DETAILS[selectedItem];
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/20 px-4 py-8">
        <div className="w-full max-w-4xl rounded-2xl border border-border bg-card shadow-xl overflow-hidden grid md:grid-cols-11">
          {/* ── Resumo do produto ── */}
          <div className="md:col-span-5 bg-secondary/40 border-b md:border-b-0 md:border-r border-border p-6 sm:p-8 flex flex-col">
            <div className="flex items-center gap-2.5 mb-8">
              <button onClick={() => { setPhase(phase === "method" ? "picking" : "method"); setErrorMsg(""); }} className="p-2 -ml-2 rounded-lg hover:bg-secondary" aria-label="Voltar">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg">BizPilot</span>
            </div>

            <p className="text-sm text-muted-foreground">
              Assinar {selectedBilling.kind === "plan" ? "o plano" : "o complemento"}
            </p>
            <p className="text-xl font-bold mb-2">{selectedBilling.name.replace("BizPilot — ", "").replace("Plano ", "")}</p>
            <p className="mb-5">
              <span className="text-4xl font-bold tracking-tight">{price}</span>
              <span className="text-base text-muted-foreground ml-1">/mês</span>
            </p>

            {details?.desc && <p className="text-sm text-muted-foreground mb-5">{details.desc}</p>}

            {details?.features && (
              <ul className="space-y-2.5">
                {details.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-emerald-500" />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
            )}

            <p className="text-xs text-muted-foreground mt-6 pt-4 border-t border-border">
              Cobrança mensal. Sem fidelidade — cancele quando quiser.
            </p>
          </div>

          {/* ── Pagamento ── */}
          <div className="md:col-span-6 p-6 sm:p-8 flex flex-col">
            {errorMsg && (
              <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">{errorMsg}</div>
            )}

            {phase === "method" && (
              <div className="space-y-3.5 checkout-in">
                <h2 className="text-lg font-bold mb-4">Forma de pagamento</h2>
                {efi.pix && (
                  <button onClick={() => beginPix(selectedItem)} disabled={busyPlan !== null} className="w-full flex items-start gap-3.5 p-4 rounded-xl border-2 border-border hover:border-brand-500 hover:bg-brand-500/5 transition-all text-left disabled:opacity-60">
                    {busyPlan ? <Loader2 className="h-6 w-6 animate-spin shrink-0 mt-0.5" /> : <QrCode className="h-6 w-6 text-emerald-500 shrink-0 mt-0.5" />}
                    <div>
                      <div className="font-semibold text-base flex items-center gap-2 flex-wrap">
                        Pix
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2 py-0.5">Aprovação na hora</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">
                        {selectedBilling?.periodDays === 365
                          ? "QR Code aqui na tela, confirmado em segundos. Pagamento único — vale por 12 meses."
                          : "QR Code aqui na tela, confirmado em segundos. Renovação mensal por um novo Pix."}
                      </div>
                    </div>
                  </button>
                )}
                {(() => {
                  // Plano anual é Pix à vista — assinatura de cartão da Efí é mensal.
                  const isAnnual = selectedBilling?.periodDays === 365;
                  const cardEnabled = efi.card && !isAnnual;
                  return (
                <button onClick={() => cardEnabled && setPhase("card")} disabled={!cardEnabled || busyPlan !== null} className={`w-full flex items-start gap-3.5 p-4 rounded-xl border-2 border-border transition-all text-left ${cardEnabled ? "hover:border-brand-500 hover:bg-brand-500/5 disabled:opacity-60" : "opacity-50 cursor-not-allowed"}`}>
                  <CreditCard className="h-6 w-6 text-brand-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-base flex items-center gap-2 flex-wrap">
                      Cartão de crédito
                      {cardEnabled
                        ? <span className="text-[11px] font-semibold text-brand-500 bg-brand-500/10 rounded-full px-2 py-0.5">Renova sozinho</span>
                        : <span className="text-[11px] font-semibold text-muted-foreground bg-secondary rounded-full px-2 py-0.5">{isAnnual ? "Anual é só Pix à vista" : "Indisponível no momento"}</span>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {isAnnual
                        ? "No plano anual o pagamento é um Pix único — sem cobrança recorrente."
                        : "Assinatura recorrente: cobra automaticamente todo mês. Não guardamos os dados do seu cartão."}
                    </div>
                  </div>
                </button>
                  );
                })()}
              </div>
            )}

            {phase === "pix" && pixData && (
              <div className="checkout-in">
                <PixPanel
                  {...pixData}
                  onPaid={() => finishPaid(selectedItem)}
                  onRegenerate={() => beginPix(selectedItem)}
                />
              </div>
            )}

            {phase === "card" && (
              <div className="checkout-in">
                <CardForm
                  item={selectedItem}
                  amountCents={selectedBilling.cents}
                  onPaid={() => finishPaid(selectedItem)}
                  onPending={(chargeId) => { setPendingChargeId(chargeId); setPhase("cardPending"); }}
                />
              </div>
            )}

            {phase === "cardPending" && !pendingSlow && (
              <div className="flex flex-col items-center gap-4 py-12 text-center checkout-in">
                <Loader2 className="h-10 w-10 animate-spin text-brand-400" />
                <p className="text-base font-semibold">Processando o pagamento…</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  A operadora está validando o cartão. Isso costuma levar poucos segundos —
                  assim que aprovar, seu acesso é liberado automaticamente.
                </p>
              </div>
            )}

            {phase === "cardPending" && pendingSlow && (
              <div className="flex flex-col items-center gap-4 py-12 text-center checkout-in">
                <div className="h-12 w-12 rounded-full bg-amber-500/15 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 text-amber-500" />
                </div>
                <p className="text-base font-semibold">Ainda estamos confirmando com a operadora</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Está demorando mais que o normal, mas não se preocupe: assim que a operadora
                  aprovar, seu acesso é liberado automaticamente — mesmo que você feche esta página.
                </p>
                <button
                  onClick={() => { setPendingSlow(false); setPendingRound((r) => r + 1); }}
                  className="h-11 px-5 rounded-lg border border-border hover:bg-secondary text-sm font-semibold"
                >
                  Verificar novamente
                </button>
              </div>
            )}

            {/* Selos de segurança */}
            <div className="mt-auto pt-6">
              <div className="flex items-center justify-center gap-5 flex-wrap pt-4 pb-2 border-t border-border">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 text-emerald-500" /> Pagamento 100% seguro
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Dados criptografados
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                Processado pela <span className="font-semibold">Efí Bank</span>, instituição de pagamento autorizada pelo Banco Central do Brasil.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Escolha de plano ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="text-center max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Escolha seu plano</h1>
        <p className="text-muted-foreground">
          Pague com Pix ou cartão. Sem fidelidade — cancele quando quiser.
        </p>
        {canceled && (
          <p className="mt-3 text-sm text-amber-400">Pagamento cancelado. Você pode escolher um plano abaixo quando quiser.</p>
        )}
        {errorMsg && (
          <p className="mt-3 text-sm text-red-400">{errorMsg}</p>
        )}
      </div>

      {/* Toggle mensal/anual — anual = 10x o mensal (2 meses grátis), Pix à vista */}
      <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1 text-sm font-medium">
        <button
          onClick={() => setAnnual(false)}
          className={`px-4 py-1.5 rounded-full transition-colors ${!annual ? "bg-brand-500 text-white" : "text-muted-foreground hover:text-foreground"}`}
        >
          Mensal
        </button>
        <button
          onClick={() => setAnnual(true)}
          className={`px-4 py-1.5 rounded-full transition-colors flex items-center gap-2 ${annual ? "bg-brand-500 text-white" : "text-muted-foreground hover:text-foreground"}`}
        >
          Anual
          <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${annual ? "bg-white/20" : "bg-emerald-500/10 text-emerald-500"}`}>2 meses grátis</span>
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-3 w-full max-w-5xl">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`rounded-2xl border-2 p-6 flex flex-col gap-4 ${
              p.highlight ? "border-brand-500 shadow-xl shadow-brand-500/10 relative" : "border-border"
            }`}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">
                Mais Popular
              </span>
            )}
            <div>
              <h3 className="text-xl font-bold">{p.name}</h3>
              <p className="text-sm text-muted-foreground h-10">{p.desc}</p>
            </div>
            <div>
              <span className="text-3xl font-bold">{annual ? p.annualPrice : p.price}</span>
              <span className="text-muted-foreground text-sm">{annual ? "/ano" : "/mês"}</span>
              {annual && <p className="text-xs text-emerald-500 font-medium mt-1">Pix à vista — equivale a 10x a mensalidade</p>}
            </div>
            <ul className="space-y-2 flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => startCheckout(annual ? `${p.id}_anual` : p.id)}
              disabled={busyPlan !== null}
              className={`w-full h-11 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                p.highlight
                  ? "bg-brand-500 hover:bg-brand-600 text-white"
                  : "border border-border hover:bg-secondary"
              } disabled:opacity-60`}
            >
              {busyPlan === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Assinar {p.name}
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <LogOut className="h-4 w-4" /> Sair da conta
      </button>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutInner />
    </Suspense>
  );
}
