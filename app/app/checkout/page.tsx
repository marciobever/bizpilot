"use client";
import { Suspense, useEffect, useState } from "react";
import { authFetch } from "@/lib/api-client";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Check, LogOut, QrCode, CreditCard, ArrowLeft } from "lucide-react";
import { BILLING_ITEMS, normalizeBillingItem } from "@/lib/billing/prices";
import { PixPanel } from "./_components/PixPanel";
import { CardForm } from "./_components/CardForm";

const PLANS = [
  {
    id: "starter", name: "Starter", price: "R$ 29,90",
    desc: "Para começar a automatizar o essencial.",
    features: ["1 agente inteligente", "500 conversas/mês", "50 documentos na base", "Histórico de 30 dias"],
    highlight: false,
  },
  {
    id: "pro", name: "Pro", price: "R$ 79,90",
    desc: "Para escalar com múltiplos agentes.",
    features: ["3 agentes inteligentes", "3.000 conversas/mês", "200 documentos na base", "Histórico de 90 dias", "Suporte prioritário"],
    highlight: true,
  },
  {
    id: "business", name: "Business", price: "R$ 149,00",
    desc: "Operação sem limites.",
    features: ["Agentes ilimitados", "Conversas ilimitadas", "Documentos ilimitados", "Histórico de 1 ano", "Suporte dedicado"],
    highlight: false,
  },
];

type Phase = "loading" | "confirming" | "picking" | "method" | "pix" | "card" | "cardPending";
type PixData = { chargeId: string; qrImage: string; copiaECola: string; amountCents: number };

function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const sessionId = searchParams.get("session_id"); // volta do Stripe (legado)
  const canceled = searchParams.get("canceled");
  // change=1: upgrade/renovação/add-on de quem JÁ tem assinatura ativa
  // (sem isso, assinatura ativa redireciona pro painel).
  const isChange = searchParams.get("change") === "1";

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [efi, setEfi] = useState<{ pix: boolean; card: boolean }>({ pix: false, card: false });
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [pendingChargeId, setPendingChargeId] = useState<string | null>(null);

  const selectedBilling = selectedItem ? BILLING_ITEMS[selectedItem] : null;

  function finishPaid(item: string) {
    // Reload real força o layout a reler o subscription_status já ativo.
    window.location.href = item.startsWith("addon_") ? "/app/settings?tab=plano&addon=ok" : "/app";
  }

  // ── Fallback Stripe (conta legada / Efí sem envs) ──────────────────────────
  async function stripeCheckout(plan: string) {
    const res = await authFetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const json = await res.json();
    if (!res.ok || !json.url) {
      setErrorMsg(json.error || "Não foi possível abrir o checkout.");
      setPhase("picking");
      setBusyPlan(null);
      return;
    }
    window.location.href = json.url;
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
    if (res.status === 501 && json.fallback === "stripe") { stripeCheckout(item); return; }
    if (!res.ok) { setErrorMsg(json.error || "Não foi possível gerar o Pix."); setPhase(selectedItem ? "method" : "picking"); return; }
    setPixData({ chargeId: json.chargeId, qrImage: json.qrImage, copiaECola: json.copiaECola, amountCents: json.amountCents });
    setPhase("pix");
  }

  function startCheckout(item: string) {
    setErrorMsg("");
    setSelectedItem(item);
    if (!efi.pix && !efi.card) { setBusyPlan(item); stripeCheckout(item); return; }
    if (efi.pix && !efi.card) { beginPix(item); return; }
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

      // 1) Volta do Stripe (legado): confirma e libera.
      if (sessionId) {
        setPhase("confirming");
        const res = await authFetch("/api/stripe/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const json = await res.json();
        if (cancelledFlag) return;
        if (res.ok && json.active) {
          window.location.href = json.addon ? "/app/settings?tab=plano&addon=ok" : "/app";
          return;
        }
        setErrorMsg(json.error || "Não foi possível confirmar o pagamento. Se o valor foi cobrado, aguarde alguns segundos e recarregue.");
        setPhase("picking");
        return;
      }

      // 2) Quais métodos Efí estão disponíveis?
      let methods = { pix: false, card: false };
      try {
        const res = await authFetch("/api/efi/checkout");
        if (res.ok) methods = await res.json();
      } catch { /* segue com fallback Stripe */ }
      if (cancelledFlag) return;
      setEfi(methods);

      // 3) Já tem assinatura ativa? Vai pro app — exceto upgrade/add-on (change=1).
      if (!isChange) {
        const { data: profile } = await supabase.from("profiles")
          .select("subscription_status").eq("id", user.id).single();
        if (profile?.subscription_status === "active" || profile?.subscription_status === "trialing") {
          router.replace("/app");
          return;
        }
      }

      // 4) Item explícito (landing/upgrade): pula a escolha de plano.
      const item = planParam ? normalizeBillingItem(planParam) : null;
      if (item && BILLING_ITEMS[item] && !canceled) {
        setSelectedItem(item);
        if (!methods.pix && !methods.card) { setPhase("loading"); stripeCheckout(item); return; }
        if (methods.pix && !methods.card) {
          // beginPix usa o estado efi via closure — chama com o item direto.
          setPhase("loading");
          (async () => {
            const res = await authFetch("/api/efi/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ item, method: "pix" }),
            });
            const json = await res.json();
            if (cancelledFlag) return;
            if (!res.ok) { setErrorMsg(json.error || "Não foi possível gerar o Pix."); setPhase("picking"); return; }
            setPixData({ chargeId: json.chargeId, qrImage: json.qrImage, copiaECola: json.copiaECola, amountCents: json.amountCents });
            setPhase("pix");
          })();
          return;
        }
        setPhase("method");
        return;
      }

      // 5) Caso geral: mostra os planos.
      setPhase("picking");
    }

    run();
    return () => { cancelledFlag = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planParam, sessionId, canceled, isChange, router]);

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
      if (tries >= 20) { clearInterval(timer); } // ~80s; webhook assume depois
    }, 4000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, pendingChargeId]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  }

  if (phase === "loading" || phase === "confirming") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
        <p className="text-sm text-muted-foreground">
          {phase === "confirming" ? "Confirmando seu pagamento…" : "Preparando checkout seguro…"}
        </p>
      </div>
    );
  }

  // ── Método / Pix / Cartão (item já escolhido) ──────────────────────────────
  if ((phase === "method" || phase === "pix" || phase === "card" || phase === "cardPending") && selectedBilling && selectedItem) {
    const price = `R$ ${(selectedBilling.cents / 100).toFixed(2).replace(".", ",")}`;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border p-6 space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => { setPhase(phase === "method" ? "picking" : "method"); setErrorMsg(""); }} className="p-1.5 rounded-md hover:bg-secondary">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-bold">{selectedBilling.name.replace("BizPilot — ", "")}</h1>
              <p className="text-sm text-muted-foreground">{price}/mês</p>
            </div>
          </div>

          {errorMsg && <p className="text-sm text-red-400">{errorMsg}</p>}

          {phase === "method" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Como você prefere pagar?</p>
              {efi.pix && (
                <button onClick={() => beginPix(selectedItem)} disabled={busyPlan !== null} className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-brand-500 hover:bg-brand-500/5 transition-all text-left disabled:opacity-60">
                  {busyPlan ? <Loader2 className="h-5 w-5 animate-spin" /> : <QrCode className="h-5 w-5 text-emerald-500" />}
                  <div>
                    <div className="font-medium text-sm">Pix</div>
                    <div className="text-xs text-muted-foreground">QR Code na hora — renovação mensal por novo Pix.</div>
                  </div>
                </button>
              )}
              {efi.card && (
                <button onClick={() => setPhase("card")} disabled={busyPlan !== null} className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:border-brand-500 hover:bg-brand-500/5 transition-all text-left disabled:opacity-60">
                  <CreditCard className="h-5 w-5 text-brand-500" />
                  <div>
                    <div className="font-medium text-sm">Cartão de crédito</div>
                    <div className="text-xs text-muted-foreground">Assinatura recorrente — renova sozinha todo mês.</div>
                  </div>
                </button>
              )}
            </div>
          )}

          {phase === "pix" && pixData && (
            <PixPanel
              {...pixData}
              onPaid={() => finishPaid(selectedItem)}
              onRegenerate={() => beginPix(selectedItem)}
            />
          )}

          {phase === "card" && (
            <CardForm
              item={selectedItem}
              amountCents={selectedBilling.cents}
              onPaid={() => finishPaid(selectedItem)}
              onPending={(chargeId) => { setPendingChargeId(chargeId); setPhase("cardPending"); }}
            />
          )}

          {phase === "cardPending" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
              <p className="text-sm font-medium">Processando o pagamento…</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                A operadora está validando o cartão. Isso costuma levar poucos segundos —
                assim que aprovar, seu acesso é liberado automaticamente.
              </p>
            </div>
          )}
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
              <span className="text-3xl font-bold">{p.price}</span>
              <span className="text-muted-foreground text-sm">/mês</span>
            </div>
            <ul className="space-y-2 flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" /> {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => startCheckout(p.id)}
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
