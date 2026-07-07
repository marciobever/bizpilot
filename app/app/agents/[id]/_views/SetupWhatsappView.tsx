"use client";
import { useState } from "react";
import { ArrowLeft, Loader2, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface Props {
  agentId: string;
  agentName: string;
  customInstanceName: string;
  waConnected: boolean;
  checkingWa: boolean;
  waLoading: boolean;
  waQrCode: string;
  onConnectWhatsapp: (bypass?: boolean) => void;
  onFetchQrCode: (name: string) => void;
  onCancelQr: () => void;
  onChooseMeta: () => void;
}

export function SetupWhatsappView({
  agentId, agentName, customInstanceName,
  waConnected, checkingWa, waLoading, waQrCode,
  onConnectWhatsapp, onFetchQrCode, onCancelQr, onChooseMeta,
}: Props) {
  const navigate = useRouter();
  const [choice, setChoice] = useState<"evolution" | null>(null);
  const instanceLabel = customInstanceName ? `agent_${agentId}_${customInstanceName}` : `agent_${agentId}`;
  const showChooser = !waConnected && choice === null;

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 py-4">
        <Button variant="ghost" size="icon" onClick={() => (showChooser ? navigate.push("/app/agents") : setChoice(null))}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Conectar WhatsApp (Passo 2 de 2)</h2>
          <p className="text-muted-foreground text-sm">
            {showChooser
              ? `Escolha como o agente ${agentName} vai se conectar ao WhatsApp.`
              : `Vincule um número de celular ao agente ${agentName}.`}
          </p>
        </div>
      </div>

      {showChooser && (
        <Card className="border border-border bg-card shadow-lg">
          <CardHeader>
            <CardTitle>Como você quer conectar?</CardTitle>
            <CardDescription>Existem duas formas de ligar seu robô de IA ao WhatsApp. Você pode trocar depois na aba Canais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <button type="button" onClick={() => setChoice("evolution")} className="text-left p-4 rounded-lg border border-border bg-background hover:border-brand-500 hover:bg-brand-500/5 transition-all">
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

              <button type="button" onClick={onChooseMeta} className="text-left p-4 rounded-lg border border-border bg-background hover:border-brand-500 hover:bg-brand-500/5 transition-all">
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

            <div className="p-3 rounded-lg bg-secondary/40 border border-border text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Qual escolher?</strong> Para testes rápidos ou sem aprovação Meta, use a <strong>Evolution</strong>. Para operação contínua e profissional (alto volume, marca verificada), prefira o <strong>WhatsApp Oficial da Meta</strong>.
            </div>

            <div className="pt-4 border-t border-border flex justify-between text-xs text-muted-foreground">
              <p>Opcional: Você também pode realizar as configurações avançadas primeiro.</p>
              <button className="text-brand-400 hover:text-brand-300 font-medium" onClick={() => navigate.push(`/app/agents/${agentId}`)}>
                Ir para Configurações Avançadas &gt;
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showChooser && (
        <Card className="border border-border bg-card shadow-lg">
          <CardHeader>
            <CardTitle>Conexão do Agente com o WhatsApp</CardTitle>
            <CardDescription>Para que seu robô de IA consiga enviar e responder mensagens do mundo real, ele precisa estar conectado a uma instância de WhatsApp.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-lg text-sm text-brand-200">
              <div className="font-semibold mb-1">O que é uma Instância?</div>
              Uma instância é o canal seguro que conecta o seu número de WhatsApp à automação do agente. Ela atua como a voz do seu bot.
            </div>

            {!waConnected && !checkingWa && (
              <div className="space-y-4">
                <div className="p-3 bg-secondary/30 border border-border rounded-lg text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Identificador da instância:</span> {instanceLabel}
                  <p className="mt-1">Gerado automaticamente a partir do nome do agente e vinculado à sua conta.</p>
                </div>
                <Button className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onConnectWhatsapp(true)} disabled={waLoading}>
                  {waLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                  Gerar QR Code de Conexão
                </Button>
              </div>
            )}

            {checkingWa && !waConnected && (
              <div className="flex flex-col items-center justify-center py-6 border border-dashed border-border rounded-lg bg-secondary/10">
                {waLoading ? (
                  <div className="flex flex-col items-center justify-center p-8">
                    <Loader2 className="h-10 w-10 text-brand-500 animate-spin mb-4" />
                    <p className="text-sm font-medium">Gerando QR Code...</p>
                  </div>
                ) : waQrCode ? (
                  <div className="flex flex-col items-center justify-center text-center px-4">
                    <p className="text-sm font-semibold mb-4">Escaneie o QR Code abaixo com o WhatsApp do seu celular</p>
                    <div className="bg-white p-3 rounded-2xl mb-4 border shadow-sm">
                      <img
                        src={waQrCode.startsWith("data:image") ? waQrCode : `data:image/png;base64,${waQrCode}`}
                        alt="WhatsApp QR Code"
                        className="w-56 h-56"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground max-w-sm mb-6">
                      Abra o WhatsApp no seu smartphone, vá em <b>Aparelhos Conectados</b> &gt; <b>Conectar Aparelho</b> e mire a câmera no QR Code.
                    </p>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" onClick={() => onFetchQrCode(instanceLabel)} disabled={waLoading}>Atualizar QR Code</Button>
                      <Button variant="ghost" size="sm" onClick={onCancelQr}>Alterar Nome/Voltar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 text-brand-500 animate-spin mb-3" />
                    <p className="text-sm">Buscando código QR...</p>
                  </div>
                )}
              </div>
            )}

            {waConnected && (
              <div className="flex flex-col items-center justify-center text-center py-8 space-y-4">
                <div className="h-16 w-16 bg-emerald-500/15 rounded-full flex items-center justify-center text-emerald-500">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold">WhatsApp Conectado com Sucesso!</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                    A instância de WhatsApp está ativa e o agente {agentName} está pronto para interagir.
                  </p>
                </div>
                <Button className="bg-brand-600 hover:bg-brand-700 text-white w-full max-w-xs" onClick={() => navigate.push(`/app/agents/${agentId}`)}>
                  Ir para Painel do Agente 🎉
                </Button>
              </div>
            )}

            {!waConnected && (
              <div className="pt-6 border-t border-border flex justify-between text-xs text-muted-foreground">
                <p>Opcional: Você também pode realizar as configurações avançadas primeiro.</p>
                <button className="text-brand-400 hover:text-brand-300 font-medium" onClick={() => navigate.push(`/app/agents/${agentId}`)}>
                  Ir para Configurações Avançadas &gt;
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
