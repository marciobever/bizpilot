"use client";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

type AgentCapabilities = {
  dataRecords?: boolean;
  affiliate?: boolean;
  commerce?: boolean;
  handoff?: boolean;
};

type Preset = {
  id: string;
  label: string;
  description: string;
  type: string;
  capabilities: AgentCapabilities;
};

const PRESETS: Preset[] = [
  {
    id: "atendimento",
    label: "Atendimento ao Cliente",
    description: "Pagamentos, agendamentos e repasse para humano.",
    type: "atendimento",
    capabilities: { commerce: true, handoff: true, dataRecords: false, affiliate: false },
  },
  {
    id: "assistente",
    label: "Assistente Pessoal",
    description: "Lembra dados do cliente. Personal trainer, coach, financeiro, babá...",
    type: "assistente",
    capabilities: { dataRecords: true, commerce: false, handoff: false, affiliate: false },
  },
  {
    id: "afiliado",
    label: "Afiliado Shopee",
    description: "Busca produtos e publica em grupos. Requer integração Shopee.",
    type: "afiliado",
    capabilities: { affiliate: true, dataRecords: true, commerce: false, handoff: false },
  },
  {
    id: "personalizado",
    label: "Personalizado",
    description: "Escolha manualmente quais capacidades ativar.",
    type: "personalizado",
    capabilities: {},
  },
];

interface Props {
  agentName: string;
  setAgentName: (v: string) => void;
  niche: string;
  setNiche: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  capabilities: AgentCapabilities;
  setCapabilities: (v: AgentCapabilities) => void;
  setAgentType: (v: string) => void;
  saving: boolean;
  onCreateAndContinue: () => void;
}

export function NewAgentView({
  agentName, setAgentName, niche, setNiche, role, setRole,
  capabilities, setCapabilities, setAgentType,
  saving, onCreateAndContinue,
}: Props) {
  const navigate = useRouter();

  const selectedPreset = PRESETS.find((p) => {
    if (p.id === "personalizado") return false;
    return (
      p.capabilities.dataRecords === capabilities.dataRecords &&
      p.capabilities.affiliate === capabilities.affiliate &&
      p.capabilities.commerce === capabilities.commerce &&
      p.capabilities.handoff === capabilities.handoff
    );
  })?.id ?? (Object.keys(capabilities).length > 0 ? "personalizado" : null);

  const handleSelectPreset = (preset: Preset) => {
    setAgentType(preset.type);
    if (preset.id === "personalizado") {
      setCapabilities({ dataRecords: false, affiliate: false, commerce: false, handoff: false });
    } else {
      setCapabilities(preset.capabilities);
    }
  };

  const toggleCap = (key: keyof AgentCapabilities) => {
    setCapabilities({ ...capabilities, [key]: !capabilities[key] });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 py-4">
        <Button variant="ghost" size="icon" onClick={() => navigate.push("/app/agents")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Criação de Agente (Passo 1 de 2)</h2>
          <p className="text-muted-foreground text-sm">Defina a identidade básica do seu novo robô.</p>
        </div>
      </div>

      <Card className="border border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle>Identidade do Agente</CardTitle>
          <CardDescription>Como a Inteligência Artificial vai se apresentar e se comportar inicialmente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="wiz-name">Nome do Agente</Label>
            <Input id="wiz-name" placeholder="Ex: Lucas, Sofia, Amanda..." value={agentName} onChange={(e) => setAgentName(e.target.value)} />
            <p className="text-xs text-muted-foreground">O nome que os clientes verão nas conversas.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wiz-niche">Nicho de Atuação / Segmento</Label>
            <Input id="wiz-niche" placeholder="Ex: Imobiliária, Clínica Odontológica, SaaS..." value={niche} onChange={(e) => setNiche(e.target.value)} />
            <p className="text-xs text-muted-foreground">O nicho de atuação ajuda a IA a compreender o contexto do seu negócio.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wiz-role">Cargo ou Função (Opcional)</Label>
            <Input id="wiz-role" placeholder="Ex: Especialista em Vendas, Suporte ao Cliente..." value={role} onChange={(e) => setRole(e.target.value)} />
          </div>

          <div className="space-y-3">
            <Label>Propósito do Agente</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    selectedPreset === preset.id
                      ? "border-brand-500 bg-brand-500/5"
                      : "border-border bg-card hover:border-brand-500/40"
                  }`}
                >
                  <p className="font-medium text-sm">{preset.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{preset.description}</p>
                </button>
              ))}
            </div>

            {selectedPreset === "personalizado" && (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-muted-foreground font-medium">Selecione as capacidades:</p>
                {(
                  [
                    { key: "dataRecords" as const, label: "Registra dados do usuário" },
                    { key: "affiliate" as const, label: "Afiliados Shopee" },
                    { key: "commerce" as const, label: "Pagamentos e agendamento" },
                    { key: "handoff" as const, label: "Transferência para humano" },
                  ] as const
                ).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-border"
                      checked={!!capabilities[key]}
                      onChange={() => toggleCap(key)}
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border flex justify-end">
            <Button
              className="gap-2 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={onCreateAndContinue}
              disabled={saving || !selectedPreset}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Criar Agente e Configurar WhatsApp ➔
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
