"use client";
import { ArrowLeft, Loader2, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
}

export function SetupWhatsappView({
  agentId, agentName, customInstanceName,
  waConnected, checkingWa, waLoading, waQrCode,
  onConnectWhatsapp, onFetchQrCode, onCancelQr,
}: Props) {
  const navigate = useRouter();
  const instanceLabel = customInstanceName ? `agent_${agentId}_${customInstanceName}` : `agent_${agentId}`;

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 py-4">
        <Button variant="ghost" size="icon" onClick={() => navigate.push("/app/agents")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configurar Canal WhatsApp (Passo 2 de 2)</h2>
          <p className="text-muted-foreground text-sm">Vincule um número de celular ao agente {agentName}.</p>
        </div>
      </div>

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
    </div>
  );
}
