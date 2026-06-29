"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, Check, LogOut } from "lucide-react";

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

function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan");
  const sessionId = searchParams.get("session_id");
  const canceled = searchParams.get("canceled");

  const [phase, setPhase] = useState<"loading" | "confirming" | "picking" | "redirecting" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  // Inicia o checkout no Stripe para um plano específico.
  async function startCheckout(plan: string) {
    setBusyPlan(plan);
    setErrorMsg("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace(`/auth/login?plan=${plan}`); return; }

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, userId: user.id, email: user.email }),
    });
    const json = await res.json();
    if (!res.ok || !json.url) {
      setErrorMsg(json.error || "Não foi possível abrir o checkout.");
      setPhase("error");
      setBusyPlan(null);
      return;
    }
    window.location.href = json.url;
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

      // 1) Voltou do Stripe: confirma o pagamento e libera o app.
      if (sessionId) {
        setPhase("confirming");
        const res = await fetch("/api/stripe/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const json = await res.json();
        if (cancelledFlag) return;
        if (res.ok && json.active) {
          // Reload real: força o layout a reler o subscription_status já ativo.
          window.location.href = "/app";
          return;
        }
        setErrorMsg(json.error || "Não foi possível confirmar o pagamento. Se o valor foi cobrado, aguarde alguns segundos e recarregue.");
        setPhase("error");
        return;
      }

      // 2) Já tem assinatura ativa? Vai pro app.
      const { data: profile } = await supabase.from("profiles")
        .select("subscription_status").eq("id", user.id).single();
      if (profile?.subscription_status === "active" || profile?.subscription_status === "trialing") {
        router.replace("/app");
        return;
      }

      // 3) Plano explícito (veio da landing): manda direto pro Stripe.
      if (planParam && !canceled) {
        setPhase("redirecting");
        startCheckout(planParam);
        return;
      }

      // 4) Caso geral: mostra os planos pra escolher.
      setPhase("picking");
    }

    run();
    return () => { cancelledFlag = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planParam, sessionId, canceled, router]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/auth/login");
  }

  if (phase === "loading" || phase === "redirecting" || phase === "confirming") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
        <p className="text-sm text-muted-foreground">
          {phase === "confirming" ? "Confirmando seu pagamento…" : "Abrindo checkout seguro…"}
        </p>
      </div>
    );
  }

  // Tela de escolha de plano (e também o estado de erro com os planos visíveis).
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="text-center max-w-2xl">
        <h1 className="text-3xl font-bold mb-2">Escolha seu plano</h1>
        <p className="text-muted-foreground">
          Para começar a usar a plataforma, escolha o plano ideal. Use o cupom no checkout para desconto no 1º mês.
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
