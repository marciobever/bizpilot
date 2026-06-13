"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, Loader2, Wand2, Check, Bot, SkipForward, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { PROMPT_TEMPLATES, interpolateTemplate, type PromptTemplate } from "@/lib/agentTemplates";

const TONE_OPTIONS = ["Profissional e Direto", "Amigável e Empático", "Descontraído (Usa Emojis)", "Técnico e Especialista"];

// Opção "nenhuma das anteriores": o usuário descreve o caso e a IA monta tudo.
const CUSTOM_TEMPLATE: PromptTemplate = {
  id: "custom",
  label: "Outro / Descrever meu caso",
  emoji: "✨",
  description: "Nenhuma opção encaixa? Descreva em uma frase o que seu agente vai fazer.",
  tone: "Amigável e Empático",
  role: "Atendente Virtual",
  systemPrompt: `Você é {agentName}, {role} de {niche}.`,
  limitations: [
    "Se o cliente pedir para falar com um humano, acionar o atendimento humano imediatamente",
    "Não inventar informações, preços ou prazos dos quais você não tenha certeza",
    "Manter o foco no atendimento do negócio",
  ],
};

// type salvo no banco (exibido na lista de agentes) por template.
const TYPE_BY_TEMPLATE: Record<string, string> = {
  vendas: "vendas",
  suporte: "suporte",
  recepcao: "agendamentos",
  imobiliaria: "imobiliária",
  clinica: "saúde",
  ecommerce: "e-commerce",
  financeiro: "financeiro",
  custom: "personalizado",
};

const STAGES = ["template", "name", "niche", "tone", "description", "review"] as const;
type Stage = typeof STAGES[number];

type ChatMsg = { id: string; role: "bot" | "user"; text: string };

export default function AgentWizard() {
  const { user } = useAuth();
  const navigate = useRouter();

  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: "intro", role: "bot", text: "Oi! 👋 Sou o assistente de criação de agentes do BizPilot. Em poucos minutos a gente monta o seu robô de atendimento.\n\nPra começar: o que o seu agente vai fazer no dia a dia? Escolha a opção que mais combina com o seu negócio — ou, se nenhuma encaixar, toque em \"Outro\" e descreva o seu caso." },
  ]);
  const [stage, setStage] = useState<Stage>("template");
  const [botTyping, setBotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Dados coletados ───────────────────────────────────────────────────────
  const [agentName, setAgentName] = useState("");
  const [niche, setNiche] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [customPurpose, setCustomPurpose] = useState("");
  const [role, setRole] = useState("");
  const [tone, setTone] = useState("");
  const [description, setDescription] = useState("");
  const [greeting, setGreeting] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [creating, setCreating] = useState(false);

  // ── Inputs em edição (não confirmados ainda) ───────────────────────────────
  const [customMode, setCustomMode] = useState(false);
  const [draftPurpose, setDraftPurpose] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftNiche, setDraftNiche] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botTyping, stage, customMode]);

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

  // ── Avanços de etapa ────────────────────────────────────────────────────────

  const selectTemplate = (tpl: PromptTemplate) => {
    setSelectedTemplate(tpl);
    setRole(tpl.role);
    setTone(tpl.tone);
    pushUser(`${tpl.emoji} ${tpl.label}`);
    pushBot("Boa escolha! Como você quer chamar o seu agente? É o nome que os clientes vão ver.");
    setStage("name");
  };

  const submitCustom = () => {
    if (!draftPurpose.trim()) return;
    const p = draftPurpose.trim();
    setCustomPurpose(p);
    setSelectedTemplate(CUSTOM_TEMPLATE);
    setRole(CUSTOM_TEMPLATE.role);
    setTone(CUSTOM_TEMPLATE.tone);
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
    pushBot(`Prazer, ${name}! Agora me conta: qual é a empresa ou o nicho que o ${name} vai representar?`);
    setStage("niche");
  };

  const submitNiche = () => {
    if (!draftNiche.trim()) return;
    const n = draftNiche.trim();
    setNiche(n);
    pushUser(n);
    setDraftNiche("");
    pushBot(`Perfeito. E como o ${agentName} deve se comunicar com os clientes?`);
    setStage("tone");
  };

  const selectTone = (t: string) => {
    setTone(t);
    pushUser(t);
    pushBot(`Última etapa antes de eu escrever o texto: me conta um pouco sobre o seu negócio, produtos/serviços e como o ${agentName} deve agir. Vou usar isso para escrever a saudação e as instruções iniciais dele.`);
    setStage("description");
  };

  const handleGenerate = async () => {
    if (!draftDescription.trim() || !selectedTemplate) return;
    const desc = draftDescription.trim();
    setDescription(desc);
    pushUser(desc);
    setDraftDescription("");
    setGenerating(true);
    setGenerateError("");
    setBotTyping(true);
    try {
      const context = { agentName, role, niche, tone };
      // Para o caso "Outro", o que o usuário descreveu como propósito é a base do bot.
      const genDescription = selectedTemplate.id === "custom" && customPurpose
        ? `O agente deve: ${customPurpose}.\n\nSobre o negócio: ${desc}`
        : desc;
      const [greetingRes, instructionsRes] = await Promise.all([
        fetch("/api/agents/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field: "greeting", description: genDescription, context }),
        }),
        fetch("/api/agents/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field: "instructions", description: genDescription, context }),
        }),
      ]);
      const greetingData = await greetingRes.json();
      const instructionsData = await instructionsRes.json();
      if (!greetingRes.ok) throw new Error(greetingData.error || "Erro ao gerar saudação.");
      if (!instructionsRes.ok) throw new Error(instructionsData.error || "Erro ao gerar instruções.");
      setGreeting(greetingData.text);
      setSystemPrompt(instructionsData.text);
      setMessages((m) => [...m, { id: `b-${Date.now()}`, role: "bot", text: `Pronto! Escrevi a saudação e as instruções iniciais do ${agentName}. Dá uma olhada abaixo, ajuste se quiser, e clique em "Criar Agente" quando estiver tudo certo.` }]);
      setStage("review");
    } catch (e: any) {
      setGenerateError(e.message || "Erro ao gerar conteúdo com IA. Tente novamente.");
    } finally {
      setGenerating(false);
      setBotTyping(false);
    }
  };

  const skipGeneration = () => {
    pushUser("Pular — montar com o texto padrão");
    const label = selectedTemplate?.id === "custom" ? "o seu caso" : `o template "${selectedTemplate?.label}"`;
    setMessages((m) => [...m, { id: `b-${Date.now()}`, role: "bot", text: `Sem problemas! Vou montar as instruções iniciais a partir d${selectedTemplate?.id === "custom" ? "o" : "e"} ${label}. Você pode revisar e ajustar tudo abaixo antes de criar.` }]);
    setStage("review");
  };

  // Monta um prompt base para o caso "Outro" quando o usuário não usa a IA.
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
    if (!user || !selectedTemplate) return;
    setCreating(true);

    const finalPrompt = systemPrompt.trim()
      || (selectedTemplate.id === "custom" ? buildCustomPrompt() : interpolateTemplate(selectedTemplate, agentName, role, niche));
    const agentType = TYPE_BY_TEMPLATE[selectedTemplate.id] || "atendimento";

    const configData = {
      model: "gpt-5.4-mini",
      role,
      niche,
      tone,
      greeting,
      typingSpeed: "40",
      voice_enabled: false,
      voice_voice: "alloy",
      limitations: selectedTemplate.limitations,
      ignoreGroups: true,
      dataRecordsEnabled: !!selectedTemplate.enableDataRecords,
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
            {stage === "template" && !customMode && (
              <div className="grid sm:grid-cols-2 gap-2">
                {PROMPT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => selectTemplate(tpl)}
                    className="text-left p-3 rounded-lg border border-border bg-card hover:border-brand-500 hover:bg-brand-500/5 transition-all group"
                  >
                    <div className="text-lg mb-1">{tpl.emoji}</div>
                    <div className="font-medium text-sm group-hover:text-brand-300 transition-colors">{tpl.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{tpl.description}</div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomMode(true)}
                  className="text-left p-3 rounded-lg border border-dashed border-brand-500/50 bg-brand-500/5 hover:border-brand-500 hover:bg-brand-500/10 transition-all group sm:col-span-2"
                >
                  <div className="text-lg mb-1">{CUSTOM_TEMPLATE.emoji}</div>
                  <div className="font-medium text-sm group-hover:text-brand-300 transition-colors">{CUSTOM_TEMPLATE.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{CUSTOM_TEMPLATE.description}</div>
                </button>
              </div>
            )}

            {stage === "template" && customMode && (
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
                  placeholder="Ex: Loja de roupas Bella Moda"
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

            {stage === "description" && (
              <div className="space-y-2">
                <Textarea
                  autoFocus
                  placeholder="Ex: Vendemos roupas femininas, principalmente vestidos e conjuntos. O agente deve entender o que a cliente procura, sugerir produtos do catálogo e agendar a retirada na loja."
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  className="min-h-[90px]"
                  disabled={generating}
                />
                {generateError && <p className="text-xs text-red-400">{generateError}</p>}
                <div className="flex items-center gap-2">
                  <Button onClick={handleGenerate} disabled={generating || !draftDescription.trim()} className="gap-2">
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    Gerar com IA
                  </Button>
                  <Button variant="ghost" size="sm" onClick={skipGeneration} disabled={generating} className="gap-1.5 text-muted-foreground">
                    <SkipForward className="h-3.5 w-3.5" /> Pular
                  </Button>
                </div>
              </div>
            )}

            {stage === "review" && selectedTemplate && (
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
                  <div className="flex justify-between"><span className="text-muted-foreground">Empresa / Nicho</span><span className="font-medium">{niche}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Cargo</span><span className="font-medium">{role}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tom de voz</span><span className="font-medium">{tone}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Tipo de atendimento</span><span className="font-medium">{selectedTemplate.emoji} {selectedTemplate.label}</span></div>
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
