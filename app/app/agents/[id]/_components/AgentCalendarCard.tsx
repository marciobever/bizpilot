"use client";
import { useEffect, useState } from "react";
import { CalendarDays, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { authFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";

type CalendarStatus = {
  override: { status: string; provider?: string } | null;
  account: { status: string; provider?: string } | null;
};

const PROVIDER_LABEL: Record<string, string> = { calcom: "Cal.com", calendly: "Calendly", google: "Google Calendar" };

interface Props { agentId: string; isNew: boolean }

export function AgentCalendarCard({ agentId, isNew }: Props) {
  const { user } = useAuth();
  const [status, setStatus] = useState<CalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [useOwn, setUseOwn] = useState(false);
  const [provider, setProvider] = useState<"calcom" | "calendly" | "google">("calcom");
  const [form, setForm] = useState({ apiKey: "", eventTypeId: "", apiToken: "", schedulingUrl: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (isNew) { setLoading(false); return; }
    authFetch(`/api/agents/${agentId}/calendar`).then((r) => r.json()).then((data: CalendarStatus) => {
      setStatus(data);
      setUseOwn(!!data.override);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [agentId, isNew]);

  const handleSaveManual = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const body: any = { provider };
      if (provider === "calcom") {
        if (!form.apiKey.trim() || !form.eventTypeId.trim()) { setMsg({ ok: false, text: "Informe a API Key e o Event Type ID." }); return; }
        const test = await authFetch("/api/calendar/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiKey: form.apiKey, eventTypeId: form.eventTypeId }) });
        const testData = await test.json();
        if (!testData.success) { setMsg({ ok: false, text: testData.error }); return; }
        body.apiKey = form.apiKey; body.eventTypeId = form.eventTypeId;
      } else {
        if (!form.apiToken.trim() || !form.schedulingUrl.trim()) { setMsg({ ok: false, text: "Informe o token de acesso e o link de agendamento." }); return; }
        const test = await authFetch("/api/calendar/test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiToken: form.apiToken, schedulingUrl: form.schedulingUrl }) });
        const testData = await test.json();
        if (!testData.success) { setMsg({ ok: false, text: testData.error }); return; }
        body.apiToken = form.apiToken; body.schedulingUrl = form.schedulingUrl; body.eventTypeUri = testData.eventTypeUri; body.userUri = testData.userUri;
      }
      await authFetch(`/api/agents/${agentId}/calendar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      setMsg({ ok: true, text: "Calendário deste bot conectado!" });
      setStatus((s) => (s ? { ...s, override: { status: "connected", provider } } : s));
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || "Erro ao salvar." });
    } finally {
      setSaving(false);
    }
  };

  const handleUseAccountDefault = async () => {
    setSaving(true);
    try {
      await authFetch(`/api/agents/${agentId}/calendar`, { method: "DELETE" });
      setStatus((s) => (s ? { ...s, override: null } : s));
      setUseOwn(false);
      setMsg(null);
    } finally {
      setSaving(false);
    }
  };

  const handleConnectGoogle = () => {
    if (!user) return;
    window.location.href = `/api/calendar/google/auth?userId=${user.id}&agentId=${agentId}`;
  };

  if (isNew) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-violet-500" /> Calendário deste bot</CardTitle>
        <CardDescription>Por padrão, todo bot usa o calendário conectado em Integrações. Aqui você pode conectar um diferente só pra este agente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <button type="button" onClick={handleUseAccountDefault} disabled={saving}
                className={`text-left p-3 rounded-lg border transition-all ${!useOwn ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/40" : "border-border bg-background hover:border-muted-foreground/40"}`}>
                <div className="font-medium text-sm mb-1">Usar o calendário da conta</div>
                <div className="text-[11px] text-muted-foreground">
                  {status?.account?.status === "connected"
                    ? `Conectado: ${PROVIDER_LABEL[status.account.provider || ""] || status.account.provider}`
                    : "Nenhum calendário conectado na conta — vá em Integrações."}
                </div>
              </button>
              <button type="button" onClick={() => setUseOwn(true)} disabled={saving}
                className={`text-left p-3 rounded-lg border transition-all ${useOwn ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/40" : "border-border bg-background hover:border-muted-foreground/40"}`}>
                <div className="font-medium text-sm mb-1">Conectar um calendário específico</div>
                <div className="text-[11px] text-muted-foreground">
                  {status?.override?.status === "connected"
                    ? `Conectado: ${PROVIDER_LABEL[status.override.provider || ""] || status.override.provider}`
                    : "Esse bot usa um calendário diferente do padrão da conta."}
                </div>
              </button>
            </div>

            {useOwn && status?.override?.status !== "connected" && (
              <div className="pt-2 border-t border-border space-y-3">
                <select value={provider} onChange={(e) => setProvider(e.target.value as any)}
                  className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="calcom">Cal.com</option>
                  <option value="calendly">Calendly</option>
                  <option value="google">Google Calendar</option>
                </select>

                {provider === "calcom" && (
                  <>
                    <div className="space-y-1.5"><Label className="text-xs">API Key</Label><Input type="password" placeholder="cal_live_..." value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Event Type ID</Label><Input placeholder="123456" value={form.eventTypeId} onChange={(e) => setForm({ ...form, eventTypeId: e.target.value })} /></div>
                    <Button onClick={handleSaveManual} disabled={saving} size="sm">{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Salvar e testar</Button>
                  </>
                )}
                {provider === "calendly" && (
                  <>
                    <div className="space-y-1.5"><Label className="text-xs">Personal Access Token</Label><Input type="password" value={form.apiToken} onChange={(e) => setForm({ ...form, apiToken: e.target.value })} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Link da página de agendamento</Label><Input placeholder="https://calendly.com/seunome/30min" value={form.schedulingUrl} onChange={(e) => setForm({ ...form, schedulingUrl: e.target.value })} /></div>
                    <Button onClick={handleSaveManual} disabled={saving} size="sm">{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Salvar e testar</Button>
                  </>
                )}
                {provider === "google" && (
                  <>
                    <p className="text-[11px] text-muted-foreground">Usa o mesmo app Google já cadastrado em Integrações — só a conta autorizada muda. Você poderá escolher uma conta Google diferente pra este bot.</p>
                    <Button onClick={handleConnectGoogle} size="sm" variant="outline">Conectar com Google</Button>
                  </>
                )}
                {msg && (
                  <div className={`flex gap-2 p-2.5 rounded-lg text-xs ${msg.ok ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"}`}>
                    {msg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                    <span>{msg.text}</span>
                  </div>
                )}
              </div>
            )}

            {useOwn && status?.override?.status === "connected" && (
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-500 border-0">
                  {PROVIDER_LABEL[status.override.provider || ""] || status.override.provider} conectado
                </Badge>
                <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={handleUseAccountDefault} disabled={saving}>Desconectar</Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
