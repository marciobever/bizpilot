"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { interpolateTemplate, type PromptTemplate } from "@/lib/agentTemplates";

export function useAgentForm(isNew: boolean) {
  const { user } = useAuth();
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const [agentName, setAgentName] = useState("Lucas");
  const [systemPrompt, setSystemPrompt] = useState(
    "Você é o Lucas, um especialista de vendas da BizPilot. Seu objetivo principal é entender a dor do cliente, apresentar nossos planos SaaS e agendar uma reunião com um atendente humano caso o cliente demonstre alto interesse."
  );
  const [selectedModel, setSelectedModel] = useState("gpt-5.4-mini");
  const [role, setRole] = useState("Especialista em Vendas");
  const [niche, setNiche] = useState("Software B2B / SaaS");
  const [tone, setTone] = useState("Profissional e Direto");
  const [greeting, setGreeting] = useState("");
  const [typingSpeed, setTypingSpeed] = useState("40");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceVoice, setVoiceVoice] = useState("alloy");
  const [limitations, setLimitations] = useState<string[]>([
    "Nunca oferecer descontos que não estão no sistema",
    "Se o cliente demonstrar urgência ou irritação, repassar a conversa para um atendente humano imediatamente",
    "Evitar assuntos fora do contexto da empresa (fofoca, política, etc)",
  ]);
  const [newLimitation, setNewLimitation] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [ignoreGroups, setIgnoreGroups] = useState(true);
  const [dataRecordsEnabled, setDataRecordsEnabled] = useState(false);
  const [handoffContacts, setHandoffContacts] = useState<{ name: string; phone: string }[]>([]);
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [newBlock, setNewBlock] = useState("");
  const [showGreetingAI, setShowGreetingAI] = useState(false);
  const [greetingAIDescription, setGreetingAIDescription] = useState("");
  const [greetingAILoading, setGreetingAILoading] = useState(false);
  const [showInstructionsAI, setShowInstructionsAI] = useState(false);
  const [instructionsAIDescription, setInstructionsAIDescription] = useState("");
  const [instructionsAILoading, setInstructionsAILoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [variables, setVariables] = useState<{ key: string; value: string }[]>([]);
  const [newVarKey, setNewVarKey] = useState("");
  const [newVarValue, setNewVarValue] = useState("");
  const [userPlan, setUserPlan] = useState<"basico" | "profissional" | "avancado">("basico");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.plan) setUserPlan(data.plan);
      });
  }, [user]);

  const applyTemplate = (tpl: PromptTemplate) => {
    const interpolated = interpolateTemplate(tpl, agentName, tpl.role, niche);
    setSystemPrompt(interpolated);
    setLimitations(tpl.limitations);
    setRole(tpl.role);
    setTone(tpl.tone);
    setDataRecordsEnabled(!!tpl.enableDataRecords);
    setGreeting("");
    setShowTemplates(false);
  };

  const handleAutoComplete = () => {
    const basePrompt = `Você é ${agentName || "o assistente"}, ${role || "atendente"} de ${niche || "nossa empresa"}.

=== SUA MISSÃO ===
Atender clientes de forma ${tone?.toLowerCase() || "profissional"}, resolvendo suas dúvidas e necessidades com agilidade.

=== REGRAS DE OURO ===
- Nunca invente informações que não lhe foram fornecidas.
- Seja ${tone?.toLowerCase() || "profissional"} em todas as interações.
- Quando não souber responder, diga honestamente e ofereça transferir para um atendente humano.
- Não aja como "robô": responda de forma natural e humana.

=== SOBRE A EMPRESA/SERVIÇO ===
(Complete aqui com informações sobre produtos, serviços, preços e diferenciais.)

=== LIMITAÇÕES ===
${limitations.map((l) => "- " + l).join("\n") || "- Nenhuma limitação definida ainda."}`;
    setSystemPrompt(basePrompt);
  };

  const handleGenerateGreeting = async () => {
    if (!greetingAIDescription.trim()) return;
    setGreetingAILoading(true);
    try {
      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "greeting",
          description: greetingAIDescription,
          context: { agentName, role, niche, tone },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar saudação");
      setGreeting(data.text);
      setShowGreetingAI(false);
      setGreetingAIDescription("");
    } catch (e: any) {
      alert(e.message || "Erro ao gerar saudação com IA.");
    } finally {
      setGreetingAILoading(false);
    }
  };

  const handleGenerateInstructions = async () => {
    if (!instructionsAIDescription.trim()) return;
    setInstructionsAILoading(true);
    try {
      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "instructions",
          description: instructionsAIDescription,
          context: { agentName, role, niche, tone },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao gerar instruções");
      setSystemPrompt(data.text);
      setShowInstructionsAI(false);
      setInstructionsAIDescription("");
    } catch (e: any) {
      alert(e.message || "Erro ao gerar instruções com IA.");
    } finally {
      setInstructionsAILoading(false);
    }
  };

  const playVoicePreview = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    const audioUrl = `https://cdn.openai.com/API/docs/audio/${voiceVoice}.wav`;
    currentAudioRef.current = new Audio(audioUrl);
    currentAudioRef.current
      .play()
      .catch((e) => console.error("Error playing audio preview", e));
  };

  return {
    agentName, setAgentName,
    systemPrompt, setSystemPrompt,
    selectedModel, setSelectedModel,
    role, setRole,
    niche, setNiche,
    tone, setTone,
    greeting, setGreeting,
    typingSpeed, setTypingSpeed,
    voiceEnabled, setVoiceEnabled,
    voiceVoice, setVoiceVoice,
    limitations, setLimitations,
    newLimitation, setNewLimitation,
    showTemplates, setShowTemplates,
    ignoreGroups, setIgnoreGroups,
    dataRecordsEnabled, setDataRecordsEnabled,
    handoffContacts, setHandoffContacts,
    blocklist, setBlocklist,
    newBlock, setNewBlock,
    showGreetingAI, setShowGreetingAI,
    greetingAIDescription, setGreetingAIDescription,
    greetingAILoading,
    showInstructionsAI, setShowInstructionsAI,
    instructionsAIDescription, setInstructionsAIDescription,
    instructionsAILoading,
    tags, setTags,
    newTag, setNewTag,
    variables, setVariables,
    newVarKey, setNewVarKey,
    newVarValue, setNewVarValue,
    userPlan,
    loading, setLoading,
    saving, setSaving,
    applyTemplate,
    handleAutoComplete,
    handleGenerateGreeting,
    handleGenerateInstructions,
    playVoicePreview,
  };
}
