"use client";
import React, { useEffect, useState } from "react";
import {
  User as UserIcon,
  Palette,
  CreditCard,
  Shield,
  Sun,
  Moon,
  Check,
  Loader2,
  Save,
  KeyRound,
  ArrowUpRight,
  LogOut,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

type TabId = "perfil" | "aparencia" | "plano" | "seguranca";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "perfil", label: "Perfil", icon: UserIcon },
  { id: "aparencia", label: "Aparência", icon: Palette },
  { id: "plano", label: "Plano", icon: CreditCard },
  { id: "seguranca", label: "Segurança", icon: Shield },
];

const PLAN_INFO: Record<string, { name: string; price: string; features: string[]; color: string }> = {
  basico: {
    name: "Básico",
    price: "R$ 39,99/mês",
    color: "border-border",
    features: [
      "1 Agente Inteligente",
      "Respostas em texto, ilimitadas",
      "Repasse (Handoff) para atendimento humano",
      "Base de Conhecimento (RAG)",
      "WhatsApp via Evolution API ou Meta Oficial",
    ],
  },
  profissional: {
    name: "Profissional",
    price: "R$ 79,99/mês",
    color: "border-brand-500/50",
    features: [
      "Tudo do plano Básico",
      "Respostas em Áudio (Voz Inteligente / TTS)",
      "Memória de Dados (registros do cliente)",
      "Ações e APIs (Tools/Webhooks)",
      "Até 3 Agentes Inteligentes",
    ],
  },
  avancado: {
    name: "Avançado",
    price: "R$ 119,99/mês",
    color: "border-purple-500/50",
    features: [
      "Tudo do plano Profissional",
      "Agentes Inteligentes ilimitados",
      "Múltiplos canais por agente",
      "Suporte prioritário",
    ],
  },
};

function FeedbackBanner({ type, message }: { type: "success" | "error"; message: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
        type === "success"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
          : "border-red-500/30 bg-red-500/10 text-red-400"
      )}
    >
      {type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
      {message}
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>("perfil");

  // Perfil
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Plano
  const [plan, setPlan] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  // Segurança
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  }, [user]);

  useEffect(() => {
    const loadPlan = async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
      setPlan(data?.plan || "basico");
      setLoadingPlan(false);
    };
    loadPlan();
  }, [user]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileFeedback(null);
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    setSavingProfile(false);
    if (error) {
      setProfileFeedback({ type: "error", message: "Não foi possível salvar suas informações. Tente novamente." });
    } else {
      setProfileFeedback({ type: "success", message: "Informações do perfil atualizadas com sucesso." });
    }
  };

  const handleChangePassword = async () => {
    setPasswordFeedback(null);
    if (newPassword.length < 6) {
      setPasswordFeedback({ type: "error", message: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: "error", message: "As senhas não coincidem." });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordFeedback({ type: "error", message: error.message || "Não foi possível alterar a senha." });
    } else {
      setPasswordFeedback({ type: "success", message: "Senha alterada com sucesso." });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  const initials = user?.user_metadata?.full_name?.substring(0, 2)?.toUpperCase() || user?.email?.substring(0, 2)?.toUpperCase() || "??";
  const currentPlan = plan ? PLAN_INFO[plan] || PLAN_INFO.basico : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Ajuste as preferências do seu projeto e da sua conta.</p>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors",
                isActive
                  ? "border-brand-500 text-foreground bg-secondary/40"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/20"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Perfil */}
      {activeTab === "perfil" && (
        <Card>
          <CardHeader>
            <CardTitle>Informações do Perfil</CardTitle>
            <CardDescription>Atualize seu nome e veja os dados associados à sua conta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-brand-500 flex items-center justify-center text-xl font-bold text-white uppercase shrink-0">
                {initials}
              </div>
              <div>
                <p className="font-semibold text-foreground">{user?.user_metadata?.full_name || "Usuário"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome completo</Label>
                <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" value={user?.email || ""} disabled readOnly />
                <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado por aqui.</p>
              </div>
            </div>

            {profileFeedback && <FeedbackBanner type={profileFeedback.type} message={profileFeedback.message} />}
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar alterações
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Aparência */}
      {activeTab === "aparencia" && (
        <Card>
          <CardHeader>
            <CardTitle>Aparência</CardTitle>
            <CardDescription>Escolha o tema de exibição do painel.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
              <button
                onClick={() => setTheme("light")}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-colors",
                  theme === "light" ? "border-brand-500 bg-brand-500/5" : "border-border hover:border-brand-500/40"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Sun className="h-5 w-5" />
                  </div>
                  {theme === "light" && (
                    <div className="h-5 w-5 rounded-full bg-brand-500 text-white flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <p className="font-semibold text-foreground">Modo Claro</p>
                <p className="text-sm text-muted-foreground">Fundo claro com contraste suave.</p>
              </button>

              <button
                onClick={() => setTheme("dark")}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-colors",
                  theme === "dark" ? "border-brand-500 bg-brand-500/5" : "border-border hover:border-brand-500/40"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Moon className="h-5 w-5" />
                  </div>
                  {theme === "dark" && (
                    <div className="h-5 w-5 rounded-full bg-brand-500 text-white flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <p className="font-semibold text-foreground">Modo Escuro</p>
                <p className="text-sm text-muted-foreground">Ideal para ambientes com pouca luz.</p>
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plano */}
      {activeTab === "plano" && (
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
                        <Badge variant="success">Ativo</Badge>
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
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline">
                <Link href="/precos">
                  Ver outros planos e fazer upgrade
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Segurança */}
      {activeTab === "seguranca" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alterar Senha</CardTitle>
              <CardDescription>Use uma senha forte, com pelo menos 6 caracteres.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="new_password">Nova senha</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar nova senha</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              {passwordFeedback && <FeedbackBanner type={passwordFeedback.type} message={passwordFeedback.message} />}
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={handleChangePassword} disabled={savingPassword}>
                {savingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
                Alterar senha
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-red-500/20">
            <CardHeader>
              <CardTitle>Sessão</CardTitle>
              <CardDescription>Encerre sua sessão atual neste dispositivo.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={handleSignOut} variant="destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sair da conta
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
