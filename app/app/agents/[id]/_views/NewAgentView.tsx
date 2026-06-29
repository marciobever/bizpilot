"use client";
import { useState } from "react";
import { ArrowLeft, ChevronLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { BUSINESS_GROUPS, findBusinessType } from "../_data/businessTypes";
import type { AgentCapabilities } from "../_data/businessTypes";

const CAP_LABELS: { key: keyof AgentCapabilities; label: string }[] = [
  { key: "dataRecords", label: "Registra dados do usuário" },
  { key: "affiliate",   label: "Afiliados (Shopee, ML, etc.)" },
  { key: "commerce",    label: "Pagamentos e agendamentos" },
  { key: "handoff",     label: "Transferência para humano" },
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
  setTone?: (v: string) => void;
  setSystemPrompt?: (v: string) => void;
  setLimitations?: (v: string[]) => void;
  saving: boolean;
  onCreateAndContinue: () => void;
}

export function NewAgentView({
  agentName, setAgentName,
  niche, setNiche,
  role, setRole,
  capabilities, setCapabilities,
  setAgentType,
  setTone, setSystemPrompt, setLimitations,
  saving, onCreateAndContinue,
}: Props) {
  const navigate = useRouter();
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId]   = useState<string | null>(null);

  const isPersonalizado = selectedGroupId === "personalizado";
  const hasSelection = selectedTypeId !== null || (isPersonalizado && Object.keys(capabilities).length > 0);

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedTypeId(null);
    if (groupId === "personalizado") {
      setAgentType("personalizado");
      setCapabilities({ dataRecords: false, affiliate: false, commerce: false, handoff: false });
    }
  };

  const handleSelectType = (typeId: string) => {
    const t = findBusinessType(typeId);
    if (!t) return;
    setSelectedTypeId(typeId);
    setAgentType(t.agentType);
    setCapabilities(t.capabilities);
    setNiche(t.niche);
    setRole(t.role);
    setTone?.(t.tone);
    setSystemPrompt?.(t.systemPrompt);
    setLimitations?.(t.limitations);
  };

  const toggleCap = (key: keyof AgentCapabilities) =>
    setCapabilities({ ...capabilities, [key]: !capabilities[key] });

  const activeGroup = BUSINESS_GROUPS.find((g) => g.id === selectedGroupId);

  // ── Step 2: tipos dentro de um grupo ──────────────────────────────────────
  if (selectedGroupId && !isPersonalizado) {
    return (
      <div className="max-w-xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-4 py-4">
          <Button variant="ghost" size="icon" onClick={() => navigate.push("/app/agents")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Novo Agente</h2>
            <p className="text-muted-foreground text-sm">Passo 1 de 2 — Tipo de negócio</p>
          </div>
        </div>

        <Card className="border border-border bg-card shadow-lg">
          <CardHeader>
            <button
              type="button"
              onClick={() => setSelectedGroupId(null)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              <ChevronLeft className="h-4 w-4" />
              {activeGroup?.emoji} {activeGroup?.label}
            </button>
            <CardTitle className="mt-2">Qual é o seu negócio?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-2">
              {activeGroup?.types.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => handleSelectType(type.id)}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    selectedTypeId === type.id
                      ? "border-brand-500 bg-brand-500/5"
                      : "border-border bg-card hover:border-brand-500/40"
                  }`}
                >
                  <p className="font-medium text-sm">{type.label}</p>
                </button>
              ))}
            </div>

            {selectedTypeId && (
              <IdentityForm
                agentName={agentName} setAgentName={setAgentName}
                niche={niche} setNiche={setNiche}
                role={role} setRole={setRole}
              />
            )}

            <div className="pt-4 border-t border-border flex justify-end">
              <Button
                className="gap-2 bg-brand-600 hover:bg-brand-700 text-white"
                onClick={onCreateAndContinue}
                disabled={saving || !selectedTypeId || !agentName.trim()}
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

  // ── Step 1: seleção de grupo / personalizado ───────────────────────────────
  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 py-4">
        <Button variant="ghost" size="icon" onClick={() => navigate.push("/app/agents")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Novo Agente</h2>
          <p className="text-muted-foreground text-sm">Passo 1 de 2 — Tipo de negócio</p>
        </div>
      </div>

      <Card className="border border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle>Qual é o tipo do seu negócio?</CardTitle>
          <CardDescription>
            Selecione para configurar automaticamente o agente para o seu setor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-2">
            {BUSINESS_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => handleSelectGroup(group.id)}
                className="text-left rounded-lg border border-border bg-card hover:border-brand-500/40 p-3 transition-colors"
              >
                <p className="text-xl mb-1">{group.emoji}</p>
                <p className="font-medium text-sm leading-tight">{group.label}</p>
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleSelectGroup("personalizado")}
              className={`text-left rounded-lg border p-3 transition-colors ${
                isPersonalizado
                  ? "border-brand-500 bg-brand-500/5"
                  : "border-border bg-card hover:border-brand-500/40"
              }`}
            >
              <p className="text-xl mb-1">⚙️</p>
              <p className="font-medium text-sm leading-tight">Personalizado</p>
            </button>
          </div>

          {isPersonalizado && (
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Capacidades:</p>
                {CAP_LABELS.map(({ key, label }) => (
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

              <IdentityForm
                agentName={agentName} setAgentName={setAgentName}
                niche={niche} setNiche={setNiche}
                role={role} setRole={setRole}
              />

              <div className="pt-4 border-t border-border flex justify-end">
                <Button
                  className="gap-2 bg-brand-600 hover:bg-brand-700 text-white"
                  onClick={onCreateAndContinue}
                  disabled={saving || !agentName.trim()}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Criar Agente e Configurar WhatsApp ➔
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IdentityForm({
  agentName, setAgentName, niche, setNiche, role, setRole,
}: {
  agentName: string; setAgentName: (v: string) => void;
  niche: string; setNiche: (v: string) => void;
  role: string; setRole: (v: string) => void;
}) {
  return (
    <div className="space-y-4 pt-2 border-t border-border">
      <p className="text-sm font-medium text-foreground">Identidade do agente</p>
      <div className="space-y-2">
        <Label htmlFor="wiz-name">Nome do Agente *</Label>
        <Input
          id="wiz-name"
          placeholder="Ex: Lucas, Sofia, Amanda..."
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">O nome que os clientes verão nas conversas.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="wiz-niche">Nicho / Segmento</Label>
        <Input
          id="wiz-niche"
          placeholder="Ex: Salão de Beleza, Restaurante..."
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wiz-role">Cargo / Função (Opcional)</Label>
        <Input
          id="wiz-role"
          placeholder="Ex: Atendente Virtual, Assistente de Vendas..."
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </div>
    </div>
  );
}
