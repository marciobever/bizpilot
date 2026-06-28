"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import {
  SECTORS, composeSystemPrompt, aggregateLimitations, sectorHasDataRecords, type Sector, type AgentFunction,
  UNIVERSAL_BUSINESS_RULES,
} from "@/lib/agentTemplates";
import type { ChatMsg } from "./useTypewriter";

export const TONE_OPTIONS = ["Profissional e Direto", "Amigável e Empático", "Descontraído (Usa Emojis)", "Técnico e Especialista"];

export const CUSTOM_SECTOR: Sector = {
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

export const TYPE_BY_SECTOR: Record<string, string> = {
  vendas: "vendas",
  suporte: "suporte",
  recepcao: "agendamentos",
  imobiliaria: "imobiliária",
  clinica: "saúde",
  ecommerce: "e-commerce",
  financeiro: "financeiro",
  afiliados: "afiliados",
  custom: "personalizado",
};

export const STAGES = ["sector", "functions", "name", "niche", "tone", "greeting", "restricoes", "review"] as const;
export type Stage = typeof STAGES[number];

interface Callbacks {
  pushUser: (text: string) => void;
  pushBot: (text: string, delay?: number) => void;
  setBotTyping: (v: boolean) => void;
  addBotMessageDirect: (id: string, text: string) => void;
}

export function useWizardFlow({ pushUser, pushBot, setBotTyping, addBotMessageDirect }: Callbacks) {
  const { user } = useAuth();
  const navigate = useRouter();

  const [stage, setStage] = useState<Stage>("sector");
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
  const [customMode, setCustomMode] = useState(false);
  const [draftPurpose, setDraftPurpose] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftNiche, setDraftNiche] = useState("");

  const [greetingOptions, setGreetingOptions] = useState<string[]>([]);
  const [loadingGreetings, setLoadingGreetings] = useState(false);
  const [greetingError, setGreetingError] = useState("");
  const [writingOwn, setWritingOwn] = useState(false);
  const [draftGreeting, setDraftGreeting] = useState("");

  const [limitationSuggestions, setLimitationSuggestions] = useState<string[]>([]);
  const [selectedLimitations, setSelectedLimitations] = useState<string[]>([]);
  const [draftCustomRule, setDraftCustomRule] = useState("");

  const [customFunctions, setCustomFunctions] = useState<AgentFunction[]>([]);
  const [draftCustomFunction, setDraftCustomFunction] = useState("");
  const [generatingFunction, setGeneratingFunction] = useState(false);
  const [functionGenError, setFunctionGenError] = useState("");

  const isCustom = selectedSector?.id === "custom";

  const functionLabels = () => {
    const sectorLabels = (selectedSector?.functions || []).filter((f) => selectedFunctions.includes(f.id)).map((f) => f.label);
    const customLabels = customFunctions.filter((f) => selectedFunctions.includes(f.id)).map((f) => f.label);
    return [...sectorLabels, ...customLabels];
  };

  const selectSector = (sector: Sector) => {
    setSelectedSector(sector);
    setRole(sector.role);
    setTone(sector.tone);
    setSelectedFunctions([]);
    pushUser(`${sector.emoji} ${sector.label}`);
    pushBot("Boa escolha! O que esse agente deve fazer no dia a dia? Marque tudo que se aplica — pode escolher várias funções.");
    setStage("functions");
  };

  const toggleFunction = (id: string) =>
    setSelectedFunctions((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);

  const addCustomFunction = async () => {
    const text = draftCustomFunction.trim();
    if (!text || generatingFunction) return;
    setGeneratingFunction(true);
    setFunctionGenError("");
    try {
      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "generate_function",
          description: text,
          context: { agentName, role, niche, tone, sector: selectedSector?.label },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const fn: AgentFunction = { id: `custom_${Date.now()}`, label: data.label, emoji: data.emoji, prompt: data.prompt };
      setCustomFunctions((prev) => [...prev, fn]);
      setSelectedFunctions((prev) => [...prev, fn.id]);
      setDraftCustomFunction("");
    } catch (e: any) {
      setFunctionGenError(e.message || "Erro ao gerar. Tente descrever de outra forma.");
    } finally {
      setGeneratingFunction(false);
    }
  };

  const removeCustomFunction = (id: string) => {
    setCustomFunctions((prev) => prev.filter((f) => f.id !== id));
    setSelectedFunctions((prev) => prev.filter((fid) => fid !== id));
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

  const buildBrief = () => {
    if (isCustom) return customPurpose;
    const fns = functionLabels();
    return `${selectedSector?.intro || ""}${fns.length ? ` O agente realiza: ${fns.join(", ")}.` : ""}`.trim();
  };

  const buildCustomPrompt = () => {
    const toneLines: Record<string, string> = {
      "Profissional e Direto": "Linguagem formal, objetiva e direta. Sem emojis. Frases curtas.",
      "Amigável e Empático": "Tom caloroso. Use o nome do cliente. Reconheça sentimentos antes de resolver. Até 1 emoji por mensagem.",
      "Descontraído (Usa Emojis)": "Tom leve e descontraído. Use 1-2 emojis por mensagem. Gírias leves são bem-vindas.",
      "Técnico e Especialista": "Vocabulário técnico preciso. Sem emojis. Fundamentado em dados e processos.",
    };
    return `Você é ${agentName}, ${role} de ${niche || "nossa empresa"}.

=== SUA MISSÃO ===
${customPurpose || "Atender os clientes com excelência, tirando dúvidas e ajudando no que precisarem."}

=== TOM DE COMUNICAÇÃO ===
${toneLines[tone] || `Tom de voz: ${tone}.`}
Responda de forma clara e objetiva, usando o nome do cliente quando possível.

=== FLUXO DE CONVERSA ===
Faça sempre uma pergunta por vez. Confirme o entendimento antes de agir. Mensagens curtas — não escreva parágrafos longos.

=== QUANDO NÃO SOUBER ===
Se não souber a resposta, diga que vai verificar com a equipe. NUNCA invente informações.

=== ATENDIMENTO HUMANO ===
Se o cliente pedir para falar com uma pessoa, acione o atendimento humano imediatamente.

=== SOBRE O NEGÓCIO ===
Use SEMPRE a ferramenta buscar_conhecimento antes de responder sobre produtos, serviços, preços ou processos da empresa. Não invente informações que não estiverem lá.`;
  };

  const selectTone = (t: string) => {
    setTone(t);
    pushUser(t);
    setStage("greeting");
    generateGreetings(t);
  };

  const generateGreetings = async (toneArg?: string) => {
    if (!selectedSector) return;
    setSystemPrompt(isCustom ? buildCustomPrompt() : composeSystemPrompt(selectedSector, selectedFunctions, agentName, role, niche, toneArg || tone, customFunctions));
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
      const rawText = await res.text();
      let data: any = {};
      try { data = JSON.parse(rawText); } catch { throw new Error("Servidor indisponível. Tente novamente em instantes."); }
      if (!res.ok) throw new Error(data.error || "Erro ao gerar saudações.");
      setGreetingOptions(data.options || []);
      const id = `b-${Date.now()}`;
      addBotMessageDirect(id, `Escrevi 3 jeitos de ${agentName} se apresentar. Toca na que você mais gostou — ou escreve a sua.`);
    } catch (e: any) {
      setGreetingError(e.message || "Erro ao gerar saudações.");
    } finally {
      setLoadingGreetings(false);
      setBotTyping(false);
    }
  };

  const enterRestricoes = () => {
    const sectorRules = selectedSector ? aggregateLimitations(selectedSector, selectedFunctions) : [];
    const all = Array.from(new Set([...UNIVERSAL_BUSINESS_RULES, ...sectorRules]));
    setLimitationSuggestions(all);
    setSelectedLimitations(all);
    pushBot(`Quase lá! 🛡️ Agora defina o que ${agentName} *não* pode fazer. Já marquei as proteções recomendadas para o seu negócio — desmarque o que não se aplica e adicione regras específicas se precisar.`);
    setStage("restricoes");
  };

  const pickGreeting = (opt: string) => { setGreeting(opt); pushUser(opt); enterRestricoes(); };

  const confirmOwnGreeting = () => {
    if (!draftGreeting.trim()) return;
    const g = draftGreeting.trim();
    setGreeting(g);
    pushUser(g);
    setDraftGreeting("");
    setWritingOwn(false);
    enterRestricoes();
  };

  const skipGreeting = () => { setGreeting(""); pushUser("Sem saudação fixa"); enterRestricoes(); };

  const toggleLimitation = (rule: string) =>
    setSelectedLimitations((prev) => prev.includes(rule) ? prev.filter((r) => r !== rule) : [...prev, rule]);

  const addCustomRule = () => {
    const rule = draftCustomRule.trim();
    if (!rule) return;
    setLimitationSuggestions((prev) => [...prev, rule]);
    setSelectedLimitations((prev) => [...prev, rule]);
    setDraftCustomRule("");
  };

  const confirmLimitations = () => {
    const count = selectedLimitations.length;
    pushUser(count > 0 ? `${count} restrição${count > 1 ? "ões" : ""} definida${count > 1 ? "s" : ""}` : "Sem restrições adicionais");
    pushBot(`Perfeito! Confere tudo abaixo e clique em "Criar Agente" quando estiver pronto.`);
    setStage("review");
  };

  const handleCreate = async () => {
    if (!user || !selectedSector) return;
    setCreating(true);
    const finalPrompt = systemPrompt.trim() || (isCustom ? buildCustomPrompt() : composeSystemPrompt(selectedSector, selectedFunctions, agentName, role, niche, tone, customFunctions));
    const agentType = TYPE_BY_SECTOR[selectedSector.id] || "atendimento";
    const limitations = selectedLimitations.length > 0 ? selectedLimitations : (isCustom ? selectedSector.baseLimitations : aggregateLimitations(selectedSector, selectedFunctions));
    const dataRecords = isCustom ? false : sectorHasDataRecords(selectedSector, selectedFunctions);
    const configData = {
      model: "gpt-5.4-mini", role, niche, tone, greeting, sector: selectedSector.id,
      functions: isCustom ? [] : selectedFunctions, typingSpeed: "40",
      voice_enabled: false, voice_voice: "alloy", limitations, ignoreGroups: true,
      dataRecordsEnabled: dataRecords, handoffPhone: "", blocklist: [], tags: [],
      variables: {}, tools: [], mediaFiles: [],
      whatsapp: { provider: "evolution", meta: { phoneNumberId: "", accessToken: "", wabaId: "", verifyToken: "", connected: false, costAcknowledged: false } },
    };
    try {
      const { data, error } = await supabase
        .from("agents")
        .insert([{ user_id: user.id, name: agentName, type: agentType, system_prompt: finalPrompt, status: "offline", config: configData }])
        .select();
      if (error) throw error;
      if (data && data.length > 0) navigate.push(`/app/agents/${data[0].id}?setup=whatsapp`);
    } catch (e) {
      console.error("Erro ao criar agente:", e);
      alert("Erro ao criar agente. Tente novamente.");
    } finally {
      setCreating(false);
    }
  };

  return {
    stage, agentName, niche, selectedSector, selectedFunctions, customPurpose,
    role, tone, greeting, setGreeting, systemPrompt, setSystemPrompt, creating,
    customMode, setCustomMode, draftPurpose, setDraftPurpose,
    draftName, setDraftName, draftNiche, setDraftNiche,
    greetingOptions, loadingGreetings, greetingError,
    writingOwn, setWritingOwn, draftGreeting, setDraftGreeting,
    limitationSuggestions, selectedLimitations, draftCustomRule, setDraftCustomRule,
    customFunctions, draftCustomFunction, setDraftCustomFunction,
    generatingFunction, functionGenError,
    isCustom, SECTORS, CUSTOM_SECTOR, TONE_OPTIONS, functionLabels,
    selectSector, toggleFunction, confirmFunctions, submitCustom,
    submitName, submitNiche, selectTone, generateGreetings,
    pickGreeting, confirmOwnGreeting, skipGreeting,
    toggleLimitation, addCustomRule, confirmLimitations, handleCreate,
    addCustomFunction, removeCustomFunction,
  };
}
