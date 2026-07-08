"use client";
import { useEffect, useState } from "react";
import { Megaphone, Loader2, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { authFetch } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface AgentOption { id: string; name: string; connected: boolean }
interface Campaign {
  id: string; name: string; status: string;
  total_recipients: number; sent_count: number; failed_count: number;
  created_at: string;
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
  const [recipientsRaw, setRecipientsRaw] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [quota, setQuota] = useState<{ used: number; limit: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const recipientCount = recipientsRaw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).length;

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
    // Atualiza progresso das campanhas em andamento a cada 10s.
    const interval = setInterval(loadCampaigns, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const selectedAgent = agents.find((a) => a.id === agentId);

  const handleSend = async () => {
    setError("");
    const recipients = recipientsRaw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
      .map((line) => {
        const [phone, ...rest] = line.split(",");
        return { phone: phone.trim(), name: rest.join(",").trim() || undefined };
      });
    if (!agentId) { setError("Selecione um agente."); return; }
    if (!message.trim()) { setError("Escreva a mensagem."); return; }
    if (recipients.length === 0) { setError("Cole ao menos um número de telefone."); return; }

    setSending(true);
    try {
      const res = await authFetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, name: name || "Campanha", message, imageUrl, recipients }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Não foi possível criar a campanha.");
      setName(""); setMessage(""); setImageUrl(""); setRecipientsRaw("");
      await loadCampaigns();
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
            <label className="text-sm font-medium">Mensagem</label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]"
              placeholder="Escreva a mensagem que será enviada a todos os contatos..."
              value={message} onChange={(e) => setMessage(e.target.value)}
            />
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
            <label className="text-sm font-medium">Lista de contatos</label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono min-h-[120px]"
              placeholder={"Um por linha: telefone com DDD, opcionalmente nome depois de vírgula\n5511999998888, Maria\n5511988887777"}
              value={recipientsRaw} onChange={(e) => setRecipientsRaw(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{recipientCount} contato(s) na lista. Máximo 500 por campanha.</p>
          </div>

          {error && (
            <p className="text-sm text-red-400 flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 shrink-0" /> {error}</p>
          )}

          <Button onClick={handleSend} disabled={sending} className="gap-2">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Disparar campanha
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
                return (
                  <div key={c.id} className="p-3 rounded-lg border border-border">
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
                    </div>
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
