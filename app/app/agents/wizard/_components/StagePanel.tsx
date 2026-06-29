"use client";
import { Send, Loader2, Wand2, Check, SkipForward, Sparkles, Pencil, RefreshCw, Lock, Plus, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";
import { SAFETY_RULES_DISPLAY } from "@/lib/agentTemplates";
import type { Stage } from "../_hooks/useWizardFlow";
import type { Sector, AgentFunction } from "@/lib/agentTemplates";

import { BUSINESS_GROUPS } from "../../[id]/_data/businessTypes";
import type { BusinessGroup } from "../../[id]/_data/businessTypes";

interface Props {
  stage: Stage;
  customMode: boolean; setCustomMode: (v: boolean) => void;
  draftPurpose: string; setDraftPurpose: (v: string) => void;
  selectedSector: Sector | null;
  selectedFunctions: string[];
  draftName: string; setDraftName: (v: string) => void;
  draftNiche: string; setDraftNiche: (v: string) => void;
  greetingOptions: string[];
  loadingGreetings: boolean;
  greetingError: string;
  writingOwn: boolean; setWritingOwn: (v: boolean) => void;
  draftGreeting: string; setDraftGreeting: (v: string) => void;
  limitationSuggestions: string[];
  selectedLimitations: string[];
  draftCustomRule: string; setDraftCustomRule: (v: string) => void;
  customFunctions: AgentFunction[];
  draftCustomFunction: string; setDraftCustomFunction: (v: string) => void;
  generatingFunction: boolean;
  functionGenError: string;
  addCustomFunction: () => void;
  removeCustomFunction: (id: string) => void;
  greeting: string; setGreeting: (v: string) => void;
  systemPrompt: string; setSystemPrompt: (v: string) => void;
  agentName: string; niche: string; role: string; tone: string;
  isCustom: boolean; creating: boolean;
  SECTORS: Sector[];
  CUSTOM_SECTOR: Sector;
  TONE_OPTIONS: string[];
  functionLabels: () => string[];
  selectedGroupId: string | null;
  activeGroup: BusinessGroup | null;
  groupSectors: Sector[];
  outroDraftGroup: string; setOutroDraftGroup: (v: string) => void;
  selectGroup: (id: string) => void;
  selectSector: (s: Sector) => void;
  toggleFunction: (id: string) => void;
  confirmFunctions: () => void;
  submitCustom: () => void;
  submitName: () => void;
  submitNiche: () => void;
  selectTone: (t: string) => void;
  generateGreetings: () => void;
  pickGreeting: (opt: string) => void;
  confirmOwnGreeting: () => void;
  skipGreeting: () => void;
  toggleLimitation: (rule: string) => void;
  addCustomRule: () => void;
  confirmLimitations: () => void;
  handleCreate: () => void;
}

export function StagePanel(props: Props) {
  const {
    stage, customMode, setCustomMode, draftPurpose, setDraftPurpose,
    selectedSector, selectedFunctions, draftName, setDraftName, draftNiche, setDraftNiche,
    greetingOptions, loadingGreetings, greetingError, writingOwn, setWritingOwn, draftGreeting, setDraftGreeting,
    limitationSuggestions, selectedLimitations, draftCustomRule, setDraftCustomRule,
    customFunctions, draftCustomFunction, setDraftCustomFunction,
    generatingFunction, functionGenError, addCustomFunction, removeCustomFunction,
    greeting, setGreeting, systemPrompt, setSystemPrompt, agentName, niche, role, tone, isCustom, creating,
    SECTORS, CUSTOM_SECTOR, TONE_OPTIONS, functionLabels,
    selectedGroupId, activeGroup, groupSectors, outroDraftGroup, setOutroDraftGroup,
    selectGroup, selectSector, toggleFunction, confirmFunctions, submitCustom,
    submitName, submitNiche, selectTone, generateGreetings,
    pickGreeting, confirmOwnGreeting, skipGreeting,
    toggleLimitation, addCustomRule, confirmLimitations, handleCreate,
  } = props;

  return (
    <div className="pt-2">

      {/* ── Seleção de grupo ───────────────────────────────────────────── */}
      {stage === "group" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BUSINESS_GROUPS.map((group) => (
            <button key={group.id} type="button" onClick={() => selectGroup(group.id)}
              className="text-left p-3 rounded-lg border border-border bg-card hover:border-brand-500 hover:bg-brand-500/5 transition-all group">
              <div className="text-xl mb-1">{group.emoji}</div>
              <div className="font-medium text-sm group-hover:text-brand-300 transition-colors leading-tight">{group.label}</div>
            </button>
          ))}
          <button type="button" onClick={() => selectGroup("personalizado")}
            className="text-left p-3 rounded-lg border border-dashed border-brand-500/50 bg-brand-500/5 hover:border-brand-500 hover:bg-brand-500/10 transition-all group">
            <div className="text-xl mb-1">✨</div>
            <div className="font-medium text-sm group-hover:text-brand-300 transition-colors leading-tight">Personalizado</div>
          </button>
        </div>
      )}

      {/* ── Seleção de tipo dentro do grupo ───────────────────────────── */}
      {stage === "sector" && !customMode && selectedGroupId && (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-2">
            {groupSectors.map((sector) => (
              <button key={sector.id} type="button" onClick={() => selectSector(sector)}
                className="text-left p-3 rounded-lg border border-border bg-card hover:border-brand-500 hover:bg-brand-500/5 transition-all group">
                <div className="font-medium text-sm group-hover:text-brand-300 transition-colors">{sector.label}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">{sector.description}</div>
              </button>
            ))}
          </div>
          {/* Outro (tipo livre) */}
          <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
            <p className="text-xs text-muted-foreground">Não encontrou seu tipo? Descreva:</p>
            <div className="flex gap-2">
              <Input placeholder="Ex: Floricultural, Loja de Games, Bicicletaria..."
                value={outroDraftGroup} onChange={(e) => setOutroDraftGroup(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && outroDraftGroup.trim()) {
                    selectSector({
                      id: "outro_custom", label: outroDraftGroup.trim(), emoji: "✨",
                      description: outroDraftGroup.trim(),
                      tone: "Amigável e Empático", role: "Atendente Virtual",
                      intro: `Atender e fidelizar clientes de ${outroDraftGroup.trim()} com agilidade e profissionalismo.`,
                      baseLimitations: ["Confirmar informações antes de finalizar qualquer solicitação", "Nunca inventar preços ou prazos não fornecidos"],
                      functions: [
                        { id: "duvidas", label: "Responder dúvidas gerais", emoji: "❓", prompt: "=== DÚVIDAS ===\nResponda sobre serviços, preços, horários e políticas com base na Base de Conhecimento." },
                        { id: "agendamento", label: "Agendar atendimento", emoji: "📅", prompt: "=== AGENDAMENTO ===\nColete: serviço, nome, contato e preferência de data. Informe que a equipe confirmará.", limitations: ["Nunca confirmar agendamento sem validação da equipe"] },
                      ],
                    });
                  }
                }} className="text-sm" />
              <Button size="sm" variant="outline" disabled={!outroDraftGroup.trim()}
                onClick={() => selectSector({
                  id: "outro_custom", label: outroDraftGroup.trim(), emoji: "✨",
                  description: outroDraftGroup.trim(),
                  tone: "Amigável e Empático", role: "Atendente Virtual",
                  intro: `Atender e fidelizar clientes de ${outroDraftGroup.trim()} com agilidade e profissionalismo.`,
                  baseLimitations: ["Confirmar informações antes de finalizar qualquer solicitação", "Nunca inventar preços ou prazos não fornecidos"],
                  functions: [
                    { id: "duvidas", label: "Responder dúvidas gerais", emoji: "❓", prompt: "=== DÚVIDAS ===\nResponda sobre serviços, preços, horários e políticas com base na Base de Conhecimento." },
                    { id: "agendamento", label: "Agendar atendimento", emoji: "📅", prompt: "=== AGENDAMENTO ===\nColete: serviço, nome, contato e preferência de data. Informe que a equipe confirmará.", limitations: ["Nunca confirmar agendamento sem validação da equipe"] },
                  ],
                })}
                className="shrink-0 gap-1.5"><Send className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Seleção de setor — modo antigo (custom/personalizado) ─────── */}
      {stage === "sector" && !customMode && !selectedGroupId && (
        <div className="grid sm:grid-cols-2 gap-2">
          {SECTORS.map((sector) => (
            <button key={sector.id} type="button" onClick={() => selectSector(sector)}
              className="text-left p-3 rounded-lg border border-border bg-card hover:border-brand-500 hover:bg-brand-500/5 transition-all group">
              <div className="text-lg mb-1">{sector.emoji}</div>
              <div className="font-medium text-sm group-hover:text-brand-300 transition-colors">{sector.label}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{sector.description}</div>
            </button>
          ))}
        </div>
      )}

      {stage === "sector" && customMode && (
        <div className="space-y-2">
          <Textarea autoFocus placeholder="Ex: tirar dúvidas e matricular alunos de uma autoescola; ou agendar test-drives numa concessionária..."
            value={draftPurpose} onChange={(e) => setDraftPurpose(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitCustom(); }}
            className="min-h-[80px]" />
          <div className="flex items-center gap-2">
            <Button onClick={submitCustom} disabled={!draftPurpose.trim()} className="gap-2">
              <Sparkles className="h-4 w-4" /> Continuar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setCustomMode(false); setDraftPurpose(""); }} className="text-muted-foreground">
              Voltar às opções
            </Button>
          </div>
        </div>
      )}

      {stage === "functions" && selectedSector && (
        <div className="space-y-4">
          {/* Funções pré-definidas do setor */}
          {selectedSector.functions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedSector.functions.map((fn) => {
                const active = selectedFunctions.includes(fn.id);
                return (
                  <button key={fn.id} type="button" onClick={() => toggleFunction(fn.id)}
                    className={cn("inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm transition-all",
                      active ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-border bg-card hover:border-brand-500/50 hover:bg-brand-500/5")}>
                    {active ? <Check className="h-3.5 w-3.5" /> : <span>{fn.emoji}</span>}
                    {fn.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Funções customizadas geradas pela IA */}
          {customFunctions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {customFunctions.map((fn) => {
                const active = selectedFunctions.includes(fn.id);
                return (
                  <span key={fn.id} className={cn("inline-flex items-center gap-1 pl-2 pr-1 py-1.5 rounded-full border text-sm transition-all",
                    active ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-border bg-card text-muted-foreground")}>
                    <button type="button" onClick={() => toggleFunction(fn.id)} className="inline-flex items-center gap-1.5">
                      {active ? <Check className="h-3.5 w-3.5" /> : <span>{fn.emoji}</span>}
                      {fn.label}
                    </button>
                    <button type="button" onClick={() => removeCustomFunction(fn.id)}
                      className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Campo para criar função personalizada com IA */}
          <div className="rounded-lg border border-dashed border-border bg-secondary/20 p-3 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Não encontrou o que precisa? Descreva em português e a IA converte:</p>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: perguntar o CPF antes de consultar pedido..."
                value={draftCustomFunction}
                onChange={(e) => setDraftCustomFunction(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomFunction(); } }}
                disabled={generatingFunction}
                className="text-sm"
              />
              <Button size="sm" variant="outline" onClick={addCustomFunction}
                disabled={generatingFunction || !draftCustomFunction.trim()} className="shrink-0 gap-1.5">
                {generatingFunction ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                {generatingFunction ? "" : "Converter"}
              </Button>
            </div>
            {functionGenError && <p className="text-xs text-red-400">{functionGenError}</p>}
          </div>

          <Button onClick={confirmFunctions} className="gap-2">Continuar <Send className="h-4 w-4" /></Button>
        </div>
      )}

      {stage === "name" && (
        <div className="flex gap-2">
          <Input autoFocus placeholder="Ex: Ana, Lucas, Bia..." value={draftName}
            onChange={(e) => setDraftName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitName(); }} />
          <Button size="icon" className="shrink-0" onClick={submitName} disabled={!draftName.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      {stage === "niche" && (
        <div className="flex gap-2">
          <Input autoFocus placeholder="Ex: Castro Imóveis" value={draftNiche}
            onChange={(e) => setDraftNiche(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submitNiche(); }} />
          <Button size="icon" className="shrink-0" onClick={submitNiche} disabled={!draftNiche.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      {stage === "tone" && (
        <div className="grid grid-cols-2 gap-2">
          {TONE_OPTIONS.map((t) => (
            <button key={t} type="button" onClick={() => selectTone(t)}
              className="p-3 rounded-lg border border-border bg-card hover:border-brand-500 hover:bg-brand-500/5 text-sm transition-all">{t}</button>
          ))}
        </div>
      )}

      {stage === "greeting" && (
        <div className="space-y-3">
          {greetingError && (
            <div className="space-y-2">
              <p className="text-xs text-red-400">{greetingError}</p>
              <div className="flex items-center gap-2">
                <Button onClick={() => generateGreetings()} disabled={loadingGreetings} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Tentar de novo
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setWritingOwn(true); }} className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Escrever a minha
                </Button>
              </div>
            </div>
          )}
          {!greetingError && !writingOwn && (
            <>
              <div className="space-y-2">
                {greetingOptions.map((opt, i) => (
                  <button key={i} type="button" onClick={() => pickGreeting(opt)}
                    className="block w-full text-left p-3 rounded-lg border border-border bg-card hover:border-brand-500 hover:bg-brand-500/5 transition-all text-sm whitespace-pre-wrap leading-relaxed">{opt}</button>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setWritingOwn(true)} className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Escrever a minha
                </Button>
                <Button variant="ghost" size="sm" onClick={() => generateGreetings()} disabled={loadingGreetings} className="gap-1.5 text-muted-foreground">
                  <RefreshCw className="h-3.5 w-3.5" /> Gerar outras
                </Button>
                <Button variant="ghost" size="sm" onClick={skipGreeting} className="gap-1.5 text-muted-foreground">
                  <SkipForward className="h-3.5 w-3.5" /> Pular
                </Button>
              </div>
            </>
          )}
          {!greetingError && writingOwn && (
            <div className="space-y-2">
              <Textarea autoFocus placeholder="Escreva a saudação que o agente vai usar para iniciar as conversas..."
                value={draftGreeting} onChange={(e) => setDraftGreeting(e.target.value)} className="min-h-[90px]" />
              <div className="flex items-center gap-2">
                <Button onClick={confirmOwnGreeting} disabled={!draftGreeting.trim()} className="gap-2">
                  <Check className="h-4 w-4" /> Usar esta saudação
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setWritingOwn(false)} className="text-muted-foreground">Voltar às opções</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {stage === "restricoes" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-red-400">
              <ShieldAlert className="h-3.5 w-3.5" /> Regras fixas da plataforma — não editáveis
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SAFETY_RULES_DISPLAY.map((rule) => (
                <span key={rule} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] bg-red-500/10 text-red-400/80 border border-red-500/20 cursor-not-allowed">
                  <Lock className="h-2.5 w-2.5" /> {rule}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Proteções recomendadas — toque para ativar/desativar</p>
            <div className="flex flex-wrap gap-2">
              {limitationSuggestions.map((rule) => {
                const active = selectedLimitations.includes(rule);
                return (
                  <button key={rule} type="button" onClick={() => toggleLimitation(rule)}
                    className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all text-left",
                      active ? "border-brand-500 bg-brand-500/10 text-brand-300" : "border-border bg-card text-muted-foreground line-through opacity-50")}>
                    {active && <Check className="h-3 w-3 shrink-0" />}
                    {rule}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Adicionar regra específica do seu negócio..." value={draftCustomRule}
              onChange={(e) => setDraftCustomRule(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addCustomRule(); }}
              className="text-sm" />
            <Button size="icon" variant="outline" onClick={addCustomRule} disabled={!draftCustomRule.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={confirmLimitations} className="gap-2">
            Confirmar restrições <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      {stage === "review" && selectedSector && (
        <div className="space-y-4 rounded-xl border border-border bg-secondary/20 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="wizard-greeting">Saudação Inicial</Label>
            <Textarea id="wizard-greeting" placeholder="Deixe em branco para a IA decidir a melhor saudação." value={greeting} onChange={(e) => setGreeting(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wizard-prompt">Instruções do Agente</Label>
            <Textarea id="wizard-prompt" placeholder="(usando o template padrão — pode editar depois na página do agente)" value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className="min-h-[160px] font-mono text-xs" />
          </div>
          <div className="rounded-lg border border-border bg-card p-3 space-y-1.5 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Nome</span><span className="font-medium">{agentName}</span></div>
            {niche && <div className="flex justify-between"><span className="text-muted-foreground">Empresa / Marca</span><span className="font-medium">{niche}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Cargo</span><span className="font-medium">{role}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tom de voz</span><span className="font-medium">{tone}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Setor</span><span className="font-medium">{selectedSector.emoji} {selectedSector.label}</span></div>
            {!isCustom && functionLabels().length > 0 && (
              <div className="flex justify-between gap-3"><span className="text-muted-foreground shrink-0">Funções</span><span className="font-medium text-right">{functionLabels().join(", ")}</span></div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">Depois de criar, você vai direto para a tela de conexão do WhatsApp.</p>
          <Button onClick={handleCreate} disabled={creating} className="w-full gap-2 bg-brand-500 hover:bg-brand-600 text-white">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Criar Agente e Conectar WhatsApp
          </Button>
        </div>
      )}
    </div>
  );
}
