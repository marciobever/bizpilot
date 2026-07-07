"use client";
import React, { Suspense, useEffect, useState } from "react";
import { authFetch } from "@/lib/api-client";
import { User as UserIcon, Palette, CreditCard, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import { addonCountsFromRows } from "@/lib/plans";
import { isAdminEmail } from "@/lib/admin";
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
  const [billingProvider, setBillingProvider] = useState<string | null>(null);
  const [periodEnd, setPeriodEnd] = useState<string | null>(null);
  const [hasEfiSubscription, setHasEfiSubscription] = useState(false);
  const [addonCounts, setAddonCounts] = useState<Record<string, number>>({});
  const [usage, setUsage] = useState<any>(null);
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
    supabase.from("profiles").select("plan, subscription_status, billing_provider, current_period_end, efi_subscription_id").eq("id", user.id).single().then(async ({ data, error }) => {
      // Migration 019 ainda não aplicada: recai nas colunas antigas.
      if (error) {
        const { data: legacy } = await supabase.from("profiles").select("plan, subscription_status").eq("id", user.id).single();
        setPlan(legacy?.plan || "basico");
        setSubscriptionStatus(legacy?.subscription_status || null);
        setLoadingPlan(false);
        return;
      }
      setPlan(data?.plan || "basico");
      setSubscriptionStatus(data?.subscription_status || null);
      setBillingProvider(data?.billing_provider || null);
      setPeriodEnd(data?.current_period_end || null);
      setHasEfiSubscription(!!data?.efi_subscription_id);
      setLoadingPlan(false);
    });
    supabase.from("user_addons").select("addon_id, status").eq("user_id", user.id).then(({ data }) => {
      setAddonCounts(addonCountsFromRows(data as any));
    });
    authFetch("/api/usage").then((res) => res.json()).then(setUsage).catch(() => setUsage(null));
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

  // Upgrade/add-on passa pelo checkout unificado (Efí com fallback Stripe).
  // change=1 evita o redirect de "assinatura já ativa" da página de checkout.
  const handleUpgrade = (targetPlan: string) => {
    setPlanFeedback(null);
    setPlanActionLoading(targetPlan);
    router.push(`/app/checkout?plan=${targetPlan}&change=1`);
  };

  const handleCancelEfi = async () => {
    if (!user) return;
    if (!confirm("Cancelar sua assinatura? Você mantém o acesso até o fim do período já pago.")) return;
    setPlanFeedback(null);
    setPlanActionLoading("cancel");
    try {
      const res = await authFetch("/api/efi/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao cancelar assinatura.");
      setSubscriptionStatus("canceled");
      setHasEfiSubscription(false);
      setPlanFeedback({ type: "success", message: "Assinatura cancelada. Seu acesso continua até o fim do período pago." });
    } catch (e: any) {
      setPlanFeedback({ type: "error", message: e.message });
    } finally {
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
        <PlanoTab plan={plan} loadingPlan={loadingPlan} subscriptionStatus={subscriptionStatus} billingProvider={billingProvider} currentPeriodEnd={periodEnd} hasEfiSubscription={hasEfiSubscription} planActionLoading={planActionLoading} planFeedback={planFeedback} addonCounts={addonCounts} usage={usage} isAdmin={isAdminEmail(user?.email)} onUpgrade={handleUpgrade} onCancelEfi={handleCancelEfi} />
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
