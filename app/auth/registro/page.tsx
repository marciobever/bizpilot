"use client";
import React, { Suspense, useState } from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { supabase } from "@/lib/supabase";
import { authFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { AlertCircle, Loader2 } from "lucide-react";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

function RegisterForm() {
  const navigate = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user) {
        // Conta nova nasce em trial de 7 dias (trigger handle_new_user).
        // Se escolheu um plano em /precos, o trial roda nesse plano —
        // best-effort: falha aqui não trava o cadastro (fica no starter).
        if (plan) {
          try { await authFetch("/api/billing/start-trial", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan }) }); } catch {}
        }
        navigate.push("/app");
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2 text-red-500 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <GoogleAuthButton label="Cadastrar com Google" plan={plan || undefined} />

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">ou cadastre com e-mail</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" placeholder="nome@empresa.com.br" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Senha</Label>
          <Link href="/auth/recuperar" className="text-xs text-brand-400 hover:text-brand-300">Esqueceu a senha?</Link>
        </div>
        <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>

      <Button type="submit" className="w-full bg-brand-500 hover:bg-brand-600 text-white" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Conta"}
      </Button>

      <div className="text-center text-sm text-muted-foreground mt-4">
        Já tem uma conta?{" "}
        <Link href={plan ? `/auth/login?plan=${plan}` : "/auth/login"} className="text-brand-400 hover:text-brand-300 font-medium">
          Fazer login
        </Link>
      </div>
    </form>
  );
}

export default function Register() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
