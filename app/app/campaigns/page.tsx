"use client";
import { useEffect, useMemo, useState } from "react";
import { Megaphone, Loader2, Send, AlertTriangle, CheckCircle2, Sparkles, XCircle, Clock, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { authFetch } from "@/lib/api-client";
import { normalizeBrazilPhone } from "@/lib/phone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface AgentOption { id: string; name: string; connected: boolean }
interface Campaign {
  id: string; name: string; message: string; image_url: string | null; buttons: string[] | null; status: string;
  total_recipients: number; sent_count: number; failed_count: number;
  created_at: string;
}
interface Recipient { id: string; phone: string; name: string | null; status: string; error: string | null; sent_at: string | null }
interface SavedContact { phone: string; name: string | null; updated_at: string }

const RECIPIENT_STATUS: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  pending: { label: "Aguardando", className: "text-muted-foreground", icon: Loader2 },
  sent:    { label: "Enviado",    className: "text-emerald-500",      icon: CheckCircle2 },
  failed:  { label: "Falhou",     className: "text-red-400",          icon: XCircle },
};

// Formata 5511999998888 -> (11) 99999-8888 pra facilitar a leitura na lista.
// Número internacional (não-BR) só ganha o "+" de volta pra ficar legível.
function formatPhoneDisplay(phone: string): string {
  if (phone.startsWith("55") && (phone.length === 12 || phone.length === 13)) {
    const p = phone.slice(2);
    return `(${p.slice(0, 2)}) ${p.slice(2, p.length - 4)}-${p.slice(-4)}`;
  }
  return `+${phone}`;
}

const STATUS_LABEL: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  queued:   { label: "Na fila",     variant: "secondary" },
  sending:  { label: "Enviando",    variant: "warning" },
  done:     { label: "Concluída",   variant: "success" },
  failed:   { label: "Falhou",      variant: "destructive" },
  canceled: { label: "Cancelada",   variant: "secondary" },
};

export default function CampaignsPage() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [agentId, setAgentId] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [buttons, setButtons] = useState<string[]>(["", "", ""]);
  const [recipientsRaw, setRecipientsRaw] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savedContacts, setSavedContacts] = useState<SavedContact[]>([]);
  const [showPastMessages, setShowPastMessages] = useState(false);

  // Mensagens já usadas em campanhas anteriores, sem repetir texto igual —
  // mostra as mais recentes primeiro pra reaproveitar com um clique.
  const pastMessages = useMemo(() => {
    const seen = new Set<string>();
    const out: Campaign[] = [];
    for (const c of campaigns) {
      if (!c.message || seen.has(c.message)) continue;
      seen.add(c.message);
      out.push(c);
      if (out.length >= 8) break;
    }
    return out;
  }, [campaigns]);

  function reuseMessage(c: Campaign) {
    setMessage(c.message);
    setImageUrl(c.image_url || "");
    setButtons(c.buttons?.length ? [c.buttons[0] || "", c.buttons[1] || "", c.buttons[2] || ""] : ["", "", ""]);
    setShowPastMessages(false);
  }

  function addSavedContactsToList() {
    const existingPhones = new Set(parsedRecipients.filter((r) => r.valid).map((r) => r.phone));
    const toAdd = savedContacts.filter((c) => !existingPhones.has(c.phone));
    if (toAdd.length === 0) return;
    const lines = toAdd.map((c) => (c.name ? `${c.phone}, ${c.name}` : c.phone));
    setRecipientsRaw((prev) => (prev.trim() ? `${prev.trim()}\n${lines.join("\n")}` : lines.join("\n")));
  }

  // Formata os números em tempo real (aceita qualquer formato colado) e
  // separa quem deu certo de quem precisa de correção manual.
  const parsedRecipients = useMemo(() => {
    const lines = recipientsRaw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const seen = new Set<string>();
    return lines.map((line) => {
      const [phoneRaw, ...rest] = line.split(",");
      const norm = normalizeBrazilPhone(phoneRaw || "");
      const duplicate = norm.valid && seen.has(norm.phone);
      if (norm.valid) seen.add(norm.phone);
      return { line, name: rest.join(",").trim(), ...norm, duplicate };
    });
  }, [recipientsRaw]);
  const validRecipients = parsedRecipients.filter((r) => r.valid && !r.duplicate);
  const invalidRecipients = parsedRecipients.filter((r) => !r.valid);
  const duplicateCount = parsedRecipients.filter((r) => r.duplicate).length;

  const handleGenerateMessage = async () => {
    // Usa o que já foi escrito na mensagem como base; se estiver vazia, usa
    // o nome da campanha como ponto de partida.
    const basis = message.trim() || name.trim();
    if (!basis) { setError("Escreva algo na mensagem (ou dê um nome à campanha) pra IA ter o que trabalhar."); return; }
    setAiLoading(true);
    setError("");
    try {
      const res = await authFetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: "campaign_message", description: basis }),
      });
      const json = await res.json();
      if (!res.ok || !json.text) throw new Error(json.error || "Não foi possível gerar a mensagem.");
      setMessage(json.text);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    const res = await authFetch(`/api/campaigns/${id}`);
    if (res.ok) {
      const json = await res.json();
      setRecipients(json.recipients ?? []);
    }
    setDetailLoading(false);
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) { setExpandedId(null); setRecipients([]); return; }
    setExpandedId(id);
    loadDetail(id);
  };

  const loadCampaigns = async () => {
    const res = await authFetch("/api/campaigns");
    if (res.ok) {
      const json = await res.json();
      setCampaigns(json.campaigns ?? []);
      setQuota(json.quota ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from("agents").select("id, name, config").is("deleted_at", null).eq("user_id", user.id).then(({ data }) => {
      const opts = (data ?? []).map((a: any) => {
        const cfg = typeof a.config === "string" ? JSON.parse(a.config) : a.config || {};
        return { id: a.id, name: a.name, connected: cfg.whatsapp?.provider === "evolution" && !!cfg.whatsapp?.evolution?.connected };
      });
      setAgents(opts);
      if (opts.length > 0) setAgentId(opts.find((o) => o.connected)?.id ?? opts[0].id);
    });
    loadCampaigns();
    authFetch("/api/campaigns/contacts").then((res) => res.ok ? res.json() : null).then((json) => {
      if (json) setSavedContacts(json.contacts ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Atualiza progresso das campanhas em andamento a cada 5s — e o detalhe
  // número a número da campanha aberta, se ela ainda estiver enviando.
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadCampaigns();
      if (expandedId) loadDetail(expandedId);
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, expandedId]);

  const selectedAgent = agents.find((a) => a.id === agentId);

  const handleSend = async () => {
    setError("");
    if (!agentId) { setError("Selecione um agente."); return; }
    if (!message.trim()) { setError("Escreva a mensagem."); return; }
    if (validRecipients.length === 0) { setError("Nenhum número válido na lista — corrija os destacados em vermelho."); return; }

    setSending(true);
    try {
      const res = await authFetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId, name: name || "Campanha", message, imageUrl,
          buttons: buttons.map((b) => b.trim()).filter(Boolean),
          recipients: validRecipients.map((r) => ({ phone: r.phone, name: r.name || undefined })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Não foi possível criar a campanha.");
      setName(""); setMessage(""); setImageUrl(""); setButtons(["", "", ""]); setRecipientsRaw("");
      await loadCampaigns();
      authFetch("/api/campaigns/contacts").then((r) => r.ok ? r.json() : null).then((json) => { if (json) setSavedContacts(json.contacts ?? []); });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-purple-500" /> Campanhas
        </h2>
        <p className="text-muted-foreground text-sm">Envie a mesma mensagem para uma lista de contatos via WhatsApp.</p>
      </div>

      {quota && (
        <div className="text-sm text-muted-foreground">
          {quota.limit === 0
            ? "Seu plano não inclui disparos de campanha — contrate o complemento Campanhas Extras em Minha Conta."
            : `${quota.used} de ${quota.limit} disparos usados este mês.`}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Nova campanha</CardTitle>
          <CardDescription>
            Funciona apenas com agentes conectados via <b>WhatsApp Evolution</b> (QR Code) — o WhatsApp Oficial
            exige aprovação de modelo de mensagem para disparos em massa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Agente</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={agentId} onChange={(e) => setAgentId(e.target.value)}
              >
                {agents.length === 0 && <option value="">Nenhum agente encontrado</option>}
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}{a.connected ? "" : " (sem Evolution conectado)"}</option>
                ))}
              </select>
              {selectedAgent && !selectedAgent.connected && (
                <p className="text-xs text-amber-500 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Este agente não está conectado via Evolution.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome da campanha</label>
              <input
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                placeholder="Ex: Promoção de julho" value={name} onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">Mensagem</label>
              <div className="flex items-center gap-2">
                {pastMessages.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => setShowPastMessages((v) => !v)} className="h-7 gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Reutilizar anterior
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={handleGenerateMessage} disabled={aiLoading} className="h-7 gap-1.5">
                  {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-purple-500" />}
                  Gerar com IA
                </Button>
              </div>
            </div>

            {showPastMessages && (
              <div className="border border-border rounded-lg divide-y divide-border max-h-48 overflow-y-auto">
                {pastMessages.map((c) => (
                  <button key={c.id} type="button" onClick={() => reuseMessage(c)} className="w-full text-left p-2.5 hover:bg-secondary/40 transition-colors">
                    <div className="text-xs font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.message}</div>
                  </button>
                ))}
              </div>
            )}

            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
              placeholder="Escreva a mensagem (ex: promoção 20% em pizzas até domingo) ou clique em Gerar com IA"
              value={message} onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Sem escrever nada ainda? A IA usa o nome da campanha como ideia. Já tem um rascunho? Ela lapida o que estiver escrito.
              Formatação do WhatsApp: <span className="font-mono">*negrito*</span> e <span className="font-mono">_itálico_</span>.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Imagem (opcional)</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              placeholder="https://... (URL pública da imagem, ex: banner de promoção)"
              value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
            />
            {imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Prévia" className="mt-2 max-h-32 rounded-lg border border-border" onError={(e) => (e.currentTarget.style.display = "none")} />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Botões de resposta rápida (opcional, até 3)</label>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((i) => (
                <input
                  key={i}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs"
                  placeholder={`Botão ${i + 1}`}
                  maxLength={20}
                  value={buttons[i] || ""}
                  onChange={(e) => {
                    const next = [...buttons];
                    next[i] = e.target.value;
                    setButtons(next);
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Até 20 caracteres por botão. {imageUrl ? "Com imagem selecionada, os botões não são enviados juntos — some a imagem se quiser usar botões." : "O cliente toca no botão pra responder na hora."}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium">Lista de contatos</label>
              {savedContacts.length > 0 && (
                <Button size="sm" variant="ghost" onClick={addSavedContactsToList} className="h-7 gap-1.5 text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> Adicionar {savedContacts.length} contato(s) salvo(s)
                </Button>
              )}
            </div>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono min-h-[120px]"
              placeholder={"Um por linha, em qualquer formato — a gente corrige sozinho:\n(11) 99999-8888, Maria\n11 98888-7777\nNúmero internacional? Comece com + ou 00: +44 7911 123456"}
              value={recipientsRaw} onChange={(e) => setRecipientsRaw(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Todo número enviado com sucesso entra automaticamente na sua base de contatos, pra reaproveitar depois.
            </p>
            {parsedRecipients.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-3 text-xs flex-wrap">
                  <span className="flex items-center gap-1 text-emerald-500 font-medium"><CheckCircle2 className="h-3.5 w-3.5" /> {validRecipients.length} prontos pra enviar</span>
                  {invalidRecipients.length > 0 && (
                    <span className="flex items-center gap-1 text-red-400 font-medium"><XCircle className="h-3.5 w-3.5" /> {invalidRecipients.length} com número inválido</span>
                  )}
                  {duplicateCount > 0 && (
                    <span className="text-muted-foreground">{duplicateCount} duplicado(s) ignorado(s)</span>
                  )}
                  <span className="text-muted-foreground ml-auto">Máximo 500 por campanha.</span>
                </div>
                {invalidRecipients.length > 0 && (
                  <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 space-y-0.5 max-h-24 overflow-y-auto">
                    {invalidRecipients.map((r, i) => (
                      <div key={i}>&quot;{r.line}&quot; — {r.reason} (confira o DDD e a quantidade de dígitos)</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Cole os números com DDD — aceita parênteses, traço, espaço ou +55, tanto faz.</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-400 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 shrink-0" /> {error}</p>
          )}

          <Button onClick={handleSend} disabled={sending || validRecipients.length === 0} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Disparar campanha{validRecipients.length > 0 ? ` (${validRecipients.length})` : ""}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma campanha ainda.</p>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => {
                const st = STATUS_LABEL[c.status] ?? STATUS_LABEL.queued;
                const pct = c.total_recipients > 0 ? Math.round(((c.sent_count + c.failed_count) / c.total_recipients) * 100) : 0;
                const isOpen = expandedId === c.id;
                return (
                  <div key={c.id} className="rounded-lg border border-border overflow-hidden">
                    <button onClick={() => toggleExpand(c.id)} className="w-full p-3 text-left hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-medium text-sm truncate">{c.name}</span>
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1.5">
                        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> {c.sent_count} enviados</span>
                        {c.failed_count > 0 && <span className="text-red-400">{c.failed_count} falharam</span>}
                        <span>{c.total_recipients} no total</span>
                        <span className="ml-auto text-brand-400">{isOpen ? "Ocultar" : "Ver número a número"}</span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border bg-secondary/20 p-3">
                        {detailLoading && recipients.length === 0 ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando...</div>
                        ) : (
                          <div className="space-y-1 max-h-64 overflow-y-auto">
                            {recipients.map((r) => {
                              const rst = RECIPIENT_STATUS[r.status] ?? RECIPIENT_STATUS.pending;
                              const Icon = rst.icon;
                              return (
                                <div key={r.id} className="flex items-center gap-2 text-xs py-1">
                                  <Icon className={`h-3.5 w-3.5 shrink-0 ${rst.className} ${r.status === "pending" ? "animate-spin" : ""}`} />
                                  <span className="font-mono">{formatPhoneDisplay(r.phone)}</span>
                                  {r.name && <span className="text-muted-foreground truncate">{r.name}</span>}
                                  <span className={`ml-auto ${rst.className}`}>{rst.label}</span>
                                  {r.error && <span className="text-red-400 truncate max-w-[200px]" title={r.error}>{r.error}</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
