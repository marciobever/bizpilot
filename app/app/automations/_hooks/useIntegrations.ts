"use client";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { authFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { INTEGRATIONS_META, SMTP_PRESETS, EMAIL_TEMPLATES } from "../_constants";

export function useIntegrations() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [statusMap, setStatusMap] = useState<Record<string, { status: string; config: any }>>({});
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [savingIntegration, setSavingIntegration] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [appOrigin, setAppOrigin] = useState("");

  // Per-integration form state
  const [webhookForm, setWebhookForm] = useState({ url: "", secret: "", events: [] as string[] });
  const [paymentsForm, setPaymentsForm] = useState({ provider: "mercadopago", apiKey: "", pixKey: "", merchantName: "", merchantCity: "" });
  const [paymentsMsg, setPaymentsMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [metaForm, setMetaForm] = useState({ accessToken: "", pageId: "" });
  const [calendarForm, setCalendarForm] = useState({
    provider: "calcom",
    apiKey: "", eventTypeId: "",
    apiToken: "", schedulingUrl: "",
    clientId: "", clientSecret: "",
    reminderHours: "2",
  });
  const [calendarMsg, setCalendarMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [externalDbForm, setExternalDbForm] = useState({
    provider: "supabase",
    projectUrl: "", apiKey: "", table: "", searchColumn: "",
    projectId: "", collection: "", searchField: "",
  });
  const [externalDbMsg, setExternalDbMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [emailForm, setEmailForm] = useState({
    provider: "smtp", apiKey: "", fromEmail: "", fromName: "",
    smtpPreset: "gmail", host: "smtp.gmail.com", port: "465", secure: true, user: "", pass: "",
    templateId: "minimal", brandColor: "#6366f1",
  });
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [affiliateForm, setAffiliateForm] = useState({ provider: "shopee", appId: "", secret: "", mlTag: "" });
  const [affiliateMsg, setAffiliateMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchIntegrations();
      supabase.from("profiles").select("plan").eq("id", user.id).single().then(({ data }) => {
        const p = data?.plan;
        const normalized = p === "basico" ? "starter" : p === "profissional" ? "pro" : p === "avancado" ? "business" : (p || "starter");
        setPlan(normalized);
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setAppOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const calendarStatus = searchParams.get("calendar");
    if (calendarStatus === "connected") {
      if (user) fetchIntegrations();
      router.replace("/app/automations");
    } else if (calendarStatus === "error") {
      alert("Não foi possível conectar ao Google Calendar. Verifique o Client ID/Secret e tente novamente.");
      router.replace("/app/automations");
    }
  }, [searchParams, user]);

  const fetchIntegrations = async () => {
    const { data } = await supabase.from("integrations").select("*").eq("user_id", user!.id);
    const map: Record<string, { status: string; config: any }> = {};
    (data || []).forEach((row: any) => { map[row.provider] = { status: row.status, config: row.config || {} }; });
    setStatusMap(map);
    setLoading(false);
  };

  const getStatus = (id: string): "connected" | "disconnected" => {
    if (id === "supabase") return "connected";
    return statusMap[id]?.status === "connected" ? "connected" : "disconnected";
  };

  const upsertIntegration = async (provider: string, name: string, status: string, config: any) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("integrations")
      .upsert({ user_id: user.id, provider, name, status, config }, { onConflict: "user_id,provider" })
      .select()
      .single();
    if (!error && data) setStatusMap((prev) => ({ ...prev, [provider]: { status: data.status, config: data.config || {} } }));
    return { data, error };
  };

  const handleDisconnectIntegration = async (id: string) => {
    if (!user) return;
    await supabase.from("integrations").update({ status: "disconnected" }).eq("user_id", user.id).eq("provider", id);
    setStatusMap((prev) => ({ ...prev, [id]: { ...(prev[id] || { config: {} }), status: "disconnected" } }));
    setActiveModal(null);
  };

  const openModal = (id: string) => {
    setActiveModal(id);
    setPaymentsMsg(null);
    setCalendarMsg(null);
    setExternalDbMsg(null);
    setEmailMsg(null);
    setAffiliateMsg(null);
    if (id === "webhook") {
      const cfg = statusMap.webhook?.config || {};
      setWebhookForm({ url: cfg.url || "", secret: cfg.secret || "", events: cfg.events || [] });
    } else if (id === "payments") {
      const cfg = statusMap.payments?.config || {};
      setPaymentsForm({ provider: cfg.provider || "mercadopago", apiKey: cfg.apiKey ? "••••••••••••" : "", pixKey: cfg.pixKey || "", merchantName: cfg.merchantName || "", merchantCity: cfg.merchantCity || "" });
    } else if (id === "instagram" || id === "facebook") {
      const cfg = statusMap[id]?.config || {};
      setMetaForm({ accessToken: cfg.accessToken ? "••••••••••••" : "", pageId: cfg.pageId || "" });
    } else if (id === "calendar") {
      const cfg = statusMap.calendar?.config || {};
      setCalendarForm({
        provider: cfg.provider || "calcom",
        apiKey: cfg.apiKey ? "••••••••••••" : "", eventTypeId: cfg.eventTypeId || "",
        apiToken: cfg.apiToken ? "••••••••••••" : "", schedulingUrl: cfg.schedulingUrl || "",
        clientId: cfg.clientId || "", clientSecret: cfg.clientSecret ? "••••••••••••" : "",
        reminderHours: String(cfg.reminderHours ?? 2),
      });
    } else if (id === "external_db") {
      const cfg = statusMap.external_db?.config || {};
      setExternalDbForm({
        provider: cfg.provider || "supabase",
        projectUrl: cfg.projectUrl || "", apiKey: cfg.apiKey ? "••••••••••••" : "",
        table: cfg.table || "", searchColumn: cfg.searchColumn || "",
        projectId: cfg.projectId || "", collection: cfg.collection || "", searchField: cfg.searchField || "",
      });
    } else if (id === "email") {
      const cfg = statusMap.email?.config || {};
      const provider = cfg.provider === "google" ? "smtp" : (cfg.provider || "smtp");
      const presetKey = provider === "smtp" && cfg.host
        ? (Object.keys(SMTP_PRESETS).find((k) => SMTP_PRESETS[k].host && SMTP_PRESETS[k].host === cfg.host) || "custom")
        : "gmail";
      const validTemplate = EMAIL_TEMPLATES.find((t) => t.id === cfg.templateId) ? cfg.templateId : "minimal";
      setEmailForm({
        provider, apiKey: cfg.apiKey ? "••••••••••••" : "", fromEmail: cfg.fromEmail || "", fromName: cfg.fromName || "",
        smtpPreset: presetKey, host: cfg.host || SMTP_PRESETS.gmail.host,
        port: String(cfg.port ?? SMTP_PRESETS.gmail.port), secure: cfg.secure !== false,
        user: cfg.user || "", pass: cfg.pass ? "••••••••••••" : "",
        templateId: validTemplate, brandColor: cfg.brandColor || "#6366f1",
      });
    } else if (id === "affiliate") {
      const cfgShopee = statusMap.affiliate?.config || {};
      const cfgML = statusMap.mercadolivre?.config || {};
      const defaultProvider = statusMap.mercadolivre?.status === "connected" && !statusMap.affiliate?.status?.includes("connected")
        ? "mercadolivre" : (cfgShopee.provider || "shopee");
      setAffiliateForm({
        provider: defaultProvider,
        appId: cfgShopee.app_id || "",
        secret: cfgShopee.secret ? "••••••••••••" : "",
        mlTag: cfgML.tag || "",
      });
    }
  };

  const toggleWebhookEvent = (value: string) => {
    setWebhookForm((prev) => ({
      ...prev,
      events: prev.events.includes(value) ? prev.events.filter((e) => e !== value) : [...prev.events, value],
    }));
  };

  const handleConnectIntegration = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!user) return;
    setSavingIntegration(true);
    try {
      if (id === "webhook") {
        if (!webhookForm.url.trim()) { alert("Informe a URL do webhook."); return; }
        await upsertIntegration("webhook", "Webhooks Customizados", "connected", { url: webhookForm.url.trim(), secret: webhookForm.secret.trim(), events: webhookForm.events });
        setActiveModal(null);
      } else if (id === "payments") {
        const provider = paymentsForm.provider;
        if (provider === "pix") {
          const { pixKey, merchantName, merchantCity } = paymentsForm;
          if (!pixKey.trim() || !merchantName.trim() || !merchantCity.trim()) { setPaymentsMsg({ ok: false, text: "Informe a chave Pix, o nome e a cidade do recebedor." }); return; }
          await upsertIntegration("payments", "Links de Pagamento", "connected", { provider, pixKey: pixKey.trim(), merchantName: merchantName.trim(), merchantCity: merchantCity.trim() });
          setActiveModal(null);
          return;
        }
        const key = paymentsForm.apiKey.trim();
        if (key.startsWith("•")) {
          if (statusMap.payments?.config?.apiKey) { await upsertIntegration("payments", "Links de Pagamento", "connected", { ...statusMap.payments.config, provider }); setActiveModal(null); }
          else setPaymentsMsg({ ok: false, text: "Informe a chave/token." });
          return;
        }
        if (!key) { setPaymentsMsg({ ok: false, text: "Informe a chave/token." }); return; }
        const res = await authFetch("/api/payments/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiKey: key }) });
        const data = await res.json();
        if (!data.success) { setPaymentsMsg({ ok: false, text: data.error || "Credencial inválida." }); return; }
        await upsertIntegration("payments", "Links de Pagamento", "connected", { provider, apiKey: key });
        setActiveModal(null);
      } else if (id === "instagram" || id === "facebook") {
        const token = metaForm.accessToken.trim();
        const pageId = metaForm.pageId.trim();
        const existingToken = statusMap[id]?.config?.accessToken;
        if (!pageId || (!token && !existingToken)) { alert("Preencha o Access Token e o ID da Página."); return; }
        const config = token && !token.startsWith("•") ? { accessToken: token, pageId } : { ...(statusMap[id]?.config || {}), pageId };
        const meta = INTEGRATIONS_META.find((i) => i.id === id)!;
        await upsertIntegration(id, meta.name, "connected", config);
        setActiveModal(null);
      } else if (id === "calendar") {
        const provider = calendarForm.provider;
        const existing = statusMap.calendar?.config || {};
        setCalendarMsg(null);
        if (provider === "calcom") {
          const apiKey = calendarForm.apiKey.trim();
          const finalApiKey = apiKey.startsWith("•") ? existing.apiKey : apiKey;
          if (!finalApiKey || !calendarForm.eventTypeId.trim()) { setCalendarMsg({ ok: false, text: "Informe a API Key e o Event Type ID." }); return; }
          const res = await authFetch("/api/calendar/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiKey: finalApiKey, eventTypeId: calendarForm.eventTypeId }) });
          const data = await res.json();
          if (!data.success) { setCalendarMsg({ ok: false, text: data.error || "Credencial inválida." }); return; }
          await upsertIntegration("calendar", "Calendário / Agenda", "connected", { provider, apiKey: finalApiKey, eventTypeId: calendarForm.eventTypeId, reminderHours: Number(calendarForm.reminderHours) || 2 });
          setActiveModal(null);
        } else if (provider === "calendly") {
          const apiToken = calendarForm.apiToken.trim();
          const finalToken = apiToken.startsWith("•") ? existing.apiToken : apiToken;
          if (!finalToken || !calendarForm.schedulingUrl.trim()) { setCalendarMsg({ ok: false, text: "Informe o token de acesso e o link de agendamento." }); return; }
          const res = await authFetch("/api/calendar/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiToken: finalToken, schedulingUrl: calendarForm.schedulingUrl }) });
          const data = await res.json();
          if (!data.success) { setCalendarMsg({ ok: false, text: data.error || "Credencial inválida." }); return; }
          await upsertIntegration("calendar", "Calendário / Agenda", "connected", { provider, apiToken: finalToken, schedulingUrl: calendarForm.schedulingUrl, eventTypeUri: data.eventTypeUri, userUri: data.userUri });
          setActiveModal(null);
        } else if (provider === "google") {
          const clientId = calendarForm.clientId.trim();
          const clientSecret = calendarForm.clientSecret.trim();
          const finalSecret = clientSecret.startsWith("•") ? existing.clientSecret : clientSecret;
          if (!clientId || !finalSecret) { setCalendarMsg({ ok: false, text: "Informe o Client ID e o Client Secret." }); return; }
          const res = await authFetch("/api/calendar/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, clientId, clientSecret: finalSecret }) });
          const data = await res.json();
          if (!data.success) { setCalendarMsg({ ok: false, text: data.error || "Dados inválidos." }); return; }
          await upsertIntegration("calendar", "Calendário / Agenda", existing.refreshToken ? "connected" : "disconnected", { ...existing, provider, clientId, clientSecret: finalSecret, reminderHours: Number(calendarForm.reminderHours) || 2 });
          window.location.href = `/api/calendar/google/auth?userId=${user.id}`;
        }
      } else if (id === "external_db") {
        const provider = externalDbForm.provider;
        const existing = statusMap.external_db?.config || {};
        setExternalDbMsg(null);
        const apiKeyInput = externalDbForm.apiKey.trim();
        const finalApiKey = apiKeyInput.startsWith("•") ? existing.apiKey : apiKeyInput;
        let config: any;
        if (provider === "supabase") {
          const { projectUrl, table, searchColumn } = externalDbForm;
          if (!projectUrl.trim() || !finalApiKey || !table.trim() || !searchColumn.trim()) { setExternalDbMsg({ ok: false, text: "Informe a URL do projeto, a chave de API, a tabela e a coluna de busca." }); return; }
          config = { provider, projectUrl: projectUrl.trim(), apiKey: finalApiKey, table: table.trim(), searchColumn: searchColumn.trim() };
        } else {
          const { projectId, collection, searchField } = externalDbForm;
          if (!projectId.trim() || !finalApiKey || !collection.trim() || !searchField.trim()) { setExternalDbMsg({ ok: false, text: "Informe o ID do projeto, a chave de API, a coleção e o campo de busca." }); return; }
          config = { provider, projectId: projectId.trim(), apiKey: finalApiKey, collection: collection.trim(), searchField: searchField.trim() };
        }
        const res = await authFetch("/api/external-db/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
        const data = await res.json();
        if (!data.success) { setExternalDbMsg({ ok: false, text: data.error || "Credenciais inválidas." }); return; }
        await upsertIntegration("external_db", "Banco de Dados Externo", "connected", config);
        setActiveModal(null);
      } else if (id === "email") {
        const provider = emailForm.provider;
        const existing = statusMap.email?.config || {};
        const fromName = emailForm.fromName.trim();
        const templateId = emailForm.templateId;
        const brandColor = emailForm.brandColor.trim() || "#6366f1";
        setEmailMsg(null);
        if (provider === "smtp") {
          const host = emailForm.host.trim();
          const port = Number(emailForm.port) || 465;
          const smtpUser = emailForm.user.trim();
          const fromEmail = emailForm.fromEmail.trim() || smtpUser;
          if (!host) { setEmailMsg({ ok: false, text: "Informe o servidor SMTP." }); return; }
          if (!smtpUser) { setEmailMsg({ ok: false, text: "Informe o usuário/e-mail do SMTP." }); return; }
          const passInput = emailForm.pass.trim();
          const finalPass = passInput.startsWith("•") ? existing.pass : passInput;
          if (!finalPass) { setEmailMsg({ ok: false, text: "Informe a senha (ou senha de app)." }); return; }
          const res = await authFetch("/api/email/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: "smtp", host, port, secure: emailForm.secure, user: smtpUser, pass: finalPass }) });
          const data = await res.json();
          if (!data.success) { setEmailMsg({ ok: false, text: data.error || "Não foi possível conectar ao servidor." }); return; }
          await upsertIntegration("email", "E-mail", "connected", { provider: "smtp", host, port, secure: emailForm.secure, user: smtpUser, pass: finalPass, fromEmail, fromName, templateId, brandColor });
          setActiveModal(null);
          return;
        }
        const fromEmail = emailForm.fromEmail.trim();
        if (!fromEmail) { setEmailMsg({ ok: false, text: "Informe o e-mail de remetente." }); return; }
        const keyInput = emailForm.apiKey.trim();
        const finalApiKey = keyInput.startsWith("•") ? existing.apiKey : keyInput;
        if (!finalApiKey) { setEmailMsg({ ok: false, text: "Informe a chave de API." }); return; }
        const res = await authFetch("/api/email/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiKey: finalApiKey }) });
        const data = await res.json();
        if (!data.success) { setEmailMsg({ ok: false, text: data.error || "Credencial inválida." }); return; }
        await upsertIntegration("email", "E-mail", "connected", { provider, apiKey: finalApiKey, fromEmail, fromName, templateId, brandColor });
        setActiveModal(null);
      } else if (id === "affiliate") {
        const provider = affiliateForm.provider;
        setAffiliateMsg(null);
        if (provider === "shopee") {
          const existing = statusMap.affiliate?.config || {};
          const appId = affiliateForm.appId.trim();
          const secretInput = affiliateForm.secret.trim();
          const finalSecret = secretInput.startsWith("•") ? existing.secret : secretInput;
          if (!appId || !finalSecret) { setAffiliateMsg({ ok: false, text: "Informe o App ID e a App Secret da Shopee Afiliados." }); return; }
          await upsertIntegration("affiliate", "Afiliados", "connected", { provider, app_id: appId, secret: finalSecret });
        } else if (provider === "mercadolivre") {
          const tag = affiliateForm.mlTag.trim();
          if (!tag) { setAffiliateMsg({ ok: false, text: "Informe a sua tag de afiliado do Mercado Livre (ex: seunome-20)." }); return; }
          await upsertIntegration("mercadolivre", "Mercado Livre Afiliados", "connected", { tag });
        } else {
          setAffiliateMsg({ ok: false, text: "Marketplace ainda não disponível." }); return;
        }
        setActiveModal(null);
      }
    } finally {
      setSavingIntegration(false);
    }
  };

  return {
    user, plan, loading, statusMap, activeModal, setActiveModal, savingIntegration, appOrigin,
    webhookForm, setWebhookForm, toggleWebhookEvent,
    paymentsForm, setPaymentsForm, paymentsMsg,
    metaForm, setMetaForm,
    calendarForm, setCalendarForm, calendarMsg,
    externalDbForm, setExternalDbForm, externalDbMsg,
    emailForm, setEmailForm, emailMsg,
    affiliateForm, setAffiliateForm, affiliateMsg,
    getStatus, openModal, handleDisconnectIntegration, handleConnectIntegration,
  };
}
