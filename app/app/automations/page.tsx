"use client";
import React, { Suspense } from "react";
import { Loader2, ChevronRight, Lock, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { planAllows, requiredPlanLabel } from "@/lib/plans";
import { INTEGRATIONS_META } from "./_constants";
import { useIntegrations } from "./_hooks/useIntegrations";
import { IntegrationModal } from "./_modals/IntegrationModal";

// ─────────────────────────────────────────────────────────────────────────────

function Integrations() {
  const router = useRouter();
  const {
    plan, loading, statusMap, activeModal, setActiveModal, savingIntegration, appOrigin,
    webhookForm, setWebhookForm, toggleWebhookEvent,
    paymentsForm, setPaymentsForm, paymentsMsg,
    metaForm, setMetaForm,
    calendarForm, setCalendarForm, calendarMsg,
    externalDbForm, setExternalDbForm, externalDbMsg,
    emailForm, setEmailForm, emailMsg,
    affiliateForm, setAffiliateForm, affiliateMsg,
    getStatus, openModal, handleDisconnectIntegration, handleConnectIntegration,
  } = useIntegrations();

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando integrações...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Integrações</h2>
          <p className="text-muted-foreground">Conecte a inteligência artificial às ferramentas que você já usa.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS_META.map((int) => {
          const Icon = int.icon;
          const connected = getStatus(int.id) === "connected";
          const locked = !planAllows(plan, int.id);
          return (
            <button
              key={int.id}
              type="button"
              onClick={() => locked ? router.push("/app/settings") : openModal(int.id)}
              className={`text-left rounded-xl border p-4 flex flex-col gap-3 transition-colors ${
                locked
                  ? "border-border bg-card opacity-75 hover:opacity-100 hover:border-amber-500/40"
                  : connected
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-border bg-card hover:border-brand-500/40 hover:bg-brand-500/5"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border ${int.bgClass}`}>
                  <Icon className={`h-5 w-5 ${int.color}`} />
                </div>
                {locked ? (
                  <Badge variant="secondary" className="gap-1 bg-amber-500/10 text-amber-600 border-0">
                    <Lock className="h-3 w-3" /> {requiredPlanLabel(int.id)}
                  </Badge>
                ) : connected ? (
                  <Badge variant="success" className="gap-1 bg-emerald-500/10 text-emerald-500 border-0">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-secondary text-muted-foreground border-0">Conectar</Badge>
                )}
              </div>
              <div>
                <p className="font-semibold text-sm">{int.name}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{int.description}</p>
              </div>
              <div className="flex items-center justify-between mt-auto pt-1">
                <Badge variant="outline" className="text-[10px] border-border text-muted-foreground px-2">{int.category}</Badge>
                <span className={`text-xs inline-flex items-center gap-1 ${locked ? "text-amber-600" : "text-brand-500"}`}>
                  {locked ? "Fazer upgrade" : connected ? "Gerenciar" : "Configurar"} <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {activeModal && (
        <IntegrationModal
          activeModal={activeModal}
          appOrigin={appOrigin}
          savingIntegration={savingIntegration}
          statusMap={statusMap}
          webhookForm={webhookForm} setWebhookForm={setWebhookForm} toggleWebhookEvent={toggleWebhookEvent}
          paymentsForm={paymentsForm} setPaymentsForm={setPaymentsForm} paymentsMsg={paymentsMsg}
          metaForm={metaForm} setMetaForm={setMetaForm}
          calendarForm={calendarForm} setCalendarForm={setCalendarForm} calendarMsg={calendarMsg}
          externalDbForm={externalDbForm} setExternalDbForm={setExternalDbForm} externalDbMsg={externalDbMsg}
          emailForm={emailForm} setEmailForm={setEmailForm} emailMsg={emailMsg}
          affiliateForm={affiliateForm} setAffiliateForm={setAffiliateForm} affiliateMsg={affiliateMsg}
          onClose={() => setActiveModal(null)}
          onDisconnect={handleDisconnectIntegration}
          onSubmit={handleConnectIntegration}
        />
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando integrações...
      </div>
    }>
      <Integrations />
    </Suspense>
  );
}
