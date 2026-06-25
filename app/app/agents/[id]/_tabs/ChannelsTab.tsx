"use client";
import {
  MessageSquare, QrCode, ShieldCheck, AlertTriangle, CheckCircle2, Copy, Loader2, Info,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface Props {
  agentId: string;
  isNew: boolean;
  whatsappProvider: "evolution" | "meta";
  setWhatsappProvider: (v: "evolution" | "meta") => void;
  waConnected: boolean;
  waQrCode: string;
  waLoading: boolean;
  checkingWa: boolean;
  customInstanceName: string;
  onConnectWhatsapp: (bypass?: boolean) => void;
  onDisconnectWhatsapp: () => void;
  onFetchQrCode: (name: string) => void;
  onSwitchToMeta: () => void;
  metaConnected: boolean;
  metaTesting: boolean;
  metaTestMsg: { ok: boolean; text: string } | null;
  metaPhoneNumberId: string;
  setMetaPhoneNumberId: (v: string) => void;
  metaAccessToken: string;
  setMetaAccessToken: (v: string) => void;
  metaWabaId: string;
  setMetaWabaId: (v: string) => void;
  metaVerifyToken: string;
  metaCostAck: boolean;
  setMetaCostAck: (v: boolean) => void;
  webhookUrl: string;
  onTestMeta: () => void;
  onDisconnectMeta: () => void;
  onCopyToClipboard: (v: string) => void;
}

export function ChannelsTab({
  agentId, isNew, whatsappProvider, setWhatsappProvider,
  waConnected, waQrCode, waLoading, checkingWa, customInstanceName,
  onConnectWhatsapp, onDisconnectWhatsapp, onFetchQrCode, onSwitchToMeta,
  metaConnected, metaTesting, metaTestMsg,
  metaPhoneNumberId, setMetaPhoneNumberId,
  metaAccessToken, setMetaAccessToken,
  metaWabaId, setMetaWabaId,
  metaVerifyToken, metaCostAck, setMetaCostAck,
  webhookUrl, onTestMeta, onDisconnectMeta, onCopyToClipboard,
}: Props) {
  const instanceLabel = customInstanceName
    ? `agent_${agentId}_${customInstanceName}`
    : `agent_${agentId}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conexão com Canais</CardTitle>
        <CardDescription>Onde este agente vai atender? Gerencie as integrações oficiais ou extraoficiais do seu bot.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <div className="font-medium">WhatsApp</div>
              <div className="text-xs text-muted-foreground mt-0.5">Escolha como este agente vai se conectar ao WhatsApp.</div>
            </div>
          </div>

          <div className="p-4 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <button type="button" onClick={() => setWhatsappProvider("evolution")} className={`text-left p-3 rounded-lg border transition-all ${whatsappProvider === "evolution" ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/40" : "border-border bg-background hover:border-muted-foreground/40"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><QrCode className="h-4 w-4 text-emerald-500" /><span className="font-medium text-sm">Evolution API</span></div>
                  <Badge variant="outline" className="text-[10px] h-4 bg-emerald-500/10 text-emerald-500 border-0">Gratuito</Badge>
                </div>
                <ul className="text-[11px] text-muted-foreground space-y-1">
                  <li className="text-emerald-500/90">+ Conecta na hora via QR Code</li>
                  <li className="text-emerald-500/90">+ Sem custo e sem aprovação</li>
                  <li className="text-amber-500/90">− Não-oficial: risco de bloqueio</li>
                </ul>
              </button>

              <button type="button" onClick={onSwitchToMeta} className={`text-left p-3 rounded-lg border transition-all ${whatsappProvider === "meta" ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/40" : "border-border bg-background hover:border-muted-foreground/40"}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-500" /><span className="font-medium text-sm">WhatsApp Oficial</span></div>
                  <Badge variant="outline" className="text-[10px] h-4 bg-brand-500/10 text-brand-500 border-0">Meta API</Badge>
                </div>
                <ul className="text-[11px] text-muted-foreground space-y-1">
                  <li className="text-emerald-500/90">+ Oficial, estável e sem risco de ban</li>
                  <li className="text-emerald-500/90">+ Selo verificado e escalável</li>
                  <li className="text-amber-500/90">− Exige conta Meta + cobrança por conversa</li>
                </ul>
              </button>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-secondary/40 border border-border">
              <Info className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Qual escolher?</strong> Para testes rápidos ou sem aprovação Meta, use a <strong>Evolution</strong>. Para operação contínua e profissional (alto volume, marca verificada), prefira o <strong>WhatsApp Oficial da Meta</strong>.
              </div>
            </div>

            {whatsappProvider === "evolution" && (
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${waConnected ? "bg-emerald-500/10" : "bg-secondary"}`}>
                      <QrCode className={`h-4 w-4 ${waConnected ? "text-emerald-500" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-medium text-sm">Conexão via QR Code</div>
                        {waConnected ? (
                          <Badge variant="outline" className="text-[10px] h-4 bg-muted text-emerald-500 border-0">Conectado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] h-4 bg-muted text-muted-foreground border-0">Desconectado</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {waConnected ? `Instância '${instanceLabel}' ativa e recebendo mensagens.` : "Escaneie o QR Code com o celular que vai atender."}
                      </div>
                    </div>
                  </div>
                  {waConnected ? (
                    <Button onClick={onDisconnectWhatsapp} variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 border-destructive/20" disabled={waLoading}>
                      {waLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Desconectar"}
                    </Button>
                  ) : (
                    <Button onClick={() => onConnectWhatsapp()} variant="outline" size="sm" disabled={waLoading || isNew}>
                      {waLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar via QR"}
                    </Button>
                  )}
                </div>

                {waQrCode && !waConnected && (
                  <div className="mt-6 pt-4 border-t border-border flex flex-col items-center justify-center">
                    <p className="text-sm font-medium mb-4">Escaneie o QR Code com seu WhatsApp</p>
                    <div className="bg-white p-2 rounded-xl mb-4">
                      <img src={waQrCode.startsWith("data:image") ? waQrCode : `data:image/png;base64,${waQrCode}`} alt="WhatsApp QR Code" className="w-48 h-48" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => { onFetchQrCode(instanceLabel); }} disabled={waLoading}>
                        {waLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Atualizar QR
                      </Button>
                      <Button variant="ghost" onClick={() => onConnectWhatsapp(false)}>Cancelar</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {whatsappProvider === "meta" && (
              <div className="pt-2 border-t border-border space-y-5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ShieldCheck className="h-4 w-4 text-brand-500" />
                    <span className="font-medium text-sm">WhatsApp Cloud API</span>
                    {metaConnected ? (
                      <Badge variant="outline" className="text-[10px] h-4 bg-muted text-emerald-500 border-0">Conectado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] h-4 bg-muted text-muted-foreground border-0">Não conectado</Badge>
                    )}
                  </div>
                  {metaConnected && (
                    <Button onClick={onDisconnectMeta} variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-7">Desconectar</Button>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                      <strong className="text-foreground">Atenção: a Meta cobra por mensagem/conversa.</strong> Toda conversa iniciada fora da janela gratuita de 24h é cobrada diretamente na sua conta Meta Business.
                    </div>
                  </div>
                  <label className="flex items-center gap-2 mt-3 text-xs cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={metaCostAck} onChange={(e) => setMetaCostAck(e.target.checked)} />
                    Entendi e estou de acordo com a cobrança por mensagem feita pela Meta.
                  </label>
                </div>

                <div className={`space-y-3 ${!metaCostAck ? "opacity-50 pointer-events-none" : ""}`}>
                  <div className="text-xs font-semibold text-foreground">1. Cole as credenciais do seu app na Meta</div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone Number ID</Label>
                    <Input value={metaPhoneNumberId} onChange={(e) => setMetaPhoneNumberId(e.target.value)} placeholder="Ex: 109987654321000" disabled={!metaCostAck} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Token de Acesso Permanente</Label>
                    <Input type="password" value={metaAccessToken} onChange={(e) => setMetaAccessToken(e.target.value)} placeholder="EAAG..." disabled={!metaCostAck} />
                    <p className="text-[10px] text-muted-foreground">Gere um token permanente em Meta Business → Usuários do Sistema.</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">WhatsApp Business Account ID (opcional)</Label>
                    <Input value={metaWabaId} onChange={(e) => setMetaWabaId(e.target.value)} placeholder="Ex: 220712345678900" disabled={!metaCostAck} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-semibold text-foreground">2. Cadastre o webhook no painel da Meta</div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">URL de Callback</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                      <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => onCopyToClipboard(webhookUrl)}><Copy className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Token de Verificação</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={metaVerifyToken} className="font-mono text-xs" />
                      <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => onCopyToClipboard(metaVerifyToken)}><Copy className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground">No painel da Meta, em <strong>WhatsApp → Configuration → Webhook</strong>, cole a URL e o token acima e assine o campo <strong>messages</strong>.</p>
                </div>

                {metaTestMsg && (
                  <div className={`flex gap-2 p-2.5 rounded-lg text-xs ${metaTestMsg.ok ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"}`}>
                    {metaTestMsg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                    <span>{metaTestMsg.text}</span>
                  </div>
                )}

                <Button onClick={onTestMeta} disabled={metaTesting || isNew || !metaCostAck} className="w-full">
                  {metaTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Testar e Conectar
                </Button>
                {isNew && <p className="text-[10px] text-muted-foreground text-center">Salve o agente antes de conectar um canal.</p>}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 p-4 border border-border bg-card rounded-lg relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500 rounded-l-lg" />
          <div className="flex items-center gap-4 ml-2 min-w-0">
            <div className="h-10 w-10 bg-pink-500/10 rounded-lg flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5 text-pink-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-medium text-foreground">Instagram Direct</div>
                <Badge variant="outline" className="text-[10px] h-4 bg-brand-500/10 text-brand-500 border-0">Meta Graph API</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Responda DMs, automações em Stories e Posts no Instagram.</div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="hidden sm:inline-flex shrink-0">Conectar Instagram</Button>
        </div>

        <div className="flex items-center justify-between gap-3 p-4 border border-border bg-card rounded-lg relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-lg" />
          <div className="flex items-center gap-4 ml-2 min-w-0">
            <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
              <MessageSquare className="h-5 w-5 text-blue-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-medium">Facebook Messenger</div>
                <Badge variant="outline" className="text-[10px] h-4 bg-brand-500/10 text-brand-500 border-0">Meta Graph API</Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Conecte com sua página para atender inbox automaticamente.</div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="hidden sm:inline-flex shrink-0">Conectar Página</Button>
        </div>
      </CardContent>
    </Card>
  );
}
