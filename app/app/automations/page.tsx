"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { MessageCircle, Webhook, Link as LinkIcon, Database, CheckCircle2, X, Loader2, AlertCircle, CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

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
    name: "Supabase DB",
    description: "Sincronize contatos e leads diretamente com seu banco de dados.",
    icon: Database,
    category: "Database",
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
  }
];

const WEBHOOK_EVENTS = [
  { value: "lead_qualified", label: "Lead qualificado" },
  { value: "lead_converted", label: "Lead convertido (venda)" },
];

const PAYMENT_PROVIDERS: { value: string; label: string; keyLabel: string; help: string }[] = [
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
];

const CALENDAR_PROVIDERS: { value: string; label: string }[] = [
  { value: "calcom", label: "Cal.com" },
  { value: "calendly", label: "Calendly" },
  { value: "google", label: "Google Calendar" },
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

  // Webhooks Customizados
  const [webhookForm, setWebhookForm] = useState({ url: "", secret: "", events: [] as string[] });

  // Links de Pagamento (Mercado Pago / Asaas / Woovi)
  const [paymentsForm, setPaymentsForm] = useState({ provider: "mercadopago", apiKey: "" });
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

  useEffect(() => {
    if (user) fetchIntegrations();
    else setLoading(false);
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
    if (id === 'webhook') {
      const cfg = statusMap.webhook?.config || {};
      setWebhookForm({ url: cfg.url || "", secret: cfg.secret || "", events: cfg.events || [] });
    } else if (id === 'payments') {
      const cfg = statusMap.payments?.config || {};
      setPaymentsForm({ provider: cfg.provider || "mercadopago", apiKey: cfg.apiKey ? "••••••••••••" : "" });
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
        const key = paymentsForm.apiKey.trim();
        const provider = paymentsForm.provider;
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS_META.map((int) => {
          const Icon = int.icon;
          const status = getStatus(int.id);
          return (
            <Card key={int.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border ${int.bgClass}`}>
                   <Icon className={`h-5 w-5 ${int.color}`} />
                </div>
                {status === "connected" ? (
                  <Badge variant="success" className="gap-1 bg-emerald-500/10 text-emerald-500 border-0">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-secondary text-muted-foreground border-0">Desconectado</Badge>
                )}
              </CardHeader>
              <CardContent className="flex-1 mt-2">
                <CardTitle className="text-base mb-1">{int.name}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {int.description}
                </CardDescription>
                <div className="mt-4">
                  <Badge variant="outline" className="text-[10px] border-border text-muted-foreground px-2">
                    {int.category}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t border-border mt-auto">
                {status === "connected" ? (
                  <Button variant="outline" className="w-full" onClick={() => openModal(int.id)}>Configurar</Button>
                ) : (
                  <Button className="w-full bg-foreground text-background hover:bg-foreground/90" onClick={() => openModal(int.id)}>Instalar</Button>
                )}
              </CardFooter>
            </Card>
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
                {/* Fallback Icon for others like webhook/payments */}
                {!['instagram', 'facebook', 'calendar'].includes(activeModal) && (
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
                            className="h-4 w-4 rounded border-border accent-indigo-500"
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
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {PAYMENT_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
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
                      className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {CALENDAR_PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>

                  {calendarForm.provider === 'calcom' && (
                    <>
                      <div className="p-3 bg-secondary/50 border border-border rounded-lg text-xs text-muted-foreground space-y-1.5">
                        <p>1. Crie uma conta gratuita em <a href="https://cal.com/signup" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">cal.com/signup</a>.</p>
                        <p>2. Gere uma API Key em <a href="https://app.cal.com/settings/developer/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">app.cal.com/settings/developer/api-keys</a>.</p>
                        <p>3. Acesse <a href="https://app.cal.com/event-types" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">app.cal.com/event-types</a>, escolha o tipo de evento que o agente deve oferecer e copie o ID que aparece na URL ao editá-lo (ex: .../event-types/123456 → ID é 123456).</p>
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
                        <p>1. Crie uma conta em <a href="https://calendly.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">calendly.com</a> (um plano pago é necessário para gerar links de agendamento via API).</p>
                        <p>2. Gere um Personal Access Token em <a href="https://calendly.com/integrations/api_webhooks" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">calendly.com/integrations/api_webhooks</a>.</p>
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
                        <p>1. Acesse o <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">Google Cloud Console → Credenciais</a> e crie um projeto (gratuito).</p>
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
              ) : (
                <div className="p-4 bg-secondary border border-border rounded-lg text-sm">
                  Configurações detalhadas para este módulo serão liberadas em breve. Você pode ativar o módulo agora para reservar seu acesso antecipado.
                </div>
              )}

              <div className="pt-4 flex justify-between gap-3">
                {['webhook', 'payments', 'instagram', 'facebook', 'calendar'].includes(activeModal) && getStatus(activeModal) === 'connected' ? (
                  <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDisconnectIntegration(activeModal)}>
                    Desconectar
                  </Button>
                ) : <span />}

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setActiveModal(null)} disabled={savingIntegration}>Cancelar</Button>
                  <Button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white" disabled={savingIntegration}>
                    {savingIntegration ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {activeModal === 'calendar' && calendarForm.provider === 'google' ? 'Conectar com Google' : 'Salvar Conexão'}
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
