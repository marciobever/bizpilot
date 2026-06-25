"use client";
import { Wand2, Loader2, Zap, Puzzle, Plus, X, ShieldAlert, Info } from "lucide-react";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Textarea";
import { PROMPT_TEMPLATES } from "@/lib/agentTemplates";
import type { PromptTemplate } from "@/lib/agentTemplates";

interface Props {
  systemPrompt: string;
  setSystemPrompt: (v: string) => void;
  limitations: string[];
  setLimitations: (v: string[]) => void;
  newLimitation: string;
  setNewLimitation: (v: string) => void;
  showTemplates: boolean;
  setShowTemplates: (v: boolean) => void;
  showInstructionsAI: boolean;
  setShowInstructionsAI: (v: boolean) => void;
  instructionsAIDescription: string;
  setInstructionsAIDescription: (v: string) => void;
  instructionsAILoading: boolean;
  onAutoComplete: () => void;
  onGenerateInstructions: () => void;
  onApplyTemplate: (tpl: PromptTemplate) => void;
}

export function InstructionsTab({
  systemPrompt, setSystemPrompt, limitations, setLimitations, newLimitation, setNewLimitation,
  showTemplates, setShowTemplates, showInstructionsAI, setShowInstructionsAI,
  instructionsAIDescription, setInstructionsAIDescription, instructionsAILoading,
  onAutoComplete, onGenerateInstructions, onApplyTemplate,
}: Props) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Instruções do Agente
            <HelpTooltip text="É aqui que você define a personalidade e o roteiro do bot. Pense como se fosse o treinamento de um funcionário: o que ele pode oferecer, como deve se apresentar e o que nunca deve fazer." />
          </CardTitle>
          <CardDescription>O núcleo do comportamento — o que o agente deve e não deve fazer. Quanto mais específico, melhor.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setShowTemplates(!showTemplates); setShowInstructionsAI(false); }} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors ${showTemplates ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-border bg-card hover:border-brand-500/40"}`}>
              <Puzzle className="h-3.5 w-3.5" /> Templates
            </button>
            <button type="button" onClick={() => { setShowInstructionsAI(!showInstructionsAI); setShowTemplates(false); }} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors ${showInstructionsAI ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-border bg-card hover:border-brand-500/40"}`}>
              <Wand2 className="h-3.5 w-3.5" /> Gerar com IA
            </button>
            <button type="button" onClick={onAutoComplete} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs transition-colors hover:border-brand-500/40">
              <Zap className="h-3.5 w-3.5" /> Auto-completar
            </button>
          </div>

          {showTemplates && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 rounded-lg border border-border bg-secondary/20 p-3">
              {PROMPT_TEMPLATES.map((tpl) => (
                <button key={tpl.id} type="button" onClick={() => onApplyTemplate(tpl)} className="text-left p-3 rounded-lg border border-border bg-card hover:border-brand-500 hover:bg-brand-500/5 transition-all group">
                  <div className="text-lg mb-1">{tpl.emoji}</div>
                  <div className="font-medium text-sm group-hover:text-brand-300 transition-colors">{tpl.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{tpl.description}</div>
                </button>
              ))}
              <button type="button" onClick={() => { setSystemPrompt(""); setShowTemplates(false); }} className="text-left p-3 rounded-lg border border-dashed border-border bg-background hover:border-muted-foreground/40 transition-all">
                <div className="text-lg mb-1">✏️</div>
                <div className="font-medium text-sm">Escrever do zero</div>
                <div className="text-xs text-muted-foreground mt-0.5">Sem modelo, controle total.</div>
              </button>
            </div>
          )}

          {showInstructionsAI && (
            <div className="flex flex-col sm:flex-row gap-2 rounded-lg border border-border bg-secondary/20 p-3">
              <Textarea
                className="min-h-[60px] sm:min-h-0"
                placeholder="Descreva o que o bot faz (ex: tirar dúvidas sobre planos, agendar consultas)…"
                value={instructionsAIDescription}
                onChange={(e) => setInstructionsAIDescription(e.target.value)}
                disabled={instructionsAILoading}
              />
              <Button size="sm" className="shrink-0 gap-1.5" onClick={onGenerateInstructions} disabled={instructionsAILoading || !instructionsAIDescription.trim()}>
                {instructionsAILoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Gerar
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="prompt">Instruções do Bot</Label>
              <span className="text-xs text-muted-foreground">{systemPrompt.length} caracteres</span>
            </div>
            <Textarea
              id="prompt"
              className="min-h-[280px] font-mono text-sm leading-relaxed"
              placeholder={`Você é {nome}, atendente de {empresa}.\n\n=== SUA MISSÃO ===\n...\n\n=== COMO SE COMUNICAR ===\n...\n\n=== O QUE NUNCA FAZER ===\n...`}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
            <div className="flex gap-2 p-3 rounded-lg bg-secondary/20 border border-border">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Dicas:</strong> seja específico sobre o que o bot DEVE e NÃO DEVE fazer; organize com seções <code className="bg-secondary px-1 py-0.5 rounded">===</code>.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Limites e Regras
            <HelpTooltip text="Barreiras que o bot nunca ultrapassa. Ex: 'Nunca dar desconto acima de 10%', 'Nunca citar concorrentes', 'Sempre transferir para humano se o cliente pedir reembolso'." />
          </CardTitle>
          <CardDescription>Regras estritas que protegem sua empresa de respostas fora do escopo ou invenções do bot.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Nunca passar o CNPJ da empresa"
              value={newLimitation}
              onChange={(e) => setNewLimitation(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (newLimitation.trim()) { setLimitations([...limitations, newLimitation.trim()]); setNewLimitation(""); }
                }
              }}
            />
            <Button variant="secondary" className="shrink-0 gap-1.5" onClick={() => { if (newLimitation.trim()) { setLimitations([...limitations, newLimitation.trim()]); setNewLimitation(""); } }}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
          {limitations.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {limitations.map((limit, idx) => (
                <Badge key={idx} variant="secondary" className="pl-2.5 pr-1.5 py-1.5 flex items-center gap-1.5 max-w-full font-normal">
                  <ShieldAlert className="h-3 w-3 text-brand-500 shrink-0" />
                  <span className="truncate">{limit}</span>
                  <button onClick={() => setLimitations(limitations.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive shrink-0">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4 border rounded-md border-dashed">Nenhuma regra definida ainda.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
