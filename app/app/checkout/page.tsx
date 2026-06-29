"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "starter";
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function go() {
      // Aguarda sessão (OAuth pode demorar um tick após o redirect)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Tenta uma vez mais após 1.5s (OAuth redirect race)
        await new Promise((r) => setTimeout(r, 1500));
        const { data: { session: s2 } } = await supabase.auth.getSession();
        if (!s2) {
          router.replace(`/auth/login?plan=${plan}`);
          return;
        }
      }

      const user = (await supabase.auth.getUser()).data.user;
      if (!user) { router.replace(`/auth/login?plan=${plan}`); return; }

      // Checa se já tem assinatura ativa
      const { data: profile } = await supabase.from("profiles")
        .select("subscription_status").eq("id", user.id).single();
      if (profile?.subscription_status === "active") {
        router.replace("/app");
        return;
      }

      // Cria sessão Stripe
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, userId: user.id, email: user.email }),
      });
      const json = await res.json();

      if (cancelled) return;

      if (!res.ok || !json.url) {
        setErrorMsg(json.error || "Não foi possível abrir o checkout.");
        setStatus("error");
        return;
      }

      window.location.href = json.url;
    }

    go();
    return () => { cancelled = true; };
  }, [plan, router]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-red-500 font-medium">{errorMsg}</p>
        <p className="text-sm text-muted-foreground">
          Verifique se as variáveis <code>STRIPE_PRICE_*</code> estão configuradas na Vercel.
        </p>
        <button
          onClick={() => router.push("/app/settings?tab=plano")}
          className="text-sm text-brand-400 hover:text-brand-300 underline"
        >
          Ir para configurações
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
      <p className="text-sm text-muted-foreground">Abrindo checkout seguro…</p>
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
