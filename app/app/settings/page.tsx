"use client";
import React, { Suspense, useEffect, useState } from "react";
import { User as UserIcon, Palette, CreditCard, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { addonCountsFromRows } from "@/lib/plans";
import { useRouter, useSearchParams } from "next/navigation";
import { PerfilTab } from "./_tabs/PerfilTab";
import { AparenciaTab } from "./_tabs/AparenciaTab";
import { PlanoTab } from "./_tabs/PlanoTab";
import { SegurancaTab } from "./_tabs/SegurancaTab";

type TabId = "perfil" | "aparencia" | "plano" | "seguranca";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "perfil", label: "Perfil", icon: UserIcon },
  { id: "plano", label: "Plano e Cobrança", icon: CreditCard },
  { id: "aparencia", label: "Aparência", icon: Palette },
  { id: "seguranca", label: "Segurança", icon: Shield },
];

const VALID_TABS: TabId[] = ["perfil", "aparencia", "plano", "seguranca"];

function SettingsInner() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : "perfil"
  );

  // Mantém a aba sincronizada com o ?tab= da URL (navegação pelo menu lateral).
  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [plan, setPlan] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [hasStripeCustomer, setHasStripeCustomer] = useState(false);
  const [addonCounts, setAddonCounts] = useState<Record<string, number>>({});
  const [planActionLoading, setPlanActionLoading] = useState<string | null>(null);
  const [planFeedback, setPlanFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (user?.user_metadata?.full_name) setFullName(user.user_metadata.full_name);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan, subscription_status, stripe_customer_id").eq("id", user.id).single().then(({ data }) => {
      setPlan(data?.plan || "basico");
      setSubscriptionStatus(data?.subscription_status || null);
      setHasStripeCustomer(!!data?.stripe_customer_id);
      setLoadingPlan(false);
    });
    supabase.from("user_addons").select("addon_id, status").eq("user_id", user.id).then(({ data }) => {
      setAddonCounts(addonCountsFromRows(data as any));
    });
  }, [user]);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileFeedback(null);
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    setSavingProfile(false);
    setProfileFeedback(error
      ? { type: "error", message: "Não foi possível salvar suas informações. Tente novamente." }
      : { type: "success", message: "Informações do perfil atualizadas com sucesso." });
  };

  const handleUpgrade = async (targetPlan: string) => {
    if (!user) return;
    setPlanFeedback(null);
    setPlanActionLoading(targetPlan);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan: targetPlan, userId: user.id, email: user.email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao iniciar checkout.");
      window.location.href = data.url;
    } catch (e: any) {
      setPlanFeedback({ type: "error", message: e.message });
      setPlanActionLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    setPlanFeedback(null);
    setPlanActionLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: user.id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao abrir portal de cobrança.");
      window.location.href = data.url;
    } catch (e: any) {
      setPlanFeedback({ type: "error", message: e.message });
      setPlanActionLoading(null);
    }
  };

  const handleChangePassword = async () => {
    setPasswordFeedback(null);
    if (newPassword.length < 6) { setPasswordFeedback({ type: "error", message: "A senha deve ter pelo menos 6 caracteres." }); return; }
    if (newPassword !== confirmPassword) { setPasswordFeedback({ type: "error", message: "As senhas não coincidem." }); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) { setPasswordFeedback({ type: "error", message: error.message || "Não foi possível alterar a senha." }); }
    else { setPasswordFeedback({ type: "success", message: "Senha alterada com sucesso." }); setNewPassword(""); setConfirmPassword(""); }
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); router.push("/auth/login"); };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
        <p className="text-muted-foreground">Ajuste as preferências do seu projeto e da sua conta.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors",
              isActive ? "border-brand-500 text-foreground bg-secondary/40" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/20"
            )}>
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "perfil" && (
        <PerfilTab user={user} fullName={fullName} setFullName={setFullName} savingProfile={savingProfile} profileFeedback={profileFeedback} onSave={handleSaveProfile} />
      )}
      {activeTab === "aparencia" && <AparenciaTab theme={theme} setTheme={(v) => setTheme(v as any)} />}
      {activeTab === "plano" && (
        <PlanoTab plan={plan} loadingPlan={loadingPlan} subscriptionStatus={subscriptionStatus} hasStripeCustomer={hasStripeCustomer} planActionLoading={planActionLoading} planFeedback={planFeedback} addonCounts={addonCounts} onUpgrade={handleUpgrade} onManageSubscription={handleManageSubscription} />
      )}
      {activeTab === "seguranca" && (
        <SegurancaTab newPassword={newPassword} setNewPassword={setNewPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} savingPassword={savingPassword} passwordFeedback={passwordFeedback} onChangePassword={handleChangePassword} onSignOut={handleSignOut} />
      )}
    </div>
  );
}

export default function Settings() {
  return (
    <Suspense>
      <SettingsInner />
    </Suspense>
  );
}
