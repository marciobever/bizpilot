"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, Wand2, Check, Bot, SkipForward, Sparkles, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  SECTORS, composeSystemPrompt, aggregateLimitations, sectorHasDataRecords, type Sector,
} from "@/lib/agentTemplates";

const TONE_OPTIONS = ["Profissional e Direto", "Amigável e Empático", "Descontraído (Usa Emojis)", "Técnico e Especialista"];

// Setor "Outro": o usuário descreve o caso e a IA monta tudo. Sem chips de função.
const CUSTOM_SECTOR: Sector = {
  id: "custom",
  label: "Outro / Descrever meu caso",
  emoji: "✨",
  description: "Nenhuma opção encaixa? Descreva em uma frase o que seu agente vai fazer.",
  tone: "Amigável e Empático",
  role: "Atendente Virtual",
  intro: "",
  baseLimitations: [
    "Se o cliente pedir para falar com um humano, acionar o atendimento humano imediatamente",
    "Não inventar informações, preços ou prazos dos quais você não tenha certeza",
    "Manter o foco no atendimento do negócio",
  ],
  functions: [],
};

// type salvo no banco (exibido na lista de agentes) por setor.
const TYPE_BY_SECTOR: Record<string, string> = {
  vendas: "vendas",
  suporte: "suporte",
  recepcao: "agendamentos",
  imobiliaria: "imobiliária",
  clinica: "saúde",
  ecommerce: "e-commerce",
  financeiro: "financeiro",
  custom: "personalizado",
};

const STAGES = ["sector", "functions", "name", "niche", "tone", "greeting", "review"] as const;
type Stage = typeof STAGES[number];

type ChatMsg = { id: string; role: "bot" | "user"; text: string };

export default function AgentWizard() {
  const { user } = useAuth();
  const navigate = useRouter();

  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: "intro", role: "bot", text: "Oi! 👋 Sou o assistente de criação de agentes do BizPilot. Em poucos minutos a gente monta o seu robô de atendimento.\n\nPra começar: qual é o setor do seu negócio? Escolha a opção que mais combina — ou, se nenhuma encaixar, toque em \"Outro\" e descreva o seu caso." },
  ]);
  const [stage, setStage] = useState<Stage>("sector");
  const [botTyping, setBotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Dados coletados ───────────────────────────────────────────────────────
  const [agentName, setAgentName] = useState("");
  const [niche, setNiche] = useState("");
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedFunctions, setSelectedFunctions] = useState<string[]>([]);
  const [customPurpose, setCustomPurpose] = useState("");
  const [role, setRole] = useState("");
  const [tone, setTone] = useState("");
  const [greeting, setGreeting] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [creating, setCreating] = useState(false);

  // ── Saudação (geração de 3 opções) ─────────────────────────────────────────
  const [greetingOptions, setGreetingOptions] = useState<string[]>([]);
  const [loadingGreetings, setLoadingGreetings] = useState(false);
  const [greetingError, setGreetingError] = useState("");
  const [writingOwn, setWritingOwn] = useState(false);
  const [draftGreeting, setDraftGreeting] = useState("");

  // ── Inputs em edição (não confirmados ainda) ───────────────────────────────
  const [customMode, setCustomMode] = useState(false);
  const [draftPurpose, setDraftPurpose] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftNiche, setDraftNiche] = useState("");

  const isCustom = selectedSector?.id === "custom";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botTyping, stage, customMode, writingOwn]);

  const pushUser = (text: string) => {
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", text }]);
  };

  const pushBot = (text: string, delay = 550) => {
    setBotTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { id: `b-${Date.now()}`, role: "bot", text }]);
      setBotTyping(false);
    }, delay);
  };

  // Rótulos das funções escolhidas.
  const functionLabels = () =>
    (selectedSector?.functions || [])
      .filter((f) => selectedFunctions.includes(f.id))
      .map((f) => f.label);

  // ── Avanços de etapa ────────────────────────────────────────────────────────

  const selectSector = (sector: Sector) => {
    setSelectedSector(sector);
    setRole(sector.role);
    setTone(sector.tone);
    setSelectedFunctions([]);
    pushUser(`${sector.emoji} ${sector.label}`);
    pushBot(`Boa escolha! O que esse agente deve fazer no dia a dia? Marque tudo que se aplica — pode escolher várias funções.`);
    setStage("functions");
  };

  const toggleFunction = (id: string) => {
    setSelectedFunctions((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  };

  const confirmFunctions = () => {
    if (!selectedSector) return;
    const labels = functionLabels();
    pushUser(labels.length ? labels.join(", ") : "Atendimento geral");
    pushBot("Perfeito! Como você quer chamar o seu agente? É o nome que os clientes vão ver.");
    setStage("name");
  };

  const submitCustom = () => {
    if (!draftPurpose.trim()) return;
    const p = draftPurpose.trim();
    setCustomPurpose(p);
    setSelectedSector(CUSTOM_SECTOR);
    setRole(CUSTOM_SECTOR.role);
    setTone(CUSTOM_SECTOR.tone);
    setSelectedFunctions([]);
    pushUser(`✨ ${p}`);
    setDraftPurpose("");
    setCustomMode(false);
    pushBot("Entendi! Vou montar um agente sob medida pra isso. Como você quer chamar o seu agente? É o nome que os clientes vão ver.");
    setStage("name");
  };

  const submitName = () => {
    if (!draftName.trim()) return;
    const name = draftName.trim();
    setAgentName(name);
    pushUser(name);
    setDraftName("");
    // No "Outro" o usuário já descreveu empresa + atuação, então pula o nicho.
    if (isCustom) {
      pushBot(`Prazer, ${name}! E como ${name} deve se comunicar com os clientes?`);
      setStage("tone");
    } else {
      pushBot(`Prazer, ${name}! Agora me conta: qual é a empresa ou a marca que ${name} vai representar?`);
      setStage("niche");
    }
  };

  const submitNiche = () => {
    if (!draftNiche.trim()) return;
    const n = draftNiche.trim();
    setNiche(n);
    pushUser(n);
    setDraftNiche("");
    pushBot(`Perfeito. E como ${agentName} deve se comunicar com os clientes?`);
    setStage("tone");
  };

  const selectTone = (t: string) => {
    setTone(t);
    pushUser(t);
    setStage("greeting");
    generateGreetings(t);
  };

  // Resumo do que o agente faz, para alimentar a geração das saudações.
  const buildBrief = () => {
    if (isCustom) return customPurpose;
    const fns = functionLabels();
    return `${selectedSector?.intro || ""}${fns.length ? ` O agente realiza: ${fns.join(", ")}.` : ""}`.trim();
  };

  const generateGreetings = async (toneArg?: string) => {
    if (!selectedSector) return;
    // Instruções do agente são montadas de forma determinística (setor+funções),
    // sem precisar de descrição livre — ficam editáveis na revisão.
    setSystemPrompt(isCustom ? buildCustomPrompt() : composeSystemPrompt(selectedSector, selectedFunctions, agentName, role, niche));
    setGreetingOptions([]);
    setWritingOwn(false);
    setGreetingError("");
    setLoadingGreetings(true);
    setBotTyping(true);
    try {
      const context = { agentName, role, niche, tone: toneArg || tone };
      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: "greetings", description: buildBrief() || "Atendimento ao cliente", context }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar saudações.");
      setGreetingOptions(data.options || []);
      setMessages((m) => [...m, { id: `b-${Date.now()}`, role: "bot", text: `Escrevi 3 jeitos de ${agentName} se apresentar. Toca na que você mais gostou — ou escreve a sua.` }]);
    } catch (e: any) {
      setGreetingError(e.message || "Erro ao gerar saudações.");
    } finally {
      setLoadingGreetings(false);
      setBotTyping(false);
    }
  };

  const pickGreeting = (opt: string) => {
    setGreeting(opt);
    pushUser(opt);
    pushBot(`Boa! Saudação escolhida. Confere tudo abaixo e clique em "Criar Agente" quando estiver pronto.`);
    setStage("review");
  };

  const confirmOwnGreeting = () => {
    if (!draftGreeting.trim()) return;
    const g = draftGreeting.trim();
    setGreeting(g);
    pushUser(g);
    setDraftGreeting("");
    setWritingOwn(false);
    pushBot(`Perfeito! Confere tudo abaixo e clique em "Criar Agente" quando estiver pronto.`);
    setStage("review");
  };

  const skipGreeting = () => {
    setGreeting("");
    pushUser("Sem saudação fixa");
    pushBot(`Tudo bem! O agente vai se apresentar naturalmente. Confere o resto abaixo e crie quando quiser.`);
    setStage("review");
  };

  // Monta um prompt base para o caso "Outro".
  const buildCustomPrompt = () =>
    `Você é ${agentName}, ${role} de ${niche || "nossa empresa"}.

=== SUA MISSÃO ===
${customPurpose || "Atender os clientes com excelência, tirando dúvidas e ajudando no que precisarem."}

=== COMO SE COMUNICAR ===
- Tom de voz: ${tone}.
- Responda de forma clara e objetiva, usando o nome do cliente quando possível.

=== SOBRE O NEGÓCIO ===
Use a ferramenta buscar_conhecimento para consultar informações do negócio cadastradas na Base de Conhecimento (aba "Arquivos RAG"). Não invente informações que não estiverem lá.`;

  const handleCreate = async () => {
    if (!user || !selectedSector) return;
    setCreating(true);

    const finalPrompt = systemPrompt.trim()
      || (isCustom ? buildCustomPrompt() : composeSystemPrompt(selectedSector, selectedFunctions, agentName, role, niche));
    const agentType = TYPE_BY_SECTOR[selectedSector.id] || "atendimento";
    const limitations = isCustom ? selectedSector.baseLimitations : aggregateLimitations(selectedSector, selectedFunctions);
    const dataRecords = isCustom ? false : sectorHasDataRecords(selectedSector, selectedFunctions);

    const configData = {
      model: "gpt-5.4-mini",
      role,
      niche,
      tone,
      greeting,
      sector: selectedSector.id,
      functions: isCustom ? [] : selectedFunctions,
      typingSpeed: "40",
      voice_enabled: false,
      voice_voice: "alloy",
      limitations,
      ignoreGroups: true,
      dataRecordsEnabled: dataRecords,
      handoffPhone: "",
      blocklist: [],
      tags: [],
      variables: {},
      tools: [],
      mediaFiles: [],
      whatsapp: {
        provider: "evolution",
        meta: { phoneNumberId: "", accessToken: "", wabaId: "", verifyToken: "", connected: false, costAcknowledged: false },
      },
    };

    try {
      const { data, error } = await supabase
        .from("agents")
        .insert([{
          user_id: user.id,
          name: agentName,
          type: agentType,
          system_prompt: finalPrompt,
          status: "offline",
          config: configData,
        }])
        .select();
      if (error) throw error;
      if (data && data.length > 0) {
        navigate.push(`/app/agents/${data[0].id}?setup=whatsapp`);
      }
    } catch (e) {
      console.error("Erro ao criar agente:", e);
      alert("Erro ao criar agente. Tente novamente.");
    } finally {
      setCreating(false);
    }
  };

  const stageIndex = STAGES.indexOf(stage);
  const progressPct = ((stageIndex + (botTyping ? 0.5 : 1)) / STAGES.length) * 100;

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-3 pb-4 shrink-0">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/app/agents"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold tracking-tight">Criar Agente</h2>
          <p className="text-muted-foreground text-xs">Converse com o assistente para configurar seu agente de IA.</p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="h-1 rounded-full bg-secondary overflow-hidden shrink-0 mb-4">
        <div className="h-full bg-brand-500 transition-all duration-500 rounded-full" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-auto rounded-xl border border-border bg-card p-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex max-w-[85%] gap-2", m.role === "user" ? "ml-auto justify-end" : "")}>
            {m.role === "bot" && (
              <div className="h-7 w-7 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-4 w-4 text-brand-500" />
              </div>
            )}
            <div className={cn(
              "p-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed",
              m.role === "bot" ? "bg-secondary text-foreground rounded-tl-sm" : "bg-brand-600 text-white rounded-tr-sm"
            )}>
              {m.text}
            </div>
          </div>
        ))}

        {botTyping && (
          <div className="flex gap-2 max-w-[85%]">
            <div className="h-7 w-7 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-brand-500" />
            </div>
            <div className="p-3 rounded-2xl rounded-tl-sm bg-secondary flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
            </div>
          </div>
        )}

        {/* Painel interativo da etapa atual */}
        {!botTyping && (
          <div className="pt-2">
            {stage === "sector" && !customMode && (
              <div className="grid sm:grid-cols-2 gap-2">
                {SECTORS.map((sector) => (
                  <button
                    key={sector.id}
                    type="button"
                    onClick={() => selectSector(sector)}
                    className="text-left p-3 rounded-lg border border-border bg-card hover:border-brand-500 hover:bg-brand-500/5 transition-all group"
                  >
                    <div className="text-lg mb-1">{sector.emoji}</div>
                    <div className="font-medium text-sm group-hover:text-brand-300 transition-colors">{sector.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{sector.description}</div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomMode(true)}
                  className="text-left p-3 rounded-lg border border-dashed border-brand-500/50 bg-brand-500/5 hover:border-brand-500 hover:bg-brand-500/10 transition-all group sm:col-span-2"
                >
                  <div className="text-lg mb-1">{CUSTOM_SECTOR.emoji}</div>
                  <div className="font-medium text-sm group-hover:text-brand-300 transition-colors">{CUSTOM_SECTOR.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{CUSTOM_SECTOR.description}</div>
                </button>
              </div>
            )}

            {stage === "sector" && customMode && (
              <div className="space-y-2">
                <Textarea
                  autoFocus
                  placeholder="Ex: tirar dúvidas e matricular alunos de uma autoescola; ou agendar test-drives numa concessionária..."
                  value={draftPurpose}
                  onChange={(e) => setDraftPurpose(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submitCustom(); }}
                  className="min-h-[80px]"
                />
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
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {selectedSector.functions.map((fn) => {
                    const active = selectedFunctions.includes(fn.id);
                    return (
                      <button
                        key={fn.id}
                        type="button"
                        onClick={() => toggleFunction(fn.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-2 rounded-full border text-sm transition-all",
                          active
                            ? "border-brand-500 bg-brand-500/10 text-brand-300"
                            : "border-border bg-card hover:border-brand-500/50 hover:bg-brand-500/5"
                        )}
                      >
                        {active ? <Check className="h-3.5 w-3.5" /> : <span>{fn.emoji}</span>}
                        {fn.label}
                      </button>
                    );
                  })}
                </div>
                <Button onClick={confirmFunctions} className="gap-2">
                  Continuar
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}

            {stage === "name" && (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="Ex: Ana, Lucas, Bia..."
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitName(); }}
                />
                <Button size="icon" className="shrink-0" onClick={submitName} disabled={!draftName.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}

            {stage === "niche" && (
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="Ex: Castro Imóveis"
                  value={draftNiche}
                  onChange={(e) => setDraftNiche(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitNiche(); }}
                />
                <Button size="icon" className="shrink-0" onClick={submitNiche} disabled={!draftNiche.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}

            {stage === "tone" && (
              <div className="grid grid-cols-2 gap-2">
                {TONE_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => selectTone(t)}
                    className="p-3 rounded-lg border border-border bg-card hover:border-brand-500 hover:bg-brand-500/5 text-sm transition-all"
                  >
                    {t}
                  </button>
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
                      <Button variant="outline" size="sm" onClick={() => { setGreetingError(""); setWritingOwn(true); }} className="gap-1.5">
                        <Pencil className="h-3.5 w-3.5" /> Escrever a minha
                      </Button>
                    </div>
                  </div>
                )}

                {!greetingError && !writingOwn && (
                  <>
                    <div className="space-y-2">
                      {greetingOptions.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => pickGreeting(opt)}
                          className="block w-full text-left p-3 rounded-lg border border-border bg-card hover:border-brand-500 hover:bg-brand-500/5 transition-all text-sm whitespace-pre-wrap leading-relaxed"
                        >
                          {opt}
                        </button>
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
                    <Textarea
                      autoFocus
                      placeholder="Escreva a saudação que o agente vai usar para iniciar as conversas..."
                      value={draftGreeting}
                      onChange={(e) => setDraftGreeting(e.target.value)}
                      className="min-h-[90px]"
                    />
                    <div className="flex items-center gap-2">
                      <Button onClick={confirmOwnGreeting} disabled={!draftGreeting.trim()} className="gap-2">
                        <Check className="h-4 w-4" /> Usar esta saudação
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setWritingOwn(false)} className="text-muted-foreground">
                        Voltar às opções
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {stage === "review" && selectedSector && (
              <div className="space-y-4 rounded-xl border border-border bg-secondary/20 p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="wizard-greeting">Saudação Inicial</Label>
                  <Textarea
                    id="wizard-greeting"
                    placeholder="Deixe em branco para a IA decidir a melhor saudação."
                    value={greeting}
                    onChange={(e) => setGreeting(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wizard-prompt">Instruções do Agente</Label>
                  <Textarea
                    id="wizard-prompt"
                    placeholder="(usando o template padrão — pode editar depois na página do agente)"
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="min-h-[160px] font-mono text-xs"
                  />
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
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
