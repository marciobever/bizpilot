"use client";
import React from "react";
import { X, MessageCircle, CalendarDays, Database, Mail, Webhook, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import {
  INTEGRATIONS_META, WEBHOOK_EVENTS, PAYMENT_PROVIDERS,
  CALENDAR_PROVIDERS, EXTERNAL_DB_PROVIDERS, SMTP_PRESETS, EMAIL_API_PROVIDERS,
} from "../_constants";

interface Props {
  activeModal: string;
  appOrigin: string;
  savingIntegration: boolean;
  statusMap: Record<string, { status: string; config: any }>;
  webhookForm: { url: string; secret: string; events: string[] };
  setWebhookForm: (v: any) => void;
  toggleWebhookEvent: (v: string) => void;
  paymentsForm: { provider: string; apiKey: string; pixKey: string; merchantName: string; merchantCity: string };
  setPaymentsForm: (v: any) => void;
  paymentsMsg: { ok: boolean; text: string } | null;
  metaForm: { accessToken: string; pageId: string };
  setMetaForm: (v: any) => void;
  calendarForm: { provider: string; apiKey: string; eventTypeId: string; apiToken: string; schedulingUrl: string; clientId: string; clientSecret: string; reminderHours: string };
  setCalendarForm: (v: any) => void;
  calendarMsg: { ok: boolean; text: string } | null;
  externalDbForm: { provider: string; projectUrl: string; apiKey: string; table: string; searchColumn: string; projectId: string; collection: string; searchField: string };
  setExternalDbForm: (v: any) => void;
  externalDbMsg: { ok: boolean; text: string } | null;
  emailForm: { provider: string; apiKey: string; fromEmail: string; fromName: string; smtpPreset: string; host: string; port: string; secure: boolean; user: string; pass: string };
  setEmailForm: (v: any) => void;
  emailMsg: { ok: boolean; text: string } | null;
  onClose: () => void;
  onDisconnect: (id: string) => void;
  onSubmit: (e: React.FormEvent, id: string) => void;
}

const MODAL_ICONS: Record<string, React.ReactNode> = {
  instagram: <MessageCircle className="h-5 w-5 text-pink-500" />,
  facebook: <MessageCircle className="h-5 w-5 text-blue-500" />,
  calendar: <CalendarDays className="h-5 w-5 text-violet-500" />,
  external_db: <Database className="h-5 w-5 text-cyan-500" />,
  email: <Mail className="h-5 w-5 text-amber-500" />,
};

const MODAL_ICON_BG: Record<string, string> = {
  instagram: "bg-pink-500/10 border-pink-500/20",
  facebook: "bg-blue-500/10 border-blue-500/20",
  calendar: "bg-violet-500/10 border-violet-500/20",
  external_db: "bg-cyan-500/10 border-cyan-500/20",
  email: "bg-amber-500/10 border-amber-500/20",
};

export function IntegrationModal({
  activeModal, appOrigin, savingIntegration, statusMap,
  webhookForm, setWebhookForm, toggleWebhookEvent,
  paymentsForm, setPaymentsForm, paymentsMsg,
  metaForm, setMetaForm,
  calendarForm, setCalendarForm, calendarMsg,
  externalDbForm, setExternalDbForm, externalDbMsg,
  emailForm, setEmailForm, emailMsg,
  onClose, onDisconnect, onSubmit,
}: Props) {
  const meta = INTEGRATIONS_META.find((i) => i.id === activeModal);
  const icon = MODAL_ICONS[activeModal] || <Webhook className="h-5 w-5 text-foreground" />;
  const iconBg = MODAL_ICON_BG[activeModal] || "bg-secondary border-border";
  const isConnectable = ["webhook", "payments", "instagram", "facebook", "calendar", "external_db", "email"].includes(activeModal);
  const isConnected = isConnectable && statusMap[activeModal]?.status === "connected";
  const isGoogleSubmit =
    (activeModal === "calendar" && calendarForm.provider === "google") ||
    (activeModal === "email" && emailForm.provider === "google");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center border ${iconBg}`}>{icon}</div>
            <div>
              <h3 className="text-lg font-bold">Configurar {meta?.name}</h3>
              <p className="text-sm text-muted-foreground">Preencha os dados de conexão do aplicativo.</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={(e) => onSubmit(e, activeModal)} className="p-6 space-y-5 overflow-y-auto">
          {/* ── Webhook ── */}
          {activeModal === "webhook" && (
            <>
              <div className="p-4 bg-secondary border border-border rounded-lg text-sm">
                Sempre que um lead mudar de etapa nos eventos marcados abaixo, enviamos um <code>POST</code> com os dados do lead para a URL configurada.
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">URL de destino</Label>
                <Input id="webhookUrl" placeholder="https://sua-ferramenta.com/webhook" required value={webhookForm.url} onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhookSecret">Secret (opcional)</Label>
                <Input id="webhookSecret" placeholder="Usado para assinar o payload (HMAC SHA-256)" value={webhookForm.secret} onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })} />
                <p className="text-xs text-muted-foreground">Se preenchido, enviamos o header <code>X-Synapse-Signature</code> com o HMAC SHA-256 do corpo da requisição.</p>
              </div>
              <div className="space-y-2">
                <Label>Eventos</Label>
                <div className="space-y-2">
                  {WEBHOOK_EVENTS.map((ev) => (
                    <label key={ev.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" className="h-4 w-4 rounded border-border accent-brand-500" checked={webhookForm.events.includes(ev.value)} onChange={() => toggleWebhookEvent(ev.value)} />
                      {ev.label}
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Payments ── */}
          {activeModal === "payments" && (
            <>
              <div className="p-4 bg-secondary border border-border rounded-lg text-sm">
                Conecte seu provedor de pagamentos. Seus agentes ganham automaticamente a ferramenta <code>gerar_link_pagamento</code> para criar links de cobrança durante a conversa.
              </div>
              <div className="space-y-2">
                <Label>Provedor</Label>
                <select value={paymentsForm.provider} onChange={(e) => setPaymentsForm({ ...paymentsForm, provider: e.target.value })} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  {PAYMENT_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              {paymentsForm.provider === "pix" ? (
                <>
                  <div className="space-y-2"><Label>Chave Pix</Label><Input value={paymentsForm.pixKey} onChange={(e) => setPaymentsForm({ ...paymentsForm, pixKey: e.target.value })} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" /></div>
                  <div className="space-y-2"><Label>Nome do recebedor</Label><Input value={paymentsForm.merchantName} onChange={(e) => setPaymentsForm({ ...paymentsForm, merchantName: e.target.value })} placeholder="Ex: Salão da Maria" maxLength={25} /></div>
                  <div className="space-y-2"><Label>Cidade do recebedor</Label><Input value={paymentsForm.merchantCity} onChange={(e) => setPaymentsForm({ ...paymentsForm, merchantCity: e.target.value })} placeholder="Ex: SAO PAULO" maxLength={15} /></div>
                </>
              ) : (
                <div className="space-y-2">
                  <Label>{PAYMENT_PROVIDERS.find((p) => p.value === paymentsForm.provider)?.keyLabel}</Label>
                  <Input type="password" value={paymentsForm.apiKey} onChange={(e) => setPaymentsForm({ ...paymentsForm, apiKey: e.target.value })} />
                  <p className="text-xs text-muted-foreground">{PAYMENT_PROVIDERS.find((p) => p.value === paymentsForm.provider)?.help}</p>
                </div>
              )}
              {paymentsMsg && <div className={`flex items-start gap-2 text-sm p-3 rounded-lg ${paymentsMsg.ok ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />{paymentsMsg.text}</div>}
            </>
          )}

          {/* ── Instagram / Facebook ── */}
          {(activeModal === "instagram" || activeModal === "facebook") && (
            <>
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-200">Cole o Access Token (permanente) e o ID da página/conta comercial gerados no Meta Business Suite.</div>
              <div className="space-y-2"><Label>Access Token (Permanente)</Label><Input type="password" placeholder="EAAGm0PX4ZCQBA..." value={metaForm.accessToken} onChange={(e) => setMetaForm({ ...metaForm, accessToken: e.target.value })} /></div>
              <div className="space-y-2"><Label>ID da Página / Conta Comercial</Label><Input placeholder="102930192301" required value={metaForm.pageId} onChange={(e) => setMetaForm({ ...metaForm, pageId: e.target.value })} /></div>
            </>
          )}

          {/* ── Calendar ── */}
          {activeModal === "calendar" && (
            <>
              <div className="p-4 bg-secondary border border-border rounded-lg text-sm">Conecte uma agenda para que o agente ganhe as ferramentas <code>verificar_disponibilidade</code> e <code>agendar_horario</code>.</div>
              <div className="space-y-2">
                <Label>Provedor</Label>
                <select value={calendarForm.provider} onChange={(e) => setCalendarForm({ ...calendarForm, provider: e.target.value })} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  {CALENDAR_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              {calendarForm.provider === "calcom" && (
                <>
                  <div className="p-3 bg-secondary/50 border border-border rounded-lg text-xs text-muted-foreground space-y-1.5">
                    <p>1. Crie uma conta em <a href="https://cal.com/signup" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">cal.com/signup</a>.</p>
                    <p>2. Gere uma API Key em <a href="https://app.cal.com/settings/developer/api-keys" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">app.cal.com/settings/developer/api-keys</a>.</p>
                    <p>3. Copie o Event Type ID da URL ao editar o evento.</p>
                  </div>
                  <div className="space-y-2"><Label>API Key</Label><Input type="password" placeholder="cal_live_..." value={calendarForm.apiKey} onChange={(e) => setCalendarForm({ ...calendarForm, apiKey: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Event Type ID</Label><Input placeholder="123456" value={calendarForm.eventTypeId} onChange={(e) => setCalendarForm({ ...calendarForm, eventTypeId: e.target.value })} /></div>
                </>
              )}
              {calendarForm.provider === "calendly" && (
                <>
                  <div className="p-3 bg-secondary/50 border border-border rounded-lg text-xs text-muted-foreground space-y-1.5">
                    <p>1. Gere um Personal Access Token em <a href="https://calendly.com/integrations/api_webhooks" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">calendly.com/integrations/api_webhooks</a>.</p>
                    <p>2. Cole o link público do tipo de evento que o agente deve oferecer.</p>
                    <p className="text-amber-400">Atenção: o Calendly não permite confirmação direta. O agente gerará um link para o cliente escolher.</p>
                  </div>
                  <div className="space-y-2"><Label>Personal Access Token</Label><Input type="password" value={calendarForm.apiToken} onChange={(e) => setCalendarForm({ ...calendarForm, apiToken: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Link da página de agendamento</Label><Input placeholder="https://calendly.com/seunome/30min" value={calendarForm.schedulingUrl} onChange={(e) => setCalendarForm({ ...calendarForm, schedulingUrl: e.target.value })} /></div>
                </>
              )}
              {calendarForm.provider === "google" && (
                <>
                  <div className="p-3 bg-secondary/50 border border-border rounded-lg text-xs text-muted-foreground space-y-1.5">
                    <p>1. Acesse o <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-brand-400 underline">Google Cloud Console → Credenciais</a> e crie um projeto.</p>
                    <p>2. Ative a "Google Calendar API".</p>
                    <p>3. Crie um "ID do cliente OAuth" do tipo "Aplicativo da Web".</p>
                    <p>4. Em "URIs de redirecionamento autorizados", adicione: <span className="break-all bg-background border border-border rounded px-1 font-mono">{appOrigin || "..."}/api/calendar/google/callback</span></p>
                  </div>
                  <div className="space-y-2"><Label>Client ID</Label><Input placeholder="xxxxxx.apps.googleusercontent.com" value={calendarForm.clientId} onChange={(e) => setCalendarForm({ ...calendarForm, clientId: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Client Secret</Label><Input type="password" value={calendarForm.clientSecret} onChange={(e) => setCalendarForm({ ...calendarForm, clientSecret: e.target.value })} /></div>
                  {statusMap.calendar?.config?.refreshToken && <p className="text-xs text-emerald-500">Conta do Google já autorizada.</p>}
                </>
              )}
              {(calendarForm.provider === "calcom" || calendarForm.provider === "google") && (
                <div className="space-y-2">
                  <Label>Lembrete de confirmação (horas antes)</Label>
                  <Input type="number" min="1" max="48" placeholder="2" value={calendarForm.reminderHours} onChange={(e) => setCalendarForm({ ...calendarForm, reminderHours: e.target.value })} />
                  <p className="text-xs text-muted-foreground">O agente enviará uma mensagem automática pedindo confirmação do compromisso esse tempo antes.</p>
                </div>
              )}
              {calendarMsg && <div className={`flex items-start gap-2 text-sm p-3 rounded-lg ${calendarMsg.ok ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />{calendarMsg.text}</div>}
            </>
          )}

          {/* ── External DB ── */}
          {activeModal === "external_db" && (
            <>
              <div className="p-4 bg-secondary border border-border rounded-lg text-sm">Conecte o seu próprio banco de dados para que o agente ganhe a ferramenta <code>consultar_dados_externos</code>.</div>
              <div className="space-y-2">
                <Label>Provedor</Label>
                <select value={externalDbForm.provider} onChange={(e) => setExternalDbForm({ ...externalDbForm, provider: e.target.value })} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  {EXTERNAL_DB_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              {externalDbForm.provider === "supabase" ? (
                <>
                  <div className="space-y-2"><Label>URL do Projeto</Label><Input placeholder="https://xxxxxxxx.supabase.co" value={externalDbForm.projectUrl} onChange={(e) => setExternalDbForm({ ...externalDbForm, projectUrl: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Chave de API</Label><Input type="password" value={externalDbForm.apiKey} onChange={(e) => setExternalDbForm({ ...externalDbForm, apiKey: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Tabela</Label><Input placeholder="Ex: clientes" value={externalDbForm.table} onChange={(e) => setExternalDbForm({ ...externalDbForm, table: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Coluna de busca</Label><Input placeholder="Ex: nome" value={externalDbForm.searchColumn} onChange={(e) => setExternalDbForm({ ...externalDbForm, searchColumn: e.target.value })} /></div>
                </>
              ) : (
                <>
                  <div className="space-y-2"><Label>ID do Projeto</Label><Input placeholder="meu-projeto-firebase" value={externalDbForm.projectId} onChange={(e) => setExternalDbForm({ ...externalDbForm, projectId: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Chave de API (Web API Key)</Label><Input type="password" value={externalDbForm.apiKey} onChange={(e) => setExternalDbForm({ ...externalDbForm, apiKey: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Coleção</Label><Input placeholder="Ex: clientes" value={externalDbForm.collection} onChange={(e) => setExternalDbForm({ ...externalDbForm, collection: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Campo de busca</Label><Input placeholder="Ex: nome" value={externalDbForm.searchField} onChange={(e) => setExternalDbForm({ ...externalDbForm, searchField: e.target.value })} /></div>
                </>
              )}
              {externalDbMsg && <div className={`flex items-start gap-2 text-sm p-3 rounded-lg ${externalDbMsg.ok ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />{externalDbMsg.text}</div>}
            </>
          )}

          {/* ── Email ── */}
          {activeModal === "email" && (
            <>
              <p className="text-sm text-muted-foreground">Conecte um e-mail e seus agentes poderão enviar orçamentos, comprovantes e materiais aos leads automaticamente.</p>
              <div className="space-y-2">
                <Label>Como você quer conectar?</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { key: "google", title: "Entrar com Google", desc: "1 clique, sem senha", badge: "Recomendado" },
                    { key: "smtp", title: "E-mail próprio", desc: "Gmail, Outlook, Zoho…" },
                    { key: "api", title: "Avançado", desc: "Resend / SendGrid" },
                  ].map((m) => {
                    const active = m.key === "google" ? emailForm.provider === "google" : m.key === "smtp" ? emailForm.provider === "smtp" : (emailForm.provider === "resend" || emailForm.provider === "sendgrid");
                    return (
                      <button type="button" key={m.key} onClick={() => setEmailForm({ ...emailForm, provider: m.key === "api" ? (emailForm.provider === "resend" || emailForm.provider === "sendgrid" ? emailForm.provider : "resend") : m.key })} className={`text-left p-3 rounded-lg border transition-colors ${active ? "border-brand-500 bg-brand-500/10" : "border-border bg-background hover:bg-secondary"}`}>
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
              {emailForm.provider === "google" && (
                <div className="p-4 bg-secondary border border-border rounded-lg text-sm space-y-2">
                  <p>Você será levado à tela do Google para autorizar o envio de e-mails. Se aparecer um aviso de "app não verificado", toque em <strong>Avançado → Continuar</strong>.</p>
                </div>
              )}
              {emailForm.provider === "smtp" && (
                <>
                  <div className="space-y-2">
                    <Label>Serviço de e-mail</Label>
                    <select value={emailForm.smtpPreset} onChange={(e) => { const key = e.target.value; const p = SMTP_PRESETS[key]; setEmailForm({ ...emailForm, smtpPreset: key, host: p.host || emailForm.host, port: String(p.port), secure: p.secure }); }} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                      {Object.entries(SMTP_PRESETS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
                    </select>
                    {SMTP_PRESETS[emailForm.smtpPreset]?.docUrl && <a href={SMTP_PRESETS[emailForm.smtpPreset].docUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-500 hover:underline inline-block mt-1">{SMTP_PRESETS[emailForm.smtpPreset].docLabel} →</a>}
                  </div>
                  {emailForm.smtpPreset === "custom" && (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2 space-y-2"><Label>Servidor (host)</Label><Input placeholder="smtp.seudominio.com" value={emailForm.host} onChange={(e) => setEmailForm({ ...emailForm, host: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Porta</Label><Input value={emailForm.port} onChange={(e) => setEmailForm({ ...emailForm, port: e.target.value, secure: e.target.value.trim() === "465" })} /></div>
                    </div>
                  )}
                  <div className="space-y-2"><Label>E-mail / usuário</Label><Input type="email" placeholder="voce@gmail.com" value={emailForm.user} onChange={(e) => setEmailForm({ ...emailForm, user: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Senha (ou senha de app)</Label><Input type="password" value={emailForm.pass} onChange={(e) => setEmailForm({ ...emailForm, pass: e.target.value })} /><p className="text-xs text-muted-foreground">No Gmail e Outlook, use uma "Senha de app".</p></div>
                  <div className="space-y-2"><Label>Nome de remetente (opcional)</Label><Input placeholder="Ex: Salão da Maria" value={emailForm.fromName} onChange={(e) => setEmailForm({ ...emailForm, fromName: e.target.value })} /></div>
                </>
              )}
              {(emailForm.provider === "resend" || emailForm.provider === "sendgrid") && (
                <>
                  <div className="space-y-2">
                    <Label>Provedor</Label>
                    <select value={emailForm.provider} onChange={(e) => setEmailForm({ ...emailForm, provider: e.target.value })} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                      {EMAIL_API_PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    {(() => { const p = EMAIL_API_PROVIDERS.find((x) => x.value === emailForm.provider); return p ? <a href={p.docUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-500 hover:underline inline-block mt-1">{p.docLabel} →</a> : null; })()}
                  </div>
                  <div className="space-y-2"><Label>Chave de API</Label><Input type="password" value={emailForm.apiKey} onChange={(e) => setEmailForm({ ...emailForm, apiKey: e.target.value })} /><p className="text-xs text-muted-foreground">{EMAIL_API_PROVIDERS.find((p) => p.value === emailForm.provider)?.help}</p></div>
                  <div className="space-y-2"><Label>E-mail de remetente</Label><Input type="email" placeholder="contato@seudominio.com" value={emailForm.fromEmail} onChange={(e) => setEmailForm({ ...emailForm, fromEmail: e.target.value })} /><p className="text-xs text-muted-foreground">Precisa ser um e-mail/domínio verificado no painel do provedor.</p></div>
                  <div className="space-y-2"><Label>Nome de remetente (opcional)</Label><Input placeholder="Ex: Salão da Maria" value={emailForm.fromName} onChange={(e) => setEmailForm({ ...emailForm, fromName: e.target.value })} /></div>
                </>
              )}
              {emailMsg && <div className={`flex items-start gap-2 text-sm p-3 rounded-lg ${emailMsg.ok ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"}`}><AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />{emailMsg.text}</div>}
            </>
          )}

          {/* ── Unknown / Coming soon ── */}
          {!["webhook", "payments", "instagram", "facebook", "calendar", "external_db", "email"].includes(activeModal) && (
            <div className="p-4 bg-secondary border border-border rounded-lg text-sm">
              Configurações detalhadas para este módulo serão liberadas em breve.
            </div>
          )}

          <div className="pt-4 flex justify-between gap-3">
            {isConnected ? (
              <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => onDisconnect(activeModal)}>
                Desconectar
              </Button>
            ) : <span />}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={savingIntegration}>Cancelar</Button>
              <Button type="submit" className="bg-brand-500 hover:bg-brand-600 text-white" disabled={savingIntegration}>
                {savingIntegration ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {isGoogleSubmit ? "Conectar com Google" : "Salvar Conexão"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
