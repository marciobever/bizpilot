"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MessageCircle, Webhook, Link as LinkIcon, Database, CheckCircle2, X, Loader2, AlertCircle, CalendarDays, Mail, ChevronRight, Lock } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { planAllows, requiredPlanLabel } from "@/lib/plans";

const INTEGRATIONS_META = [
  {
    id: "instagram",
    name: "Instagram Direct",
    description: "Responda DMs e comentários em tempo real via Meta Graph.",
    icon: MessageCircle,
    category: "Mensageria",
    color: "text-pink-500",
    bgClass: "bg-pink-500/10 border-pink-500/20"
  },
  {
    id: "facebook",
    name: "Facebook Messenger",
    description: "Atenda clientes na página oficial do seu negócio no Facebook.",
    icon: MessageCircle,
    category: "Mensageria",
    color: "text-blue-500",
    bgClass: "bg-blue-500/10 border-blue-500/20"
  },
  {
    id: "supabase",
    name: "Banco de Dados Integrado",
    description: "Seus contatos e leads já ficam sincronizados automaticamente — sem configuração necessária.",
    icon: Database,
    category: "Armazenamento",
    color: "text-foreground",
    bgClass: "bg-secondary border-border"
  },
  {
    id: "webhook",
    name: "Webhooks Customizados",
    description: "Acione ações externas quando a IA qualificar ou converter um lead.",
    icon: Webhook,
    category: "Desenvolvedores",
    color: "text-foreground",
    bgClass: "bg-secondary border-border"
  },
  {
    id: "payments",
    name: "Links de Pagamento",
    description: "Permita que o agente envie links de pagamento (Pix, cartão, boleto) nas conversas.",
    icon: LinkIcon,
    category: "Pagamentos",
    color: "text-foreground",
    bgClass: "bg-secondary border-border"
  },
  {
    id: "calendar",
    name: "Calendário / Agenda",
    description: "Permita que o agente consulte horários livres e marque reuniões com os leads.",
    icon: CalendarDays,
    category: "Produtividade",
    color: "text-violet-500",
    bgClass: "bg-violet-500/10 border-violet-500/20"
  },
  {
    id: "external_db",
    name: "Banco de Dados Externo",
    description: "Conecte seu próprio Supabase ou Firebase para o agente consultar seus clientes, fornecedores ou produtos.",
    icon: Database,
    category: "Seus Dados",
    color: "text-cyan-500",
    bgClass: "bg-cyan-500/10 border-cyan-500/20"
  },
  {
    id: "email",
    name: "E-mail",
    description: "Permita que o agente envie e-mails (orçamentos, comprovantes, materiais) para os leads durante a conversa.",
    icon: Mail,
    category: "Comunicação",
    color: "text-amber-500",
    bgClass: "bg-amber-500/10 border-amber-500/20"
  }
];

const WEBHOOK_EVENTS = [
  { value: "lead_qualified", label: "Lead qualificado" },
  { value: "lead_converted", label: "Lead convertido (venda)" },
];

const PAYMENT_PROVIDERS: { value: string; label: string; keyLabel: string; help: string }[] = [
  {
    value: "pix",
    label: "Pix direto (sem gateway)",
    keyLabel: "",
    help: "Gera o código Pix Copia e Cola direto para a sua chave Pix, sem taxas e sem confirmação automática de pagamento.",
  },
  {
    value: "mercadopago",
    label: "Mercado Pago",
    keyLabel: "Access Token de Produção",
    help: "Painel do Mercado Pago → Seu negócio → Configurações → Credenciais de produção.",
  },
  {
    value: "asaas",
    label: "Asaas",
    keyLabel: "Chave de API",
    help: "Painel do Asaas → Configurações da conta → Integrações → Chaves de API.",
  },
  {
    value: "woovi",
    label: "Woovi (Pix)",
    keyLabel: "AppID",
    help: "Painel da Woovi → Aplicações → Gerar AppID.",
  },
  {
    value: "stripe",
    label: "Stripe",
    keyLabel: "Chave Secreta (Secret Key)",
    help: "Painel da Stripe → Desenvolvedores → Chaves de API → Chave secreta (sk_live_... ou sk_test_...).",
  },
];

const CALENDAR_PROVIDERS: { value: string; label: string }[] = [
  { value: "calcom", label: "Cal.com" },
  { value: "calendly", label: "Calendly" },
  { value: "google", label: "Google Calendar" },
];

const EXTERNAL_DB_PROVIDERS: { value: string; label: string }[] = [
  { value: "supabase", label: "Supabase" },
  { value: "firebase", label: "Firebase (Firestore)" },
];

// Presets de SMTP para os provedores mais comuns. O usuário só escolhe o
// serviço e preenche e-mail + senha; servidor/porta são preenchidos sozinhos.
const SMTP_PRESETS: Record<string, { label: string; host: string; port: number; secure: boolean; docUrl?: string; docLabel?: string }> = {
  gmail: {
    label: "Gmail",
    host: "smtp.gmail.com", port: 465, secure: true,
    docUrl: "https://myaccount.google.com/apppasswords",
    docLabel: "Gerar uma “Senha de app” do Gmail (exige verificação em 2 etapas ativada)",
  },
  outlook: {
    label: "Outlook / Hotmail",
    host: "smtp-mail.outlook.com", port: 587, secure: false,
    docUrl: "https://support.microsoft.com/pt-br/account-billing/usar-senhas-de-aplicativo-com-aplicativos-que-n%C3%A3o-d%C3%A3o-suporte-%C3%A0-verifica%C3%A7%C3%A3o-em-duas-etapas-5896ed9b-4263-e681-128a-a6f2979a7944",
    docLabel: "Criar uma senha de app no Outlook",
  },
  zoho: {
    label: "Zoho Mail",
    host: "smtp.zoho.com", port: 465, secure: true,
    docUrl: "https://www.zoho.com/mail/help/zoho-smtp.html",
    docLabel: "Ver dados de SMTP do Zoho",
  },
  custom: {
    label: "Outro provedor (manual)",
    host: "", port: 465, secure: true,
  },
};

// Provedores de API transacional (avançado) — exigem domínio próprio verificado.
const EMAIL_API_PROVIDERS: { value: string; label: string; help: string; docUrl: string; docLabel: string }[] = [
  {
    value: "resend",
    label: "Resend",
    help: "Painel da Resend → API Keys → Create API Key. Requer domínio verificado.",
    docUrl: "https://resend.com/docs/dashboard/api-keys/introduction",
    docLabel: "Criar conta e chave na Resend",
  },
  {
    value: "sendgrid",
    label: "SendGrid",
    help: "Painel do SendGrid → Settings → API Keys → Create API Key. Requer remetente verificado.",
    docUrl: "https://www.twilio.com/docs/sendgrid/ui/account-and-settings/api-keys",
    docLabel: "Criar conta e chave no SendGrid",
  },
];

function Integrations() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Status/config de cada integração, persistidos na tabela `integrations`.
  const [statusMap, setStatusMap] = useState<Record<string, { status: string; config: any }>>({});
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [savingIntegration, setSavingIntegration] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);

  // Webhooks Customizados
  const [webhookForm, setWebhookForm] = useState({ url: "", secret: "", events: [] as string[] });

  // Links de Pagamento (Mercado Pago / Asaas / Woovi)
  const [paymentsForm, setPaymentsForm] = useState({ provider: "mercadopago", apiKey: "", pixKey: "", merchantName: "", merchantCity: "" });
  const [paymentsMsg, setPaymentsMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Instagram / Facebook (Meta Graph)
  const [metaForm, setMetaForm] = useState({ accessToken: "", pageId: "" });

  // Calendário / Agenda (Cal.com / Calendly / Google Calendar)
  const [calendarForm, setCalendarForm] = useState({
    provider: "calcom",
    apiKey: "", eventTypeId: "",
    apiToken: "", schedulingUrl: "",
    clientId: "", clientSecret: "",
    reminderHours: "2",
  });
  const [calendarMsg, setCalendarMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [appOrigin, setAppOrigin] = useState("");

  // Banco de Dados Externo (Supabase ou Firebase do próprio usuário)
  const [externalDbForm, setExternalDbForm] = useState({
    provider: "supabase",
    projectUrl: "", apiKey: "", table: "", searchColumn: "",
    projectId: "", collection: "", searchField: "",
  });
  const [externalDbMsg, setExternalDbMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // E-mail (Resend / SendGrid)
  const [emailForm, setEmailForm] = useState({
    provider: "smtp", apiKey: "", fromEmail: "", fromName: "",
    smtpPreset: "gmail", host: "smtp.gmail.com", port: "465", secure: true, user: "", pass: "",
  });
  const [emailMsg, setEmailMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchIntegrations();
      supabase.from("profiles").select("plan").eq("id", user.id).single().then(({ data }) => setPlan(data?.plan || "basico"));
    } else setLoading(false);
  }, [user]);

  useEffect(() => {
    setAppOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const calendarStatus = searchParams.get('calendar');
    if (calendarStatus === 'connected') {
      if (user) fetchIntegrations();
      router.replace('/app/automations');
    } else if (calendarStatus === 'error') {
      alert('Não foi possível conectar ao Google Calendar. Verifique o Client ID/Secret e tente novamente.');
      router.replace('/app/automations');
    }

    const emailStatus = searchParams.get('email');
    if (emailStatus === 'connected') {
      if (user) fetchIntegrations();
      router.replace('/app/automations');
    } else if (emailStatus === 'error') {
      alert('Não foi possível conectar a conta Google para e-mail. Tente novamente.');
      router.replace('/app/automations');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user]);

  const fetchIntegrations = async () => {
    const { data } = await supabase.from('integrations').select('*').eq('user_id', user!.id);
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
      .from('integrations')
      .upsert({ user_id: user.id, provider, name, status, config }, { onConflict: 'user_id,provider' })
      .select().single();
    if (!error && data) setStatusMap(prev => ({ ...prev, [provider]: { status: data.status, config: data.config || {} } }));
    return { data, error };
  };

  const handleDisconnectIntegration = async (id: string) => {
    if (!user) return;
    await supabase.from('integrations').update({ status: 'disconnected' }).eq('user_id', user.id).eq('provider', id);
    setStatusMap(prev => ({ ...prev, [id]: { ...(prev[id] || { config: {} }), status: 'disconnected' } }));
    setActiveModal(null);
  };

  const openModal = (id: string) => {
    setActiveModal(id);
    setPaymentsMsg(null);
    setCalendarMsg(null);
    setExternalDbMsg(null);
    setEmailMsg(null);
    if (id === 'webhook') {
      const cfg = statusMap.webhook?.config || {};
      setWebhookForm({ url: cfg.url || "", secret: cfg.secret || "", events: cfg.events || [] });
    } else if (id === 'payments') {
      const cfg = statusMap.payments?.config || {};
      setPaymentsForm({
        provider: cfg.provider || "mercadopago",
        apiKey: cfg.apiKey ? "••••••••••••" : "",
        pixKey: cfg.pixKey || "",
        merchantName: cfg.merchantName || "",
        merchantCity: cfg.merchantCity || "",
      });
    } else if (id === 'instagram' || id === 'facebook') {
      const cfg = statusMap[id]?.config || {};
      setMetaForm({ accessToken: cfg.accessToken ? "••••••••••••" : "", pageId: cfg.pageId || "" });
    } else if (id === 'calendar') {
      const cfg = statusMap.calendar?.config || {};
      setCalendarForm({
        provider: cfg.provider || "calcom",
        apiKey: cfg.apiKey ? "••••••••••••" : "",
        eventTypeId: cfg.eventTypeId || "",
        apiToken: cfg.apiToken ? "••••••••••••" : "",
        schedulingUrl: cfg.schedulingUrl || "",
        clientId: cfg.clientId || "",
        clientSecret: cfg.clientSecret ? "••••••••••••" : "",
        reminderHours: String(cfg.reminderHours ?? 2),
      });
    } else if (id === 'external_db') {
      const cfg = statusMap.external_db?.config || {};
      setExternalDbForm({
        provider: cfg.provider || "supabase",
        projectUrl: cfg.projectUrl || "",
        apiKey: cfg.apiKey ? "••••••••••••" : "",
        table: cfg.table || "",
        searchColumn: cfg.searchColumn || "",
        projectId: cfg.projectId || "",
        collection: cfg.collection || "",
        searchField: cfg.searchField || "",
      });
    } else if (id === 'email') {
      const cfg = statusMap.email?.config || {};
      const provider = cfg.provider || "smtp";
      const presetKey = provider === 'smtp'
        ? (Object.keys(SMTP_PRESETS).find(k => SMTP_PRESETS[k].host && SMTP_PRESETS[k].host === cfg.host) || 'custom')
        : 'gmail';
      setEmailForm({
        provider,
        apiKey: cfg.apiKey ? "••••••••••••" : "",
        fromEmail: cfg.fromEmail || "",
        fromName: cfg.fromName || "",
        smtpPreset: presetKey,
        host: cfg.host || SMTP_PRESETS.gmail.host,
        port: String(cfg.port ?? SMTP_PRESETS.gmail.port),
        secure: cfg.secure !== false,
        user: cfg.user || "",
        pass: cfg.pass ? "••••••••••••" : "",
      });
    }
  };

  const toggleWebhookEvent = (value: string) => {
    setWebhookForm(prev => ({
      ...prev,
      events: prev.events.includes(value) ? prev.events.filter(e => e !== value) : [...prev.events, value],
    }));
  };

  const handleConnectIntegration = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!user) return;

    setSavingIntegration(true);
    try {
      if (id === 'webhook') {
        if (!webhookForm.url.trim()) { alert('Informe a URL do webhook.'); return; }
        await upsertIntegration('webhook', 'Webhooks Customizados', 'connected', {
          url: webhookForm.url.trim(),
          secret: webhookForm.secret.trim(),
          events: webhookForm.events,
        });
        setActiveModal(null);
      } else if (id === 'payments') {
        const provider = paymentsForm.provider;

        if (provider === 'pix') {
          const pixKey = paymentsForm.pixKey.trim();
          const merchantName = paymentsForm.merchantName.trim();
          const merchantCity = paymentsForm.merchantCity.trim();
          if (!pixKey || !merchantName || !merchantCity) {
            setPaymentsMsg({ ok: false, text: 'Informe a chave Pix, o nome e a cidade do recebedor.' });
            return;
          }
          await upsertIntegration('payments', 'Links de Pagamento', 'connected', { provider, pixKey, merchantName, merchantCity });
          setActiveModal(null);
          return;
        }

        const key = paymentsForm.apiKey.trim();
        if (key.startsWith('•')) {
          // Mantém a chave já salva (campo não foi alterado), mas permite trocar o provedor.
          if (statusMap.payments?.config?.apiKey) {
            await upsertIntegration('payments', 'Links de Pagamento', 'connected', { ...statusMap.payments.config, provider });
            setActiveModal(null);
          } else {
            setPaymentsMsg({ ok: false, text: 'Informe a chave/token.' });
          }
          return;
        }
        if (!key) { setPaymentsMsg({ ok: false, text: 'Informe a chave/token.' }); return; }

        const res = await fetch('/api/payments/test', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider, apiKey: key }),
        });
        const data = await res.json();
        if (!data.success) { setPaymentsMsg({ ok: false, text: data.error || 'Credencial inválida.' }); return; }

        await upsertIntegration('payments', 'Links de Pagamento', 'connected', { provider, apiKey: key });
        setActiveModal(null);
      } else if (id === 'instagram' || id === 'facebook') {
        const token = metaForm.accessToken.trim();
        const pageId = metaForm.pageId.trim();
        const existingToken = statusMap[id]?.config?.accessToken;
        if (!pageId || (!token && !existingToken)) { alert('Preencha o Access Token e o ID da Página.'); return; }

        const config = token && !token.startsWith('•')
          ? { accessToken: token, pageId }
          : { ...(statusMap[id]?.config || {}), pageId };

        const meta = INTEGRATIONS_META.find(i => i.id === id)!;
        await upsertIntegration(id, meta.name, 'connected', config);
        setActiveModal(null);
      } else if (id === 'calendar') {
        const provider = calendarForm.provider;
        const existing = statusMap.calendar?.config || {};
        setCalendarMsg(null);

        if (provider === 'calcom') {
          const apiKey = calendarForm.apiKey.trim();
          const eventTypeId = calendarForm.eventTypeId.trim();
          const finalApiKey = apiKey.startsWith('•') ? existing.apiKey : apiKey;
          if (!finalApiKey || !eventTypeId) { setCalendarMsg({ ok: false, text: 'Informe a API Key e o Event Type ID.' }); return; }

          const res = await fetch('/api/calendar/test', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider, apiKey: finalApiKey, eventTypeId }),
          });
          const data = await res.json();
          if (!data.success) { setCalendarMsg({ ok: false, text: data.error || 'Credencial inválida.' }); return; }

          await upsertIntegration('calendar', 'Calendário / Agenda', 'connected', { provider, apiKey: finalApiKey, eventTypeId, reminderHours: Number(calendarForm.reminderHours) || 2 });
          setActiveModal(null);
        } else if (provider === 'calendly') {
          const apiToken = calendarForm.apiToken.trim();
          const schedulingUrl = calendarForm.schedulingUrl.trim();
          const finalToken = apiToken.startsWith('•') ? existing.apiToken : apiToken;
          if (!finalToken || !schedulingUrl) { setCalendarMsg({ ok: false, text: 'Informe o token de acesso e o link de agendamento.' }); return; }

          const res = await fetch('/api/calendar/test', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider, apiToken: finalToken, schedulingUrl }),
          });
          const data = await res.json();
          if (!data.success) { setCalendarMsg({ ok: false, text: data.error || 'Credencial inválida.' }); return; }

          await upsertIntegration('calendar', 'Calendário / Agenda', 'connected', {
            provider, apiToken: finalToken, schedulingUrl, eventTypeUri: data.eventTypeUri, userUri: data.userUri,
          });
          setActiveModal(null);
        } else if (provider === 'google') {
          const clientId = calendarForm.clientId.trim();
          const clientSecret = calendarForm.clientSecret.trim();
          const finalSecret = clientSecret.startsWith('•') ? existing.clientSecret : clientSecret;
          if (!clientId || !finalSecret) { setCalendarMsg({ ok: false, text: 'Informe o Client ID e o Client Secret.' }); return; }

          const res = await fetch('/api/calendar/test', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider, clientId, clientSecret: finalSecret }),
          });
          const data = await res.json();
          if (!data.success) { setCalendarMsg({ ok: false, text: data.error || 'Dados inválidos.' }); return; }

          await upsertIntegration('calendar', 'Calendário / Agenda', existing.refreshToken ? 'connected' : 'disconnected', {
            ...existing, provider, clientId, clientSecret: finalSecret, reminderHours: Number(calendarForm.reminderHours) || 2,
          });
          window.location.href = `/api/calendar/google/auth?userId=${user.id}`;
        }
      } else if (id === 'external_db') {
        const provider = externalDbForm.provider;
        const existing = statusMap.external_db?.config || {};
        setExternalDbMsg(null);

        const apiKeyInput = externalDbForm.apiKey.trim();
        const finalApiKey = apiKeyInput.startsWith('•') ? existing.apiKey : apiKeyInput;

        let config: any;
        if (provider === 'supabase') {
          const projectUrl = externalDbForm.projectUrl.trim();
          const table = externalDbForm.table.trim();
          const searchColumn = externalDbForm.searchColumn.trim();
          if (!projectUrl || !finalApiKey || !table || !searchColumn) {
            setExternalDbMsg({ ok: false, text: 'Informe a URL do projeto, a chave de API, a tabela e a coluna de busca.' });
            return;
          }
          config = { provider, projectUrl, apiKey: finalApiKey, table, searchColumn };
        } else {
          const projectId = externalDbForm.projectId.trim();
          const collection = externalDbForm.collection.trim();
          const searchField = externalDbForm.searchField.trim();
          if (!projectId || !finalApiKey || !collection || !searchField) {
            setExternalDbMsg({ ok: false, text: 'Informe o ID do projeto, a chave de API, a coleção e o campo de busca.' });
            return;
          }
          config = { provider, projectId, apiKey: finalApiKey, collection, searchField };
        }

        const res = await fetch('/api/external-db/test', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config),
        });
        const data = await res.json();
        if (!data.success) { setExternalDbMsg({ ok: false, text: data.error || 'Credenciais inválidas.' }); return; }

        await upsertIntegration('external_db', 'Banco de Dados Externo', 'connected', config);
        setActiveModal(null);
      } else if (id === 'email') {
        const provider = emailForm.provider;
        const existing = statusMap.email?.config || {};
        const fromName = emailForm.fromName.trim();
        setEmailMsg(null);

        // "Entrar com Google": abre o consentimento OAuth; o restante é salvo no callback.
        if (provider === 'google') {
          window.location.href = `/api/email/google/auth?userId=${user.id}`;
          return;
        }

        if (provider === 'smtp') {
          const host = emailForm.host.trim();
          const port = Number(emailForm.port) || 465;
          const secure = emailForm.secure;
          const smtpUser = emailForm.user.trim();
          const fromEmail = emailForm.fromEmail.trim() || smtpUser;
          if (!host) { setEmailMsg({ ok: false, text: 'Informe o servidor SMTP.' }); return; }
          if (!smtpUser) { setEmailMsg({ ok: false, text: 'Informe o usuário/e-mail do SMTP.' }); return; }
          const passInput = emailForm.pass.trim();
          const finalPass = passInput.startsWith('•') ? existing.pass : passInput;
          if (!finalPass) { setEmailMsg({ ok: false, text: 'Informe a senha (ou senha de app).' }); return; }

          const res = await fetch('/api/email/test', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: 'smtp', host, port, secure, user: smtpUser, pass: finalPass }),
          });
          const data = await res.json();
          if (!data.success) { setEmailMsg({ ok: false, text: data.error || 'Não foi possível conectar ao servidor.' }); return; }

          await upsertIntegration('email', 'E-mail', 'connected', {
            provider: 'smtp', host, port, secure, user: smtpUser, pass: finalPass, fromEmail, fromName,
          });
          setActiveModal(null);
          return;
        }

        // resend / sendgrid
        const fromEmail = emailForm.fromEmail.trim();
        if (!fromEmail) { setEmailMsg({ ok: false, text: 'Informe o e-mail de remetente.' }); return; }

        const keyInput = emailForm.apiKey.trim();
        const finalApiKey = keyInput.startsWith('•') ? existing.apiKey : keyInput;
        if (!finalApiKey) { setEmailMsg({ ok: false, text: 'Informe a chave de API.' }); return; }

        const res = await fetch('/api/email/test', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider, apiKey: finalApiKey }),
        });
        const data = await res.json();
        if (!data.success) { setEmailMsg({ ok: false, text: data.error || 'Credencial inválida.' }); return; }

        await upsertIntegration('email', 'E-mail', 'connected', { provider, apiKey: finalApiKey, fromEmail, fromName });
        setActiveModal(null);
      }
    } finally {
      setSavingIntegration(false);
    }
  };

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
              className={`text-left rounded-xl border p-4 flex flex-col gap-3 transition-colors ${locked ? "border-border bg-card opacity-75 hover:opacity-100 hover:border-amber-500/40" : connected ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-card hover:border-brand-500/40 hover:bg-brand-500/5"}`}
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

      {/* Dynamic Modal per Integration */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-border/50">
              <div className="flex items-center gap-3">
                {activeModal === 'instagram' && (
                  <div className="h-10 w-10 bg-pink-500/10 rounded-lg flex items-center justify-center border border-pink-500/20">
                    <MessageCircle className="h-5 w-5 text-pink-500" />
                  </div>
                )}
                {activeModal === 'facebook' && (
                  <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                    <MessageCircle className="h-5 w-5 text-blue-500" />
                  </div>
                )}
                {activeModal === 'calendar' && (
                  <div className="h-10 w-10 bg-violet-500/10 rounded-lg flex items-center justify-center border border-violet-500/20">
                    <CalendarDays className="h-5 w-5 text-violet-500" />
                  </div>
                )}
                {activeModal === 'external_db' && (
                  <div className="h-10 w-10 bg-cyan-500/10 rounded-lg flex items-center justify-center border border-cyan-500/20">
                    <Database className="h-5 w-5 text-cyan-500" />
                  </div>
                )}
                {activeModal === 'email' && (
                  <div className="h-10 w-10 bg-amber-500/10 rounded-lg flex items-center justify-center border border-amber-500/20">
                    <Mail className="h-5 w-5 text-amber-500" />
                  </div>
                )}
                {/* Fallback Icon for others like webhook/payments */}
                {!['instagram', 'facebook', 'calendar', 'external_db', 'email'].includes(activeModal) && (
                  <div className="h-10 w-10 bg-secondary rounded-lg flex items-center justify-center border border-border">
                    <Webhook className="h-5 w-5 text-foreground" />
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold">
                    Configurar {INTEGRATIONS_META.find(i => i.id === activeModal)?.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">Preencha os dados de conexão do aplicativo.</p>
                </div>
              </div>
              <button onClick={() => setActiveModal(null)} className="h-8 w-8 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={(e) => handleConnectIntegration(e, activeModal)} className="p-6 space-y-5">
              {activeModal === 'webhook' ? (
                <>
                  <div className="p-4 bg-secondary border border-border rounded-lg text-sm mb-2">
                    Sempre que um lead mudar de etapa nos eventos marcados abaixo, enviamos um <code>POST</code> com os dados do lead para a URL configurada.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhookUrl">URL de destino</Label>
                    <Input
                      id="webhookUrl"
                      placeholder="https://sua-ferramenta.com/webhook"
                      required
                      value={webhookForm.url}
                      onChange={(e) => setWebhookForm(prev => ({ ...prev, url: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhookSecret">Secret (opcional)</Label>
                    <Input
                      id="webhookSecret"
                      placeholder="Usado para assinar o payload (HMAC SHA-256)"
                      value={webhookForm.secret}
                      onChange={(e) => setWebhookForm(prev => ({ ...prev, secret: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Se preenchido, enviamos o header <code>X-Synapse-Signature</code> com o HMAC SHA-256 do corpo da requisição.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Eventos</Label>
                    <div className="space-y-2">
                      {WEBHOOK_EVENTS.map(ev => (
                        <label key={ev.value} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-border accent-brand-500"
                            checked={webhookForm.events.includes(ev.value)}
                            onChange={() => toggleWebhookEvent(ev.value)}
                          />
                          {ev.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              ) : activeModal === 'payments' ? (
                <>
                  <div className="p-4 bg-secondary border border-border rounded-lg text-sm mb-2">
                    Conecte seu provedor de pagamentos. Com isso, seus agentes ganham automaticamente a ferramenta <code>gerar_link_pagamento</code> para criar links de cobrança (Pix, cartão, boleto) durante a conversa.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentsProvider">Provedor</Label>
                    <select
                      id="paymentsProvider"
                      value={paymentsForm.provider}
                      onChange={(e) => setPaymentsForm(prev => ({ ...prev, provider: e.target.value }))}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {PAYMENT_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  {paymentsForm.provider === 'pix' ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="pixKey">Chave Pix</Label>
                        <Input
                          id="pixKey"
                          value={paymentsForm.pixKey}
                          onChange={(e) => setPaymentsForm(prev => ({ ...prev, pixKey: e.target.value }))}
                          placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="merchantName">Nome do recebedor</Label>
                        <Input
                          id="merchantName"
                          value={paymentsForm.merchantName}
                          onChange={(e) => setPaymentsForm(prev => ({ ...prev, merchantName: e.target.value }))}
                          placeholder="Ex: Salão da Maria"
                          maxLength={25}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="merchantCity">Cidade do recebedor</Label>
                        <Input
                          id="merchantCity"
                          value={paymentsForm.merchantCity}
                          onChange={(e) => setPaymentsForm(prev => ({ ...prev, merchantCity: e.target.value }))}
                          placeholder="Ex: SAO PAULO"
                          maxLength={15}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {PAYMENT_PROVIDERS.find(p => p.value === paymentsForm.provider)?.help}
                      </p>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="paymentsKey">{PAYMENT_PROVIDERS.find(p => p.value === paymentsForm.provider)?.keyLabel}</Label>
                      <Input
                        id="paymentsKey"
                        type="password"
                        value={paymentsForm.apiKey}
                        onChange={(e) => setPaymentsForm(prev => ({ ...prev, apiKey: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {PAYMENT_PROVIDERS.find(p => p.value === paymentsForm.provider)?.help}
                      </p>
                    </div>
                  )}
                  {paymentsMsg && (
                    <div className={`flex items-start gap-2 text-sm p-3 rounded-lg ${paymentsMsg.ok ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {paymentsMsg.text}
                    </div>
                  )}
                </>
              ) : activeModal === 'instagram' || activeModal === 'facebook' ? (
                <>
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-200 mb-4">
                    Cole o Access Token (permanente) e o ID da página/conta comercial gerados no Meta Business Suite.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="metaToken">Access Token (Permanente)</Label>
                    <Input
                      id="metaToken" type="password" placeholder="EAAGm0PX4ZCQBA..."
                      value={metaForm.accessToken}
                      onChange={(e) => setMetaForm(prev => ({ ...prev, accessToken: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pageId">ID da Página / Conta Comercial</Label>
                    <Input
                      id="pageId" placeholder="102930192301" required
                      value={metaForm.pageId}
                      onChange={(e) => setMetaForm(prev => ({ ...prev, pageId: e.target.value }))}
                    />
                  </div>
                </>
              ) : activeModal === 'calendar' ? (
                <>
                  <div className="p-4 bg-secondary border border-border rounded-lg text-sm mb-2">
                    Conecte uma agenda para que o agente ganhe as ferramentas <code>verificar_disponibilidade</code> e <code>agendar_horario</code>, podendo checar horários livres e marcar reuniões com os leads durante a conversa.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calendarProvider">Provedor</Label>
                    <select
                      id="calendarProvider"
                      value={calendarForm.provider}
                      onChange={(e) => setCalendarForm(prev => ({ ...prev, provider: e.target.value }))}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {CALENDAR_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>

                  {calendarForm.provider === 'calcom' && (
                    <>
                      <div className="p-3 bg-secondary/50 border border-border rounded-lg text-xs text-muted-foreground space-y-1.5">
                        <p>1. Crie uma conta gratuita em <a href="https://cal.com/signup" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">cal.com/signup</a>.</p>
                        <p>2. Gere uma API Key em <a href="https://app.cal.com/settings/developer/api-keys" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">app.cal.com/settings/developer/api-keys</a>.</p>
                        <p>3. Acesse <a href="https://app.cal.com/event-types" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">app.cal.com/event-types</a>, escolha o tipo de evento que o agente deve oferecer e copie o ID que aparece na URL ao editá-lo (ex: .../event-types/123456 → ID é 123456).</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="calcomApiKey">API Key</Label>
                        <Input
                          id="calcomApiKey" type="password" placeholder="cal_live_..."
                          value={calendarForm.apiKey}
                          onChange={(e) => setCalendarForm(prev => ({ ...prev, apiKey: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="calcomEventTypeId">Event Type ID</Label>
                        <Input
                          id="calcomEventTypeId" placeholder="123456"
                          value={calendarForm.eventTypeId}
                          onChange={(e) => setCalendarForm(prev => ({ ...prev, eventTypeId: e.target.value }))}
                        />
                      </div>
                    </>
                  )}

                  {calendarForm.provider === 'calendly' && (
                    <>
                      <div className="p-3 bg-secondary/50 border border-border rounded-lg text-xs text-muted-foreground space-y-1.5">
                        <p>1. Crie uma conta em <a href="https://calendly.com/" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">calendly.com</a> (um plano pago é necessário para gerar links de agendamento via API).</p>
                        <p>2. Gere um Personal Access Token em <a href="https://calendly.com/integrations/api_webhooks" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">calendly.com/integrations/api_webhooks</a>.</p>
                        <p>3. Cole abaixo o link público do tipo de evento que o agente deve oferecer (ex: https://calendly.com/seunome/30min).</p>
                        <p className="text-amber-400">Atenção: o Calendly não permite que o agente confirme um horário diretamente. Em vez disso, ele vai gerar um link único para o cliente escolher e confirmar o melhor horário.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="calendlyToken">Personal Access Token</Label>
                        <Input
                          id="calendlyToken" type="password"
                          value={calendarForm.apiToken}
                          onChange={(e) => setCalendarForm(prev => ({ ...prev, apiToken: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="calendlyUrl">Link da página de agendamento</Label>
                        <Input
                          id="calendlyUrl" placeholder="https://calendly.com/seunome/30min"
                          value={calendarForm.schedulingUrl}
                          onChange={(e) => setCalendarForm(prev => ({ ...prev, schedulingUrl: e.target.value }))}
                        />
                      </div>
                    </>
                  )}

                  {calendarForm.provider === 'google' && (
                    <>
                      <div className="p-3 bg-secondary/50 border border-border rounded-lg text-xs text-muted-foreground space-y-1.5">
                        <p>1. Acesse o <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">Google Cloud Console → Credenciais</a> e crie um projeto (gratuito).</p>
                        <p>2. Em "APIs e Serviços → Biblioteca", ative a "Google Calendar API".</p>
                        <p>3. Em "Credenciais", crie um "ID do cliente OAuth" do tipo "Aplicativo da Web".</p>
                        <p>4. Em "URIs de redirecionamento autorizados", adicione exatamente:</p>
                        <p className="break-all bg-background border border-border rounded px-2 py-1 font-mono">{appOrigin || '...'}/api/calendar/google/callback</p>
                        <p>5. Copie o Client ID e o Client Secret gerados, cole abaixo e clique em "Conectar com Google" para autorizar o acesso à sua agenda.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="googleClientId">Client ID</Label>
                        <Input
                          id="googleClientId" placeholder="xxxxxx.apps.googleusercontent.com"
                          value={calendarForm.clientId}
                          onChange={(e) => setCalendarForm(prev => ({ ...prev, clientId: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="googleClientSecret">Client Secret</Label>
                        <Input
                          id="googleClientSecret" type="password"
                          value={calendarForm.clientSecret}
                          onChange={(e) => setCalendarForm(prev => ({ ...prev, clientSecret: e.target.value }))}
                        />
                      </div>
                      {statusMap.calendar?.config?.refreshToken && (
                        <p className="text-xs text-emerald-500">Conta do Google já autorizada.</p>
                      )}
                    </>
                  )}

                  {(calendarForm.provider === 'calcom' || calendarForm.provider === 'google') && (
                    <div className="space-y-2">
                      <Label htmlFor="reminderHours">Lembrete de confirmação (horas antes)</Label>
                      <Input
                        id="reminderHours" type="number" min="1" max="48" placeholder="2"
                        value={calendarForm.reminderHours}
                        onChange={(e) => setCalendarForm(prev => ({ ...prev, reminderHours: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">O agente enviará uma mensagem automática pedindo confirmação do compromisso esse tempo antes do horário marcado.</p>
                    </div>
                  )}

                  {calendarMsg && (
                    <div className={`flex items-start gap-2 text-sm p-3 rounded-lg ${calendarMsg.ok ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {calendarMsg.text}
                    </div>
                  )}
                </>
              ) : activeModal === 'external_db' ? (
                <>
                  <div className="p-4 bg-secondary border border-border rounded-lg text-sm mb-2">
                    Conecte o seu próprio banco de dados (Supabase ou Firebase) para que o agente ganhe a ferramenta <code>consultar_dados_externos</code>, podendo buscar informações já cadastradas no seu sistema (clientes, fornecedores, produtos, etc.) durante a conversa. Isso não afeta os dados do seu painel BizPilot.
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="externalDbProvider">Provedor</Label>
                    <select
                      id="externalDbProvider"
                      value={externalDbForm.provider}
                      onChange={(e) => setExternalDbForm(prev => ({ ...prev, provider: e.target.value }))}
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {EXTERNAL_DB_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>

                  {externalDbForm.provider === 'supabase' ? (
                    <>
                      <div className="p-3 bg-secondary/50 border border-border rounded-lg text-xs text-muted-foreground space-y-1.5">
                        <p>1. No seu projeto Supabase, acesse Configurações do Projeto → API.</p>
                        <p>2. Copie a "Project URL" e a chave "anon public" (ou uma chave com permissão somente leitura na tabela).</p>
                        <p>3. Informe o nome da tabela e a coluna que o agente vai usar para buscar (ex: nome, codigo).</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="externalDbProjectUrl">URL do Projeto</Label>
                        <Input
                          id="externalDbProjectUrl" placeholder="https://xxxxxxxx.supabase.co"
                          value={externalDbForm.projectUrl}
                          onChange={(e) => setExternalDbForm(prev => ({ ...prev, projectUrl: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="externalDbApiKey">Chave de API (anon ou service)</Label>
                        <Input
                          id="externalDbApiKey" type="password"
                          value={externalDbForm.apiKey}
                          onChange={(e) => setExternalDbForm(prev => ({ ...prev, apiKey: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="externalDbTable">Tabela</Label>
                        <Input
                          id="externalDbTable" placeholder="Ex: clientes"
                          value={externalDbForm.table}
                          onChange={(e) => setExternalDbForm(prev => ({ ...prev, table: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="externalDbSearchColumn">Coluna de busca</Label>
                        <Input
                          id="externalDbSearchColumn" placeholder="Ex: nome"
                          value={externalDbForm.searchColumn}
                          onChange={(e) => setExternalDbForm(prev => ({ ...prev, searchColumn: e.target.value }))}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-secondary/50 border border-border rounded-lg text-xs text-muted-foreground space-y-1.5">
                        <p>1. No Console do Firebase, acesse Configurações do projeto e copie o "ID do projeto".</p>
                        <p>2. Gere uma chave Web API em Configurações do projeto → Geral, ou em APIs e Serviços → Credenciais no Google Cloud Console.</p>
                        <p>3. Garanta que as regras de segurança do Firestore permitam leitura para a coleção informada.</p>
                        <p>4. Informe o nome da coleção e o campo que o agente vai usar para buscar (ex: nome, codigo).</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="externalDbProjectId">ID do Projeto</Label>
                        <Input
                          id="externalDbProjectId" placeholder="meu-projeto-firebase"
                          value={externalDbForm.projectId}
                          onChange={(e) => setExternalDbForm(prev => ({ ...prev, projectId: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="externalDbFirebaseApiKey">Chave de API (Web API Key)</Label>
                        <Input
                          id="externalDbFirebaseApiKey" type="password"
                          value={externalDbForm.apiKey}
                          onChange={(e) => setExternalDbForm(prev => ({ ...prev, apiKey: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="externalDbCollection">Coleção</Label>
                        <Input
                          id="externalDbCollection" placeholder="Ex: clientes"
                          value={externalDbForm.collection}
                          onChange={(e) => setExternalDbForm(prev => ({ ...prev, collection: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="externalDbSearchField">Campo de busca</Label>
                        <Input
                          id="externalDbSearchField" placeholder="Ex: nome"
                          value={externalDbForm.searchField}
                          onChange={(e) => setExternalDbForm(prev => ({ ...prev, searchField: e.target.value }))}
                        />
                      </div>
                    </>
                  )}

                  {externalDbMsg && (
                    <div className={`flex items-start gap-2 text-sm p-3 rounded-lg ${externalDbMsg.ok ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {externalDbMsg.text}
                    </div>
                  )}
                </>
              ) : activeModal === 'email' ? (
                <>
                  <div className="p-4 bg-secondary border border-border rounded-lg text-sm mb-2">
                    Conecte um e-mail. Com isso, seus agentes ganham automaticamente a ferramenta <code>enviar_email</code> para enviar orçamentos, comprovantes e materiais aos leads durante a conversa.
                  </div>

                  <div className="space-y-2">
                    <Label>Como você quer conectar?</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { key: 'google', title: 'Entrar com Google', desc: '1 clique, sem senha', badge: 'Recomendado' },
                        { key: 'smtp', title: 'E-mail próprio', desc: 'Gmail, Outlook, Zoho…' },
                        { key: 'api', title: 'Avançado', desc: 'Resend / SendGrid' },
                      ].map(m => {
                        const active = m.key === 'google' ? emailForm.provider === 'google'
                          : m.key === 'smtp' ? emailForm.provider === 'smtp'
                          : (emailForm.provider === 'resend' || emailForm.provider === 'sendgrid');
                        return (
                          <button
                            type="button" key={m.key}
                            onClick={() => setEmailForm(prev => ({
                              ...prev,
                              provider: m.key === 'api'
                                ? (prev.provider === 'resend' || prev.provider === 'sendgrid' ? prev.provider : 'resend')
                                : m.key,
                            }))}
                            className={`text-left p-3 rounded-lg border transition-colors ${active ? 'border-brand-500 bg-brand-500/10' : 'border-border bg-background hover:bg-secondary'}`}
                          >
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-medium">{m.title}</span>
                              {m.badge && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-500/15 text-brand-500">{m.badge}</span>}
                            </div>
                            <span className="text-xs text-muted-foreground">{m.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {emailForm.provider === 'google' && (
                    <div className="p-4 bg-secondary border border-border rounded-lg text-sm space-y-2">
                      <p>Você será levado à tela do Google para autorizar o envio de e-mails. Os e-mails sairão da própria conta que você autorizar — sem configurar servidor nem senha.</p>
                      <p className="text-xs text-muted-foreground">Se aparecer um aviso de “app não verificado”, toque em <strong>Avançado → Continuar</strong>: é seguro, é o app do próprio BizPilot.</p>
                    </div>
                  )}

                  {emailForm.provider === 'smtp' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="smtpPreset">Serviço de e-mail</Label>
                        <select
                          id="smtpPreset"
                          value={emailForm.smtpPreset}
                          onChange={(e) => {
                            const key = e.target.value; const p = SMTP_PRESETS[key];
                            setEmailForm(prev => ({ ...prev, smtpPreset: key, host: p.host || prev.host, port: String(p.port), secure: p.secure }));
                          }}
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          {Object.entries(SMTP_PRESETS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
                        </select>
                        {SMTP_PRESETS[emailForm.smtpPreset]?.docUrl && (
                          <a href={SMTP_PRESETS[emailForm.smtpPreset].docUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-500 hover:underline inline-block mt-1">
                            {SMTP_PRESETS[emailForm.smtpPreset].docLabel} →
                          </a>
                        )}
                      </div>

                      {emailForm.smtpPreset === 'custom' && (
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2 space-y-2">
                            <Label htmlFor="smtpHost">Servidor (host)</Label>
                            <Input id="smtpHost" placeholder="smtp.seudominio.com" value={emailForm.host} onChange={(e) => setEmailForm(prev => ({ ...prev, host: e.target.value }))} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="smtpPort">Porta</Label>
                            <Input id="smtpPort" value={emailForm.port} onChange={(e) => setEmailForm(prev => ({ ...prev, port: e.target.value, secure: e.target.value.trim() === '465' }))} />
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="smtpUser">E-mail / usuário</Label>
                        <Input id="smtpUser" type="email" placeholder="voce@gmail.com" value={emailForm.user} onChange={(e) => setEmailForm(prev => ({ ...prev, user: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtpPass">Senha (ou senha de app)</Label>
                        <Input id="smtpPass" type="password" value={emailForm.pass} onChange={(e) => setEmailForm(prev => ({ ...prev, pass: e.target.value }))} />
                        <p className="text-xs text-muted-foreground mt-1">No Gmail e Outlook, use uma “Senha de app” (não a senha normal da conta).</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtpFromName">Nome de remetente (opcional)</Label>
                        <Input id="smtpFromName" placeholder="Ex: Salão da Maria" value={emailForm.fromName} onChange={(e) => setEmailForm(prev => ({ ...prev, fromName: e.target.value }))} />
                      </div>
                    </>
                  )}

                  {(emailForm.provider === 'resend' || emailForm.provider === 'sendgrid') && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="emailProvider">Provedor</Label>
                        <select
                          id="emailProvider"
                          value={emailForm.provider}
                          onChange={(e) => setEmailForm(prev => ({ ...prev, provider: e.target.value }))}
                          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          {EMAIL_API_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                        {(() => { const p = EMAIL_API_PROVIDERS.find(x => x.value === emailForm.provider); return p ? (
                          <a href={p.docUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-500 hover:underline inline-block mt-1">{p.docLabel} →</a>
                        ) : null; })()}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emailApiKey">Chave de API</Label>
                        <Input
                          id="emailApiKey" type="password"
                          value={emailForm.apiKey}
                          onChange={(e) => setEmailForm(prev => ({ ...prev, apiKey: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {EMAIL_API_PROVIDERS.find(p => p.value === emailForm.provider)?.help}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emailFromEmail">E-mail de remetente</Label>
                        <Input
                          id="emailFromEmail" type="email" placeholder="contato@seudominio.com"
                          value={emailForm.fromEmail}
                          onChange={(e) => setEmailForm(prev => ({ ...prev, fromEmail: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Precisa ser um e-mail/domínio verificado no painel do provedor escolhido.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emailFromName">Nome de remetente (opcional)</Label>
                        <Input
                          id="emailFromName" placeholder="Ex: Salão da Maria"
                          value={emailForm.fromName}
                          onChange={(e) => setEmailForm(prev => ({ ...prev, fromName: e.target.value }))}
                        />
                      </div>
                    </>
                  )}

                  {emailMsg && (
                    <div className={`flex items-start gap-2 text-sm p-3 rounded-lg ${emailMsg.ok ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {emailMsg.text}
                    </div>
                  )}
                </>
              ) : (
                <div className="p-4 bg-secondary border border-border rounded-lg text-sm">
                  Configurações detalhadas para este módulo serão liberadas em breve. Você pode ativar o módulo agora para reservar seu acesso antecipado.
                </div>
              )}

              <div className="pt-4 flex justify-between gap-3">
                {['webhook', 'payments', 'instagram', 'facebook', 'calendar', 'external_db', 'email'].includes(activeModal) && getStatus(activeModal) === 'connected' ? (
                  <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDisconnectIntegration(activeModal)}>
                    Desconectar
                  </Button>
                ) : <span />}

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setActiveModal(null)} disabled={savingIntegration}>Cancelar</Button>
                  <Button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white" disabled={savingIntegration}>
                    {savingIntegration ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {(activeModal === 'calendar' && calendarForm.provider === 'google') || (activeModal === 'email' && emailForm.provider === 'google') ? 'Conectar com Google' : 'Salvar Conexão'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
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
