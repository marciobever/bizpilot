"use client";
import { useState, useEffect, useRef } from "react";
import Link from 'next/link';
import { useRouter as useNavigate } from 'next/navigation';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Bot, MessageSquare, ShieldAlert, Database, Zap, Smartphone, FileText, Plus, Webhook, Loader2, Volume2, Info, CheckCircle2, Copy, ShieldCheck, AlertTriangle, QrCode, Trash2, Globe, X, Brain, Wand2, Smile, Settings, Puzzle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { PROMPT_TEMPLATES, interpolateTemplate, type PromptTemplate } from "@/lib/agentTemplates";

// ─────────────────────────────────────────────────────────────────────────────

export default function AgentConfig() {
  const navigate = useNavigate();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const setSearchParams = (params: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(params).forEach(([k, v]) => newParams.set(k, v));
    navigate.push(`?${newParams.toString()}`);
  };
  const setupStep = searchParams.get("setup");
  const { user, loading: authLoading } = useAuth();
  const isNew = id === "new";

  const [activeTab, setActiveTab] = useState("identity");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [userPlan, setUserPlan] = useState<"basico" | "profissional" | "avancado">("basico");

  const [agentName, setAgentName] = useState("Lucas");
  const [systemPrompt, setSystemPrompt] = useState("Você é o Lucas, um especialista de vendas da BizPilot. Seu objetivo principal é entender a dor do cliente, apresentar nossos planos SaaS e agendar uma reunião com um atendente humano caso o cliente demonstre alto interesse.");
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
    "Evitar assuntos fora do contexto da empresa (fofoca, política, etc)"
  ]);
  const [newLimitation, setNewLimitation] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [ignoreGroups, setIgnoreGroups] = useState(true);
  const [dataRecordsEnabled, setDataRecordsEnabled] = useState(false);
  const [handoffPhone, setHandoffPhone] = useState("");

  // ── Mini agentes de IA (geração de saudação e instruções) ─────────────────
  const [showGreetingAI, setShowGreetingAI] = useState(false);
  const [greetingAIDescription, setGreetingAIDescription] = useState("");
  const [greetingAILoading, setGreetingAILoading] = useState(false);
  const [showInstructionsAI, setShowInstructionsAI] = useState(false);
  const [instructionsAIDescription, setInstructionsAIDescription] = useState("");
  const [instructionsAILoading, setInstructionsAILoading] = useState(false);
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [newBlock, setNewBlock] = useState("");

  // ── Tools (Ações e APIs) ──────────────────────────────────────────────────
  type AgentTool = {
    id: string; name: string; description: string;
    url: string; method: string;
    headers: Record<string, string>;
    parameters: Record<string, string>;
    required_params: string[];
  };
  const [tools, setTools] = useState<AgentTool[]>([]);
  const [showToolForm, setShowToolForm] = useState(false);
  // Addons: gerenciadores que abrem sob demanda + status das integrações da conta.
  const [showToolsManager, setShowToolsManager] = useState(false);
  const [showMediaManager, setShowMediaManager] = useState(false);
  const [toolForm, setToolForm] = useState<Partial<AgentTool>>({ method: "GET", headers: {}, parameters: {}, required_params: [] });
  const [toolParamKey, setToolParamKey] = useState("");
  const [toolParamDesc, setToolParamDesc] = useState("");
  const [toolHeaderKey, setToolHeaderKey] = useState("");
  const [toolHeaderVal, setToolHeaderVal] = useState("");

  // ── Arquivos para envio (catálogos, tabelas de preço, contratos, etc.) ────
  type MediaFile = { id: string; name: string; description: string; url: string };
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [mediaFileForm, setMediaFileForm] = useState<Partial<MediaFile>>({});
  const [showMediaFileForm, setShowMediaFileForm] = useState(false);
  const [uploadingMediaFile, setUploadingMediaFile] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState("");

  // ── Knowledge Base ────────────────────────────────────────────────────────
  type KnowledgeEntry = { id: string; title: string; source_type: string; source_url?: string; chunk_count: number; created_at: string };
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [addingKnowledge, setAddingKnowledge] = useState(false);
  const [showKnowledgeForm, setShowKnowledgeForm] = useState(false);
  const [knowledgeForm, setKnowledgeForm] = useState({ title: "", content: "", sourceType: "text", sourceUrl: "" });
  const [sitemapForm, setSitemapForm] = useState({ sitemapUrl: "", urlFilter: "", maxItems: "20" });
  const [importingSitemap, setImportingSitemap] = useState(false);
  const [sitemapResult, setSitemapResult] = useState<{ imported: number; total: number; errors: { url: string; error: string }[] } | null>(null);

  // Tags e variáveis de integração com Windmill
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [variables, setVariables] = useState<{ key: string; value: string }[]>([]);
  const [newVarKey, setNewVarKey] = useState("");
  const [newVarValue, setNewVarValue] = useState("");

  // Evolution API State
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [customInstanceName, setCustomInstanceName] = useState("");
  const [waLoading, setWaLoading] = useState(false);
  const [waConnected, setWaConnected] = useState(false);
  const [waQrCode, setWaQrCode] = useState("");
  const [checkingWa, setCheckingWa] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // Provedor do WhatsApp: 'evolution' (gratuito, QR) ou 'meta' (oficial, Cloud API)
  const [whatsappProvider, setWhatsappProvider] = useState<"evolution" | "meta">("evolution");
  // Meta Oficial (WhatsApp Cloud API) — credenciais coladas pelo cliente
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaWabaId, setMetaWabaId] = useState("");
  const [metaVerifyToken, setMetaVerifyToken] = useState("");
  const [metaConnected, setMetaConnected] = useState(false);
  const [metaTesting, setMetaTesting] = useState(false);
  const [metaTestMsg, setMetaTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // Confirmação de que o cliente entende que a Meta cobra por mensagem/conversa enviada
  const [metaCostAck, setMetaCostAck] = useState(false);
  const [webhookOrigin, setWebhookOrigin] = useState("");

  // Garante um Verify Token estável para o webhook da Meta e captura a origem pública.
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookOrigin(window.location.origin);
    }
    setMetaVerifyToken((prev) => prev || `synapse_${Math.random().toString(36).slice(2, 10)}`);
  }, []);

  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (agentName && !showInstanceModal) {
      setCustomInstanceName(agentName.toLowerCase().replace(/[^a-z0-9]/g, ''));
    }
  }, [agentName, showInstanceModal]);

  useEffect(() => {
    if (user && !isNew) {
      fetchAgent();
      checkWhatsappStatus();
    } else if (!authLoading && !isNew && !user) {
      setLoading(false);
    }
  }, [user, id, authLoading]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan").eq("id", user.id).single().then(({ data }) => {
      if (data?.plan) setUserPlan(data.plan);
    });
  }, [user]);

  const checkWhatsappStatus = async () => {
    if (!id || id === 'new') return;
    try {
      const res = await fetch(`/api/evolution/instances/agent_${id}/connectionState`);
      if (res.ok) {
        const data = await res.json();
        if (data.instance?.state === 'open') {
           setWaConnected(true);
        } else if (data.instance?.state === 'connecting') {
           setTimeout(checkWhatsappStatus, 5000);
        }
      }
    } catch (e) {
      console.log('Instance not found or error', e);
    }
  };

  // ── Knowledge ─────────────────────────────────────────────────────────────

  const fetchKnowledge = async () => {
    if (!id || id === 'new') return;
    setLoadingKnowledge(true);
    try {
      const res = await fetch(`/api/knowledge?agentId=${id}`);
      if (res.ok) { const d = await res.json(); setKnowledgeEntries(d.entries || []); }
    } finally { setLoadingKnowledge(false); }
  };

  useEffect(() => { if (activeTab === 'knowledge' && !isNew) fetchKnowledge(); }, [activeTab, id]);

  const handleAddKnowledge = async () => {
    if (!knowledgeForm.title.trim()) return;
    if (knowledgeForm.sourceType === 'text' && !knowledgeForm.content.trim()) return;
    if (knowledgeForm.sourceType === 'url' && !knowledgeForm.sourceUrl.trim()) return;
    setAddingKnowledge(true);
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: id, title: knowledgeForm.title, content: knowledgeForm.content, sourceType: knowledgeForm.sourceType, sourceUrl: knowledgeForm.sourceUrl }),
      });
      if (res.ok) {
        setKnowledgeForm({ title: "", content: "", sourceType: "text", sourceUrl: "" });
        setShowKnowledgeForm(false);
        fetchKnowledge();
      } else {
        const d = await res.json(); alert(d.error || 'Erro ao salvar.');
      }
    } finally { setAddingKnowledge(false); }
  };

  const handleImportSitemap = async () => {
    if (!sitemapForm.sitemapUrl.trim()) return;
    setImportingSitemap(true);
    setSitemapResult(null);
    try {
      const res = await fetch('/api/knowledge/import-sitemap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: id,
          sitemapUrl: sitemapForm.sitemapUrl,
          urlFilter: sitemapForm.urlFilter,
          maxItems: sitemapForm.maxItems,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setSitemapResult(d);
        fetchKnowledge();
      } else {
        alert(d.error || 'Erro ao importar sitemap.');
      }
    } finally { setImportingSitemap(false); }
  };

  const handleDeleteKnowledge = async (entryId: string) => {
    if (!confirm('Remover este conhecimento?')) return;
    await fetch(`/api/knowledge/${entryId}`, { method: 'DELETE' });
    setKnowledgeEntries(prev => prev.filter(e => e.id !== entryId));
  };

  // ── Tools ──────────────────────────────────────────────────────────────────

  const handleAddTool = () => {
    if (!toolForm.name?.trim() || !toolForm.description?.trim() || !toolForm.url?.trim()) {
      alert('Nome, descrição e URL são obrigatórios.'); return;
    }
    const newTool: AgentTool = {
      id: crypto.randomUUID(),
      name: toolForm.name.trim().toLowerCase().replace(/\s+/g, '_'),
      description: toolForm.description.trim(),
      url: toolForm.url.trim(),
      method: toolForm.method || 'GET',
      headers: toolForm.headers || {},
      parameters: toolForm.parameters || {},
      required_params: toolForm.required_params || [],
    };
    setTools(prev => [...prev, newTool]);
    setToolForm({ method: "GET", headers: {}, parameters: {}, required_params: [] });
    setShowToolForm(false);
  };

  const handleDeleteTool = (toolId: string) => setTools(prev => prev.filter(t => t.id !== toolId));

  // ── Arquivos para envio ──────────────────────────────────────────────────

  const handleAddMediaFile = () => {
    if (!mediaFileForm.name?.trim() || !mediaFileForm.url?.trim()) {
      alert('Nome e URL do arquivo são obrigatórios.'); return;
    }
    const newFile: MediaFile = {
      id: crypto.randomUUID(),
      name: mediaFileForm.name.trim(),
      description: mediaFileForm.description?.trim() || '',
      url: mediaFileForm.url.trim(),
    };
    setMediaFiles(prev => [...prev, newFile]);
    setMediaFileForm({});
    setShowMediaFileForm(false);
  };

  const handleDeleteMediaFile = (fileId: string) => setMediaFiles(prev => prev.filter(f => f.id !== fileId));

  const handleUploadMediaFile = async (file: File) => {
    if (!user) return;
    setUploadingMediaFile(true);
    setMediaUploadError("");
    try {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : '';
      const path = `${user.id}/${crypto.randomUUID()}${ext ? `.${ext}` : ''}`;
      const { error } = await supabase.storage.from('agent-media').upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from('agent-media').getPublicUrl(path);
      setMediaFileForm(p => ({
        ...p,
        url: data.publicUrl,
        name: p.name?.trim() ? p.name : file.name.replace(/\.[^.]+$/, ''),
      }));
    } catch (e: any) {
      setMediaUploadError(e.message || 'Erro ao enviar arquivo.');
    } finally {
      setUploadingMediaFile(false);
    }
  };

  const handleConnectWhatsapp = async (bypassModal = false) => {
    if (isNew) {
        alert("Salve o agente primeiro antes de conectar canais!");
        return;
    }
    if (!bypassModal && !showInstanceModal) {
      setShowInstanceModal(true);
      return;
    }
    
    setWaLoading(true);
    setShowInstanceModal(false);
    
    const finalInstanceName = customInstanceName.trim() ? `agent_${id}_${customInstanceName.trim().replace(/\s+/g, '')}` : `agent_${id}`;
    
    try {
      // 1. Cria a instância
      const res = await fetch('/api/evolution/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          instanceName: finalInstanceName,
          webhookUrl: "https://windmill.seureview.com.br/api/w/foodsnap/jobs/run/f/u/bevervansomarcio/synapse_bot?token=vHf6OR2Op9k6rbZvc0upAAa0XpHMlpJu"
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
         throw new Error(data.error || "Erro desconhecido ao criar instância");
      }
      
      // 2. Busca o QR Code
      setCheckingWa(true);
      fetchQrCode(finalInstanceName);
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao conectar Whatsapp: ${e.message}`);
      setWaLoading(false);
    }
  };

  const fetchQrCode = async (instName: string = `agent_${id}`) => {
     try {
       const res = await fetch(`/api/evolution/instances/${instName}/connect`);
       if (res.ok) {
         const data = await res.json();
         if (data.instance?.state === 'open') {
            setWaConnected(true);
            setWaQrCode("");
            setWaLoading(false);
            setCheckingWa(false);
            supabase.from('agents').update({ status: 'online' }).eq('id', id).then();
            return; // Conectado!
         }
         
         if (data.base64) {
             setWaQrCode(data.base64);
             setWaLoading(false);
         } else if (data.instance?.qr) {
            setWaQrCode(data.instance.qr); // A API retorna o base64 do QR Code geralmente
            setWaLoading(false);
         } else if (data.instance?.qrcode?.base64) {
            // Em versoes antigas
            setWaQrCode(data.instance.qrcode.base64);
            setWaLoading(false);
         }
       }
     } catch (e) {
       console.log(e);
       setWaLoading(false);
     }
     
     // Continua checando se checkingWa estiver true, porem no state atual do component ele nao reflete no setTimeout imediatamente o closure
     // mas como o setState eh assincrono, melhor passar 5000ms direto (em app real pode precisar de useRef)
     setTimeout(() => {
        setCheckingWa(current => {
           if (current) fetchQrCode(instName);
           return current;
        });
     }, 4000);
  };


  const handleDisconnectWhatsapp = async () => {
    if (!confirm("Tem certeza que deseja desconectar?")) return;
    setWaLoading(true);
    try {
      await fetch(`/api/evolution/instances/agent_${id}`, { method: 'DELETE' });
      setWaConnected(false);
      setWaQrCode("");
      setCheckingWa(false);
      supabase.from('agents').update({ status: 'offline' }).eq('id', id).then();
    } catch (e) {
      alert("Erro ao desconectar");
    } finally {
      setWaLoading(false);
    }
  };

  const webhookUrl = webhookOrigin ? `${webhookOrigin}/api/meta/webhook` : "/api/meta/webhook";

  const copyToClipboard = (value: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
  };

  // Valida as credenciais da Meta na Graph API e, se ok, persiste o canal.
  const handleTestMeta = async () => {
    if (isNew) {
      alert("Salve o agente primeiro antes de conectar canais!");
      return;
    }
    if (!metaCostAck) {
      setMetaTestMsg({ ok: false, text: "Confirme que entendeu a cobrança por mensagem da Meta antes de conectar." });
      return;
    }
    if (!metaPhoneNumberId.trim() || !metaAccessToken.trim()) {
      setMetaTestMsg({ ok: false, text: "Preencha o Phone Number ID e o Token de Acesso." });
      return;
    }
    setMetaTesting(true);
    setMetaTestMsg(null);
    try {
      const res = await fetch("/api/meta/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId: metaPhoneNumberId.trim(),
          accessToken: metaAccessToken.trim(),
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setMetaConnected(false);
        setMetaTestMsg({ ok: false, text: data.error || "Não foi possível validar as credenciais." });
        return;
      }

      // Persiste o canal Meta na config do agente (mesclando com o que já existe).
      const { data: existing } = await supabase.from("agents").select("config").eq("id", id).single();
      const cfg = (existing?.config && typeof existing.config === "object") ? existing.config : {};
      cfg.whatsapp = {
        provider: "meta",
        meta: {
          phoneNumberId: metaPhoneNumberId.trim(),
          accessToken: metaAccessToken.trim(),
          wabaId: metaWabaId.trim(),
          verifyToken: metaVerifyToken.trim(),
          connected: true,
          costAcknowledged: metaCostAck,
        },
      };
      await supabase.from("agents").update({ config: cfg, status: "online" }).eq("id", id);

      setWhatsappProvider("meta");
      setMetaConnected(true);
      const numLabel = data.displayPhoneNumber ? ` (${data.displayPhoneNumber})` : "";
      const nameLabel = data.verifiedName ? `${data.verifiedName}` : "Número verificado";
      setMetaTestMsg({ ok: true, text: `Conectado: ${nameLabel}${numLabel}. Cadastre o webhook na Meta para começar a receber mensagens.` });
    } catch (e: any) {
      setMetaConnected(false);
      setMetaTestMsg({ ok: false, text: e.message || "Erro ao testar conexão." });
    } finally {
      setMetaTesting(false);
    }
  };

  const applyTemplate = (tpl: PromptTemplate) => {
    const interpolated = interpolateTemplate(tpl, agentName, role, niche);
    setSystemPrompt(interpolated);
    setLimitations(tpl.limitations);
    if (!tone || tone === "Profissional e Direto") setTone(tpl.tone);
    if (!role) setRole(tpl.role);
    if (tpl.enableDataRecords) setDataRecordsEnabled(true);
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
${limitations.map(l => "- " + l).join("\n") || "- Nenhuma limitação definida ainda."}`;
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

  const handleDisconnectMeta = async () => {
    if (!confirm("Desconectar o WhatsApp Oficial (Meta) deste agente?")) return;
    try {
      const { data: existing } = await supabase.from("agents").select("config").eq("id", id).single();
      const cfg = (existing?.config && typeof existing.config === "object") ? existing.config : {};
      if (cfg.whatsapp?.meta) cfg.whatsapp.meta.connected = false;
      await supabase.from("agents").update({ config: cfg, status: "offline" }).eq("id", id);
      setMetaConnected(false);
      setMetaTestMsg(null);
    } catch (e) {
      alert("Erro ao desconectar.");
    }
  };

  const fetchAgent = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      if (data) {
        setAgentName(data.name || "");
        if (data.system_prompt) setSystemPrompt(data.system_prompt);
        if (data.config) {
          const cfg = typeof data.config === 'string' ? JSON.parse(data.config) : data.config;
          if (cfg.model) setSelectedModel(cfg.model);
          if (cfg.role) setRole(cfg.role);
          if (cfg.niche) setNiche(cfg.niche);
          if (cfg.tone) setTone(cfg.tone);
          if (cfg.greeting) setGreeting(cfg.greeting);
          if (cfg.typingSpeed) setTypingSpeed(cfg.typingSpeed);
          if (cfg.voice_enabled !== undefined) setVoiceEnabled(cfg.voice_enabled);
          if (cfg.voice_voice) setVoiceVoice(cfg.voice_voice);
          if (cfg.limitations && Array.isArray(cfg.limitations)) setLimitations(cfg.limitations);
          if (cfg.ignoreGroups !== undefined) setIgnoreGroups(cfg.ignoreGroups);
          if (cfg.dataRecordsEnabled !== undefined) setDataRecordsEnabled(cfg.dataRecordsEnabled);
          if (cfg.handoffPhone) setHandoffPhone(cfg.handoffPhone);
          if (cfg.blocklist && Array.isArray(cfg.blocklist)) setBlocklist(cfg.blocklist);
          if (cfg.tags && Array.isArray(cfg.tags)) {
            setTags(cfg.tags);
          }
          if (cfg.variables) {
            if (Array.isArray(cfg.variables)) {
              setVariables(cfg.variables);
            } else {
              const converted = Object.entries(cfg.variables).map(([k, v]) => ({
                key: k,
                value: String(v)
              }));
              setVariables(converted);
            }
          }
          if (cfg.tools && Array.isArray(cfg.tools)) setTools(cfg.tools);
          if (cfg.mediaFiles && Array.isArray(cfg.mediaFiles)) setMediaFiles(cfg.mediaFiles);
          if (cfg.whatsapp) {
            const wa = cfg.whatsapp;
            if (wa.provider === 'meta' || wa.provider === 'evolution') setWhatsappProvider(wa.provider);
            if (wa.meta) {
              if (wa.meta.phoneNumberId) setMetaPhoneNumberId(wa.meta.phoneNumberId);
              if (wa.meta.accessToken) setMetaAccessToken(wa.meta.accessToken);
              if (wa.meta.wabaId) setMetaWabaId(wa.meta.wabaId);
              if (wa.meta.verifyToken) setMetaVerifyToken(wa.meta.verifyToken);
              if (wa.meta.connected) setMetaConnected(true);
              if (wa.meta.costAcknowledged) setMetaCostAck(true);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar agente:', error);
    } finally {
      setLoading(false);
    }
  };

  const playVoicePreview = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    const audioUrl = `https://cdn.openai.com/API/docs/audio/${voiceVoice}.wav`;
    currentAudioRef.current = new Audio(audioUrl);
    currentAudioRef.current.play().catch(e => console.error("Error playing audio preview", e));
  };

  const handleCreateAndContinue = async () => {
    if (!user) return;
    if (!agentName.trim()) {
      alert("Por favor, preencha o nome do seu agente virtual.");
      return;
    }
    setSaving(true);

    const varsObject: Record<string, string> = {};
    variables.forEach(v => {
      if (v.key.trim()) {
        varsObject[v.key.trim()] = v.value;
      }
    });

    const configData = {
      model: selectedModel,
      role: role,
      niche: niche,
      tone: tone,
      greeting: greeting,
      typingSpeed: typingSpeed,
      voice_enabled: voiceEnabled,
      voice_voice: voiceVoice,
      limitations: limitations,
      ignoreGroups: ignoreGroups,
      dataRecordsEnabled: dataRecordsEnabled,
      handoffPhone: handoffPhone.trim(),
      blocklist: blocklist,
      tags: tags,
      variables: varsObject,
      tools: tools,
      mediaFiles: mediaFiles,
      whatsapp: {
        provider: whatsappProvider,
        meta: {
          phoneNumberId: metaPhoneNumberId.trim(),
          accessToken: metaAccessToken.trim(),
          wabaId: metaWabaId.trim(),
          verifyToken: metaVerifyToken.trim(),
          connected: metaConnected,
          costAcknowledged: metaCostAck
        }
      }
    };

    try {
      const { data, error } = await supabase
        .from('agents')
        .insert([{
          user_id: user.id,
          name: agentName,
          type: 'atendimento',
          system_prompt: systemPrompt,
          status: 'offline',
          config: configData
        }])
        .select();
      if (error) throw error;
      if (data && data.length > 0) {
        navigate.push(`/app/agents/${data[0].id}?setup=whatsapp`);
      }
    } catch (error) {
      console.error('Erro ao criar agente:', error);
      alert('Erro ao criar agente.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const varsObject: Record<string, string> = {};
    variables.forEach(v => {
      if (v.key.trim()) {
        varsObject[v.key.trim()] = v.value;
      }
    });

    const configData = {
      model: selectedModel,
      role: role,
      niche: niche,
      tone: tone,
      greeting: greeting,
      typingSpeed: typingSpeed,
      voice_enabled: voiceEnabled,
      voice_voice: voiceVoice,
      limitations: limitations,
      ignoreGroups: ignoreGroups,
      dataRecordsEnabled: dataRecordsEnabled,
      handoffPhone: handoffPhone.trim(),
      blocklist: blocklist,
      tags: tags,
      variables: varsObject,
      tools: tools,
      mediaFiles: mediaFiles,
      whatsapp: {
        provider: whatsappProvider,
        meta: {
          phoneNumberId: metaPhoneNumberId.trim(),
          accessToken: metaAccessToken.trim(),
          wabaId: metaWabaId.trim(),
          verifyToken: metaVerifyToken.trim(),
          connected: metaConnected,
          costAcknowledged: metaCostAck
        }
      }
    };

    try {
      // handleSave só é chamado no modo edição (o modo isNew retorna cedo e usa
      // handleCreateAndContinue), então aqui é sempre update de agente existente.
      const { error } = await supabase
        .from('agents')
        .update({
          name: agentName,
          system_prompt: systemPrompt,
          config: configData
        })
        .eq('id', id);
      if (error) throw error;
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar agente:', error);
      alert('Erro ao salvar o agente.');
    } finally {
      setSaving(false);
    }
  };

  const addonsLocked = userPlan === "basico";

  const tabs = [
    { id: "identity", label: "Identidade", icon: Bot },
    { id: "personality", label: "Personalidade", icon: Smile },
    { id: "config", label: "Configurações", icon: Settings },
    { id: "addons", label: "Addons", icon: Puzzle },
    { id: "instructions", label: "Personalizada", icon: ShieldAlert },
    { id: "tags", label: "Tags e Variáveis", icon: FileText },
    { id: "knowledge", label: "Arquivos RAG", icon: Database },
    { id: "channels", label: "Canais", icon: Zap },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (isNew) {
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
              <Input 
                id="wiz-name" 
                placeholder="Ex: Lucas, Sofia, Amanda..." 
                value={agentName} 
                onChange={(e) => setAgentName(e.target.value)} 
              />
              <p className="text-xs text-muted-foreground">O nome que os clientes verão nas conversas.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wiz-niche">Nicho de Atuação / Segmento</Label>
              <Input 
                id="wiz-niche" 
                placeholder="Ex: Imobiliária, Clínica Odontológica, SaaS..." 
                value={niche} 
                onChange={(e) => setNiche(e.target.value)} 
              />
              <p className="text-xs text-muted-foreground">O nicho de atuação ajuda a IA a compreender o contexto do seu negócio.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="wiz-role">Cargo ou Função (Opcional)</Label>
              <Input 
                id="wiz-role" 
                placeholder="Ex: Especialista em Vendas, Suporte ao Cliente..." 
                value={role} 
                onChange={(e) => setRole(e.target.value)} 
              />
            </div>
            
            <div className="pt-4 border-t border-border flex justify-end">
              <Button 
                className="gap-2 bg-brand-600 hover:bg-brand-700 text-white" 
                onClick={handleCreateAndContinue} 
                disabled={saving}
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

  if (setupStep === "whatsapp") {
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
            <CardDescription>
              Para que seu robô de IA consiga enviar e responder mensagens do mundo real, ele precisa estar conectado a uma instância de WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-brand-500/10 border border-brand-500/20 rounded-lg text-sm text-brand-200">
              <div className="font-semibold mb-1">O que é uma Instância?</div>
              Uma instância é o canal seguro que conecta o seu número de WhatsApp à automação do agente. Ela atua como a voz do seu bot.
            </div>

            {!waConnected && !checkingWa && (
              <div className="space-y-4">
                <div className="p-3 bg-secondary/30 border border-border rounded-lg text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Identificador da instância:</span> agent_{id}_{customInstanceName}
                  <p className="mt-1">Gerado automaticamente a partir do nome do agente e vinculado à sua conta — não é necessário escolher um nome.</p>
                </div>

                <Button
                  className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleConnectWhatsapp(true)}
                  disabled={waLoading}
                >
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
                      {waQrCode.startsWith('data:image') ? (
                        <img src={waQrCode} alt="WhatsApp QR Code" className="w-56 h-56" />
                      ) : (
                        <img src={`data:image/png;base64,${waQrCode}`} alt="WhatsApp QR Code" className="w-56 h-56" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground max-w-sm mb-6">
                      Abra o WhatsApp no seu smartphone, vá em <b>Aparelhos Conectados</b> &gt; <b>Conectar Aparelho</b> e mire a câmera no QR Code.
                    </p>
                    
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="sm" onClick={() => { setWaLoading(true); fetchQrCode(customInstanceName ? `agent_${id}_${customInstanceName.trim().replace(/\s+/g, '')}` : `agent_${id}`); }} disabled={waLoading}>
                        Atualizar QR Code
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setCheckingWa(false); setWaQrCode(""); }}>
                        Alterar Nome/Voltar
                      </Button>
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
                
                <Button 
                  className="bg-brand-600 hover:bg-brand-700 text-white w-full max-w-xs"
                  onClick={() => navigate.push(`/app/agents/${id}`)}
                >
                  Ir para Painel do Agente 🎉
                </Button>
              </div>
            )}

            {!waConnected && (
              <div className="pt-6 border-t border-border flex justify-between text-xs text-muted-foreground">
                <p>Opcional: Você também pode realizar as configurações avançadas primeiro.</p>
                <button 
                  className="text-brand-400 hover:text-brand-300 font-medium" 
                  onClick={() => navigate.push(`/app/agents/${id}`)}
                >
                  Ir para Configurações Avançadas &gt;
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-10 bg-background/95 backdrop-blur py-4 border-b border-border">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate.push("/app/agents")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight truncate">{isNew ? "Novo Agente Virtual" : "Configurar Agente"}</h2>
            <p className="text-muted-foreground text-sm">Treine a personalidade e os limites da inteligência artificial.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex-1 md:flex-initial">Testar no Chat</Button>
          <Button className="gap-2 flex-1 md:flex-initial" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar e Publicar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.id === "addons" && addonsLocked && (
                  <Badge variant="outline" className="ml-auto text-[10px] h-4 bg-brand-500/10 text-brand-500 border-0">PRO</Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="md:col-span-4 space-y-6">
          {activeTab === "identity" && (
            <Card>
              <CardHeader>
                <CardTitle>Identidade do Agente</CardTitle>
                <CardDescription>Como o agente vai se apresentar para os seus clientes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Agente</Label>
                    <Input id="name" placeholder="Ex: Lucas" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Cargo ou Função</Label>
                    <Input id="role" placeholder="Ex: Especialista em Vendas" value={role} onChange={(e) => setRole(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="niche">Nicho de Atuação</Label>
                  <Input id="niche" placeholder="Ex: Imobiliária, Clínica Odontológica, SaaS" value={niche} onChange={(e) => setNiche(e.target.value)} />
                  <p className="text-xs text-muted-foreground">O agente usará conhecimento específico deste nicho ao falar.</p>
                </div>
                <div className="space-y-2 pb-4">
                  <Label>Foto de Perfil (Opcional para canal Web)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="h-16 w-16 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground">
                      <Bot className="h-8 w-8" />
                    </div>
                    <Button variant="outline" size="sm">Fazer Upload</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "config" && (
            <Card>
              <CardHeader>
                <CardTitle>Motor de Inteligência</CardTitle>
                <CardDescription>Escolha qual modelo de IA vai processar as respostas deste agente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3">
                    <div
                      className={`p-3 rounded-lg border cursor-pointer relative transition-colors ${selectedModel === 'gemini-2.5-flash' ? 'border-brand-500 bg-brand-500/10' : 'border-border bg-card hover:border-muted-foreground/50'}`}
                      onClick={() => setSelectedModel('gemini-2.5-flash')}
                    >
                      {selectedModel === 'gemini-2.5-flash' && (
                        <div className="absolute top-3 right-3 flex items-center h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                        </div>
                      )}
                      <div className={`font-medium text-sm ${selectedModel === 'gemini-2.5-flash' ? 'text-brand-200' : 'text-foreground'}`}>Google Gemini</div>
                      <div className={`text-[11px] mt-1 ${selectedModel === 'gemini-2.5-flash' ? 'text-brand-400/80' : 'text-muted-foreground'}`}>Extremamente rápido, ideal para grande volume. Padrão.</div>
                    </div>
                    <div
                      className={`p-3 rounded-lg border cursor-pointer relative transition-colors ${selectedModel === 'gpt-5.4-mini' ? 'border-brand-500 bg-brand-500/10' : 'border-border bg-card hover:border-muted-foreground/50'}`}
                      onClick={() => setSelectedModel('gpt-5.4-mini')}
                    >
                      {selectedModel === 'gpt-5.4-mini' && (
                        <div className="absolute top-3 right-3 flex items-center h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                        </div>
                      )}
                      <div className={`font-medium text-sm ${selectedModel === 'gpt-5.4-mini' ? 'text-brand-200' : 'text-foreground'}`}>OpenAI</div>
                      <div className={`text-[11px] mt-1 ${selectedModel === 'gpt-5.4-mini' ? 'text-brand-400/80' : 'text-muted-foreground'}`}>Avançado, balanceado em custo e inteligência geral.</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "personality" && (
            <Card>
              <CardHeader>
                <CardTitle>Personalidade</CardTitle>
                <CardDescription>Defina o tom de voz, a saudação e o ritmo de resposta do agente.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Tom de Voz Principal</Label>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
                    {["Profissional e Direto", "Amigável e Empático", "Descontraído (Usa Emojis)", "Técnico e Especialista"].map((t) => (
                      <div
                        key={t}
                        onClick={() => setTone(t)}
                        className={`p-3 rounded-lg border text-sm cursor-pointer transition-colors ${tone === t ? "border-brand-500 bg-brand-500/10 text-brand-200" : "border-border bg-card hover:border-muted-foreground/50 text-muted-foreground"}`}
                      >
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="greeting">Mensagem de Saudação (Opcional)</Label>
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-brand-400 hover:text-brand-300" onClick={() => setShowGreetingAI(!showGreetingAI)}>
                      <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                      Gerar com IA
                    </Button>
                  </div>
                  {showGreetingAI && (
                    <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
                      <Input
                        placeholder="Descreva como você quer que o bot se apresente..."
                        value={greetingAIDescription}
                        onChange={(e) => setGreetingAIDescription(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleGenerateGreeting(); } }}
                        disabled={greetingAILoading}
                      />
                      <Button size="sm" className="shrink-0" onClick={handleGenerateGreeting} disabled={greetingAILoading || !greetingAIDescription.trim()}>
                        {greetingAILoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar"}
                      </Button>
                    </div>
                  )}
                  <Textarea id="greeting" placeholder="Ex: Olá! Sou o Lucas, da empresa X. Como posso ajudar você hoje?" value={greeting} onChange={(e) => setGreeting(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Deixe em branco para permitir que a IA decida a melhor saudação com base no contexto.</p>
                </div>
                <div className="space-y-2">
                  <Label>Tempo de Digitação (Humanização)</Label>
                  <div className="flex items-center gap-4 border border-border rounded-md p-4 bg-secondary/20">
                     <div className="flex-1">
                       <input type="range" className="w-full accent-brand-500" min="0" max="100" value={typingSpeed} onChange={(e) => setTypingSpeed(e.target.value)} />
                     </div>
                     <span className="text-sm font-medium w-16 text-right">Médio</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Simula o tempo de digitação de um ser humano antes de enviar a resposta.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "addons" && addonsLocked && (
            <Card className="border-brand-500/30 bg-brand-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Puzzle className="h-5 w-5 text-brand-500" />
                  Addons — Disponível no plano Profissional
                </CardTitle>
                <CardDescription>
                  Resposta em áudio (TTS), memória de dados e ferramentas/APIs externas fazem parte do plano Profissional (R$ 79,99/mês) e do plano Avançado (R$ 119,99/mês).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  <li>• Respostas em áudio com voz natural (TTS)</li>
                  <li>• Memória de dados — o agente guarda e consulta registros do cliente</li>
                  <li>• Ações e APIs (Tools) — o agente chama webhooks externos para agendar, buscar dados, etc.</li>
                </ul>
                <Button className="bg-brand-600 hover:bg-brand-700 text-white" onClick={() => navigate.push("/app/settings")}>
                  Fazer upgrade de plano
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === "addons" && !addonsLocked && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recursos do Agente</CardTitle>
                  <CardDescription>Ative o que este agente pode fazer.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    {/* Voz e Áudio */}
                    <div className={`rounded-lg border p-3 transition-colors ${voiceEnabled ? "border-brand-500/50 bg-brand-500/5" : "border-border bg-card"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <Volume2 className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm">Voz e Áudio</p>
                            <p className="text-xs text-muted-foreground">Responde em áudio (TTS).</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input type="checkbox" className="sr-only peer" checked={voiceEnabled} onChange={(e) => setVoiceEnabled(e.target.checked)} />
                          <div className="w-11 h-6 bg-secondary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                        </label>
                      </div>
                    </div>
                    {/* Memória de Dados */}
                    <div className={`rounded-lg border p-3 transition-colors ${dataRecordsEnabled ? "border-brand-500/50 bg-brand-500/5" : "border-border bg-card"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <Brain className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm">Memória de Dados</p>
                            <p className="text-xs text-muted-foreground">Guarda e consulta dados do cliente.</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input type="checkbox" className="sr-only peer" checked={dataRecordsEnabled} onChange={(e) => setDataRecordsEnabled(e.target.checked)} />
                          <div className="w-11 h-6 bg-secondary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                        </label>
                      </div>
                    </div>
                    {/* Ações e APIs */}
                    <button type="button" onClick={() => setShowToolsManager(v => !v)} className={`text-left rounded-lg border p-3 transition-colors ${showToolsManager ? "border-brand-500/50 bg-brand-500/5" : "border-border bg-card hover:border-brand-500/40"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <Webhook className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm">Ações e APIs</p>
                            <p className="text-xs text-muted-foreground">{tools.length > 0 ? `${tools.length} ferramenta(s) configurada(s)` : "Webhooks p/ agendar, buscar dados…"}</p>
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${showToolsManager ? "rotate-90" : ""}`} />
                      </div>
                    </button>
                    {/* Arquivos para Envio */}
                    <button type="button" onClick={() => setShowMediaManager(v => !v)} className={`text-left rounded-lg border p-3 transition-colors ${showMediaManager ? "border-brand-500/50 bg-brand-500/5" : "border-border bg-card hover:border-brand-500/40"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <FileText className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="font-medium text-sm">Arquivos para Envio</p>
                            <p className="text-xs text-muted-foreground">{mediaFiles.length > 0 ? `${mediaFiles.length} arquivo(s)` : "Catálogos, tabelas, contratos…"}</p>
                          </div>
                        </div>
                        <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${showMediaManager ? "rotate-90" : ""}`} />
                      </div>
                    </button>
                  </div>

                  {voiceEnabled && (
                    <div className="space-y-2 bg-secondary/10 p-4 rounded-md border border-border">
                      <Label>Voz da OpenAI</Label>
                      <div className="flex items-center gap-2">
                        <select value={voiceVoice} onChange={(e) => setVoiceVoice(e.target.value)} className="flex-1 bg-background border border-border rounded-md h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                          <option value="alloy">Alloy (Neutra / Masculina)</option>
                          <option value="echo">Echo (Masculina)</option>
                          <option value="fable">Fable (Expressiva / Neutra)</option>
                          <option value="onyx">Onyx (Masculina Profunda)</option>
                          <option value="nova">Nova (Feminina Dinâmica)</option>
                          <option value="shimmer">Shimmer (Feminina Calma)</option>
                        </select>
                        <Button variant="outline" size="icon" onClick={playVoicePreview} title="Ouvir exemplo">
                          <Volume2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">A voz lê em PT-BR automaticamente conforme a resposta gerada.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
          )}

          {activeTab === "config" && (
            <Card>
              <CardHeader>
                <CardTitle>Regras de Atendimento</CardTitle>
                <CardDescription>Controle quando e para quem o agente responde.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Ignorar Grupos do WhatsApp</Label>
                      <p className="text-xs text-muted-foreground mt-1">Se ativado, o bot não responderá a mensagens advindas de grupos.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={ignoreGroups} onChange={(e) => setIgnoreGroups(e.target.checked)} />
                      <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                    </label>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-border">
                  <Label htmlFor="handoffPhone">Número para Transferência (Atendimento Humano)</Label>
                  <Input
                    id="handoffPhone"
                    placeholder="Ex: 5511999999999"
                    value={handoffPhone}
                    onChange={(e) => setHandoffPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Quando o cliente pedir para falar com um atendente (ou a IA decidir escalar), a conversa é pausada e este número recebe um aviso por WhatsApp com o contexto. Deixe em branco para apenas pausar a IA, sem notificação.</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div>
                    <Label>Números Bloqueados (Exceções)</Label>
                    <p className="text-xs text-muted-foreground mt-1 mb-2">O bot ignorará atividades e conversas contendo estes números (apenas números, como 5511999999999).</p>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: 5511999999999"
                      value={newBlock}
                      onChange={(e) => setNewBlock(e.target.value)}
                      onKeyDown={(e) => {
                         if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newBlock.trim()) {
                               setBlocklist([...blocklist, newBlock.trim()]);
                               setNewBlock('');
                            }
                         }
                      }}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        if (newBlock.trim()) {
                          setBlocklist([...blocklist, newBlock.trim()]);
                          setNewBlock('');
                        }
                      }}
                    >Bloquear</Button>
                  </div>

                  {blocklist.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {blocklist.map((num, idx) => (
                        <Badge key={idx} variant="secondary" className="pl-3 pr-2 py-1.5 flex items-center gap-2">
                          {num}
                          <button onClick={() => setBlocklist(blocklist.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-foreground">
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "instructions" && (
            <Card>
              <CardHeader>
                <CardTitle>Instruções e Limites</CardTitle>
                <CardDescription>O núcleo do agente. Defina o que ele deve e não deve fazer — quanto mais detalhado, melhor ele vai se comportar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* Seletor de ponto de partida */}
                {!showTemplates ? (
                  <div className="flex flex-col sm:flex-row gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
                    <div className="flex gap-2">
                      <Info className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">
                          <strong className="text-foreground">Não sabe por onde começar?</strong> Use um template pronto para o seu nicho e personalize depois. Ou escreva do zero se preferir controle total.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)} className="text-xs h-7 whitespace-nowrap">
                        Ver Templates
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleAutoComplete} className="text-xs h-7 whitespace-nowrap">
                        Auto-completar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowInstructionsAI(!showInstructionsAI)} className="text-xs h-7 whitespace-nowrap text-brand-400 hover:text-brand-300">
                        <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                        Gerar com IA
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">Escolha um template de ponto de partida</div>
                      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowTemplates(false)}>Fechar</Button>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {PROMPT_TEMPLATES.map((tpl) => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => applyTemplate(tpl)}
                          className="text-left p-3 rounded-lg border border-border bg-card hover:border-brand-500 hover:bg-brand-500/5 transition-all group"
                        >
                          <div className="text-lg mb-1">{tpl.emoji}</div>
                          <div className="font-medium text-sm group-hover:text-brand-300 transition-colors">{tpl.label}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{tpl.description}</div>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => { setSystemPrompt(""); setShowTemplates(false); }}
                        className="text-left p-3 rounded-lg border border-dashed border-border bg-background hover:border-muted-foreground/40 transition-all"
                      >
                        <div className="text-lg mb-1">✏️</div>
                        <div className="font-medium text-sm">Escrever do zero</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">Começa com prompt em branco para controle total.</div>
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {showInstructionsAI && (
                    <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
                      <Textarea
                        className="min-h-[60px] sm:min-h-0"
                        placeholder="Descreva o que você espera que o bot faça (ex: tirar dúvidas sobre planos, agendar consultas, etc.)"
                        value={instructionsAIDescription}
                        onChange={(e) => setInstructionsAIDescription(e.target.value)}
                        disabled={instructionsAILoading}
                      />
                      <Button size="sm" className="shrink-0" onClick={handleGenerateInstructions} disabled={instructionsAILoading || !instructionsAIDescription.trim()}>
                        {instructionsAILoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar"}
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="prompt">Prompt de Instruções</Label>
                    <span className="text-[10px] text-muted-foreground">{systemPrompt.length} caracteres</span>
                  </div>
                  <Textarea
                    id="prompt"
                    className="min-h-[280px] font-mono text-sm leading-relaxed"
                    placeholder={`Você é {nome}, atendente de {empresa}.\n\n=== SUA MISSÃO ===\n...\n\n=== COMO SE COMUNICAR ===\n...\n\n=== O QUE NUNCA FAZER ===\n...`}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                  />
                  <div className="flex gap-3 p-2.5 rounded-lg bg-secondary/20 border border-border">
                    <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      <strong className="text-foreground">Dicas de escrita:</strong> Seja específico sobre o que o bot DEVE e NÃO DEVE fazer. Inclua informações sobre sua empresa, produtos e processos. Use seções com <code className="bg-secondary px-0.5 rounded">===</code> para organizar. Quanto mais contexto, menos o bot vai inventar.
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4 pt-4 border-t border-border">
                  <Label>Limites e Regras Estritas</Label>
                  <p className="text-xs text-muted-foreground">Estes limites moldarão o prompt dinâmico e protegerão sua empresa de "alucinações" ou comportamentos erráticos.</p>

                  <div className="flex gap-2">
                    <Input 
                      placeholder="Ex: Nunca passar o CNPJ da empresa" 
                      value={newLimitation} 
                      onChange={(e) => setNewLimitation(e.target.value)}
                      onKeyDown={(e) => {
                         if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newLimitation.trim()) {
                               setLimitations([...limitations, newLimitation.trim()]);
                               setNewLimitation('');
                            }
                         }
                      }}
                    />
                    <Button 
                      variant="secondary"
                      onClick={() => {
                        if (newLimitation.trim()) {
                          setLimitations([...limitations, newLimitation.trim()]);
                          setNewLimitation('');
                        }
                      }}
                    >Adicionar</Button>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                     {limitations.map((limit, idx) => (
                       <div key={idx} className="flex items-start gap-3 bg-secondary/30 p-3 rounded-md border border-border">
                         <div className="h-5 w-5 mt-0.5 rounded border border-brand-500 bg-brand-500/20 flex items-center justify-center shrink-0">
                           <div className="w-2.5 h-2.5 bg-brand-500 rounded-sm" />
                         </div>
                         <div className="flex-1">
                           <div className="text-sm font-medium">{limit}</div>
                         </div>
                         <Button variant="ghost" size="sm" className="h-6 px-2 text-destructive" onClick={() => {
                           setLimitations(limitations.filter((_, i) => i !== idx));
                         }}>
                           Remover
                         </Button>
                       </div>
                     ))}
                      {limitations.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-4 border rounded-md border-dashed">Nenhuma limitação definida. Adicione regras para evitar comportamentos inesperados.</div>
                     )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "knowledge" && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Base de Conhecimento (RAG)</CardTitle>
                    <CardDescription>Adicione textos ou URLs. A IA busca automaticamente quando precisar responder sobre o seu negócio.</CardDescription>
                  </div>
                  {!isNew && (
                    <Button size="sm" className="gap-2 shrink-0" onClick={() => setShowKnowledgeForm(v => !v)}>
                      <Plus className="h-4 w-4" /> Adicionar
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isNew && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                    Salve o agente primeiro para adicionar conhecimento.
                  </div>
                )}

                {showKnowledgeForm && (
                  <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/10">
                    <div className="flex gap-2">
                      <Button size="sm" variant={knowledgeForm.sourceType === 'text' ? 'default' : 'outline'}
                        onClick={() => setKnowledgeForm(p => ({ ...p, sourceType: 'text' }))}>
                        <FileText className="h-3 w-3 mr-1" /> Texto
                      </Button>
                      <Button size="sm" variant={knowledgeForm.sourceType === 'url' ? 'default' : 'outline'}
                        onClick={() => setKnowledgeForm(p => ({ ...p, sourceType: 'url' }))}>
                        <Globe className="h-3 w-3 mr-1" /> URL
                      </Button>
                      <Button size="sm" variant={knowledgeForm.sourceType === 'sitemap' ? 'default' : 'outline'}
                        onClick={() => setKnowledgeForm(p => ({ ...p, sourceType: 'sitemap' }))}>
                        <Globe className="h-3 w-3 mr-1" /> Catálogo (Sitemap)
                      </Button>
                    </div>

                    {knowledgeForm.sourceType === 'sitemap' ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Importa várias páginas de uma vez (ex: fichas de imóveis/produtos) a partir de um sitemap.xml — cada página vira uma entrada separada na base.
                        </p>
                        <Input placeholder="https://meusite.com/sitemap.xml" value={sitemapForm.sitemapUrl}
                          onChange={e => setSitemapForm(p => ({ ...p, sitemapUrl: e.target.value }))} />
                        <Input placeholder="Filtro de URL (opcional, ex: /imovel/)" value={sitemapForm.urlFilter}
                          onChange={e => setSitemapForm(p => ({ ...p, urlFilter: e.target.value }))} />
                        <div className="flex items-center gap-2">
                          <Label htmlFor="sitemap-max" className="text-xs whitespace-nowrap">Máx. de páginas</Label>
                          <Input id="sitemap-max" type="number" min={1} max={50} className="w-24" value={sitemapForm.maxItems}
                            onChange={e => setSitemapForm(p => ({ ...p, maxItems: e.target.value }))} />
                        </div>
                        {sitemapResult && (
                          <div className="text-xs p-2 rounded bg-secondary/40">
                            Importadas {sitemapResult.imported} de {sitemapResult.total} páginas.
                            {sitemapResult.errors.length > 0 && (
                              <span className="text-destructive"> {sitemapResult.errors.length} com erro.</span>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => setShowKnowledgeForm(false)}>Cancelar</Button>
                          <Button size="sm" onClick={handleImportSitemap} disabled={importingSitemap}>
                            {importingSitemap ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            {importingSitemap ? 'Importando...' : 'Importar Catálogo'}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Input placeholder="Título (ex: Tabela de Preços, FAQ, Sobre a Empresa)"
                          value={knowledgeForm.title}
                          onChange={e => setKnowledgeForm(p => ({ ...p, title: e.target.value }))} />
                        {knowledgeForm.sourceType === 'text' ? (
                          <Textarea placeholder="Cole aqui o texto: descrição dos serviços, preços, políticas, FAQ..."
                            rows={6} value={knowledgeForm.content}
                            onChange={e => setKnowledgeForm(p => ({ ...p, content: e.target.value }))} />
                        ) : (
                          <Input placeholder="https://meusite.com/sobre" value={knowledgeForm.sourceUrl}
                            onChange={e => setKnowledgeForm(p => ({ ...p, sourceUrl: e.target.value }))} />
                        )}
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" onClick={() => setShowKnowledgeForm(false)}>Cancelar</Button>
                          <Button size="sm" onClick={handleAddKnowledge} disabled={addingKnowledge}>
                            {addingKnowledge ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            {addingKnowledge ? 'Processando...' : 'Salvar e Vetorizar'}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {loadingKnowledge ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : knowledgeEntries.length === 0 && !isNew ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    <Brain className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    Nenhum conhecimento adicionado. A IA responderá com base no sistema de instruções.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {knowledgeEntries.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card">
                        <div className="flex items-center gap-3 min-w-0">
                          {entry.source_type === 'url' ? <Globe className="h-4 w-4 text-brand-500 shrink-0" /> : <FileText className="h-4 w-4 text-emerald-500 shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{entry.title}</p>
                            <p className="text-xs text-muted-foreground">{entry.chunk_count} chunks · {new Date(entry.created_at).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleDeleteKnowledge(entry.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "addons" && !addonsLocked && showToolsManager && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Ações e Integrações (Agents Tools)</CardTitle>
                    <CardDescription>
                      A IA chama automaticamente estas ferramentas quando precisar. Configure webhooks para agendar, buscar dados, enviar e-mails, etc.
                    </CardDescription>
                  </div>
                  <Button size="sm" className="gap-2 shrink-0" onClick={() => setShowToolForm(v => !v)}>
                    <Plus className="h-4 w-4" /> Nova Ferramenta
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showToolForm && (
                  <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/10">
                    <h4 className="font-medium text-sm">Nova Ferramenta</h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Nome (sem espaços)</label>
                        <Input placeholder="agendar_consulta" value={toolForm.name || ''}
                          onChange={e => setToolForm(p => ({ ...p, name: e.target.value.replace(/\s+/g, '_').toLowerCase() }))} />
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-xs text-muted-foreground mb-1 block">Método</label>
                        <select value={toolForm.method || 'POST'}
                          onChange={e => setToolForm(p => ({ ...p, method: e.target.value }))}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                          <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Descrição (diz à IA quando usar)</label>
                      <Input placeholder="Agenda uma consulta. Use quando o cliente quiser marcar um horário."
                        value={toolForm.description || ''}
                        onChange={e => setToolForm(p => ({ ...p, description: e.target.value }))} />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">URL do Webhook</label>
                      <Input placeholder="https://meuservidor.com/api/agendar"
                        value={toolForm.url || ''}
                        onChange={e => setToolForm(p => ({ ...p, url: e.target.value }))} />
                    </div>

                    {/* Headers */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Headers (opcional)</label>
                      <div className="space-y-1 mb-2">
                        {Object.entries(toolForm.headers || {}).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-2 text-xs">
                            <span className="font-mono bg-secondary px-2 py-1 rounded">{k}: {v}</span>
                            <button className="text-muted-foreground hover:text-destructive"
                              onClick={() => setToolForm(p => { const h = { ...p.headers }; delete h[k]; return { ...p, headers: h }; })}>
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input placeholder="Authorization" value={toolHeaderKey} className="h-8 text-xs"
                          onChange={e => setToolHeaderKey(e.target.value)} />
                        <Input placeholder="Bearer token..." value={toolHeaderVal} className="h-8 text-xs"
                          onChange={e => setToolHeaderVal(e.target.value)} />
                        <Button size="sm" variant="outline" className="h-8 shrink-0"
                          onClick={() => { if (toolHeaderKey.trim()) { setToolForm(p => ({ ...p, headers: { ...p.headers, [toolHeaderKey.trim()]: toolHeaderVal.trim() } })); setToolHeaderKey(''); setToolHeaderVal(''); } }}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Parâmetros */}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Parâmetros que a IA enviará</label>
                      <div className="space-y-1 mb-2">
                        {Object.entries(toolForm.parameters || {}).map(([k, v]) => (
                          <div key={k} className="flex items-center gap-2 text-xs">
                            <span className="font-mono bg-secondary px-2 py-1 rounded flex-1 truncate">
                              <strong>{k}</strong>: {v}
                              {(toolForm.required_params || []).includes(k) && <span className="text-red-400 ml-1">*</span>}
                            </span>
                            <button className="text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => setToolForm(p => { const params = { ...p.parameters }; delete params[k]; return { ...p, parameters: params, required_params: (p.required_params || []).filter(r => r !== k) }; })}>
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input placeholder="nome_param" value={toolParamKey} className="h-8 text-xs"
                          onChange={e => setToolParamKey(e.target.value)} />
                        <Input placeholder="descrição do parâmetro" value={toolParamDesc} className="h-8 text-xs"
                          onChange={e => setToolParamDesc(e.target.value)} />
                        <Button size="sm" variant="outline" className="h-8 shrink-0"
                          onClick={() => { if (toolParamKey.trim()) { setToolForm(p => ({ ...p, parameters: { ...p.parameters, [toolParamKey.trim()]: toolParamDesc.trim() || toolParamKey.trim() }, required_params: [...(p.required_params || []), toolParamKey.trim()] })); setToolParamKey(''); setToolParamDesc(''); } }}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">* Parâmetros adicionados são obrigatórios por padrão.</p>
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      <Button size="sm" variant="outline" onClick={() => { setShowToolForm(false); setToolForm({ method: 'POST', headers: {}, parameters: {}, required_params: [] }); }}>Cancelar</Button>
                      <Button size="sm" onClick={handleAddTool}>Adicionar Ferramenta</Button>
                    </div>
                  </div>
                )}

                {tools.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    <Webhook className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    Nenhuma ferramenta configurada. A IA responderá apenas com texto.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tools.map(tool => (
                      <div key={tool.id} className="flex items-start gap-3 p-3 border border-border bg-card rounded-lg">
                        <div className="mt-0.5 text-brand-500 shrink-0">
                          <Webhook className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold font-mono text-sm">{tool.name}</span>
                            <Badge variant="outline" className="text-[10px] h-4">{tool.method} {tool.url.replace(/^https?:\/\/[^/]+/, '')}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tool.description}</p>
                          {Object.keys(tool.parameters || {}).length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Params: {Object.keys(tool.parameters).join(', ')}
                            </p>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleDeleteTool(tool.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2 p-3 bg-secondary/20 rounded-lg text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Como funciona</p>
                  <p>A IA decide quando chamar cada ferramenta com base na conversa. O resultado é incorporado na resposta automaticamente.</p>
                  <p>A URL recebe um JSON com os parâmetros via POST. Retorne um objeto JSON com os dados — a IA interpreta e responde ao usuário.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "addons" && !addonsLocked && showMediaManager && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Arquivos para Envio</CardTitle>
                    <CardDescription>
                      Cadastre arquivos (catálogos, tabelas de preço, contratos, cardápios, etc.) hospedados em uma URL pública. A IA envia o arquivo certo pelo WhatsApp quando o cliente pedir.
                    </CardDescription>
                  </div>
                  <Button size="sm" className="gap-2 shrink-0" onClick={() => setShowMediaFileForm(v => !v)}>
                    <Plus className="h-4 w-4" /> Novo Arquivo
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {showMediaFileForm && (
                  <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/10">
                    <h4 className="font-medium text-sm">Novo Arquivo</h4>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Nome do arquivo</label>
                      <Input placeholder="Catálogo de Produtos" value={mediaFileForm.name || ''}
                        onChange={e => setMediaFileForm(p => ({ ...p, name: e.target.value }))} />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Descrição (ajuda a IA a saber quando enviar)</label>
                      <Input placeholder="Tabela com preços e fotos dos produtos" value={mediaFileForm.description || ''}
                        onChange={e => setMediaFileForm(p => ({ ...p, description: e.target.value }))} />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Arquivo</label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          className="text-xs"
                          disabled={uploadingMediaFile}
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadMediaFile(file);
                          }}
                        />
                        {uploadingMediaFile && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                      </div>
                      {mediaUploadError && <p className="text-xs text-destructive mt-1">{mediaUploadError}</p>}
                      {mediaFileForm.url && !uploadingMediaFile && (
                        <p className="text-xs text-emerald-500 mt-1 truncate">Arquivo enviado: {mediaFileForm.url}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Ou, se preferir, cole o link direto de um arquivo já hospedado:</p>
                      <Input className="mt-1" placeholder="https://meusite.com/catalogo.pdf" value={mediaFileForm.url || ''}
                        onChange={e => setMediaFileForm(p => ({ ...p, url: e.target.value }))} />
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
                      <Button size="sm" variant="outline" onClick={() => { setShowMediaFileForm(false); setMediaFileForm({}); }}>Cancelar</Button>
                      <Button size="sm" onClick={handleAddMediaFile}>Adicionar Arquivo</Button>
                    </div>
                  </div>
                )}

                {mediaFiles.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    <FileText className="h-8 w-8 mx-auto mb-3 opacity-30" />
                    Nenhum arquivo configurado. A IA não poderá enviar arquivos ao cliente.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mediaFiles.map(file => (
                      <div key={file.id} className="flex items-start gap-3 p-3 border border-border bg-card rounded-lg">
                        <div className="mt-0.5 text-brand-500 shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-sm">{file.name}</span>
                          {file.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{file.description}</p>}
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{file.url}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => handleDeleteMediaFile(file.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-2 p-3 bg-secondary/20 rounded-lg text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Como funciona</p>
                  <p>Quando o cliente pedir um arquivo (ex: "manda o catálogo"), a IA escolhe o arquivo certo pelo nome/descrição e o envia automaticamente pelo WhatsApp.</p>
                  <p>O link precisa ser público (acessível sem login) para que o WhatsApp consiga baixar o arquivo.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "tags" && (
            <Card>
              <CardHeader>
                <CardTitle>Tags e Variáveis</CardTitle>
                <CardDescription>
                  Defina parâmetros e marcadores dinâmicos que serão enviados no payload JSON do WhatsApp à sua automação externa.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* 1. MÓDULO DE TABS */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-1 text-foreground">Tags do Agente</h3>
                    <p className="text-xs text-muted-foreground">
                      As tags servem para categorizar o fluxo de atendimento, segmentar clientes no CRM ou ativar regras condicionais de envio.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Input 
                      placeholder="Ex: lead_quente" 
                      value={newTag} 
                      onChange={(e) => setNewTag(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      className="max-w-md font-mono text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newTag.trim()) {
                            if (!tags.includes(newTag.trim())) {
                              setTags([...tags, newTag.trim()]);
                            }
                            setNewTag('');
                          }
                        }
                      }}
                    />
                    <Button 
                      variant="secondary"
                      onClick={() => {
                        if (newTag.trim()) {
                          if (!tags.includes(newTag.trim())) {
                            setTags([...tags, newTag.trim()]);
                          }
                          setNewTag('');
                        }
                      }}
                    >
                      Adicionar Tag
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {tags.map((tag, idx) => (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="flex items-center gap-1.5 px-3 py-1 bg-brand-500/10 text-brand-500 border border-brand-500/20 font-mono text-xs rounded-full"
                      >
                        {tag}
                        <button 
                          type="button"
                          className="hover:text-brand-300 font-bold ml-1 text-xs"
                          onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                    {tags.length === 0 && (
                      <div className="text-xs text-muted-foreground italic py-2">
                        Nenhuma tag cadastrada para este agente.
                      </div>
                    )}
                  </div>
                </div>

                <hr className="border-border" />

                {/* 2. MÓDULO DE VARIÁVEIS DE CONTEXTO */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-1 text-foreground">Variáveis de Integração do Agente</h3>
                    <p className="text-xs text-muted-foreground">
                      Adicione pares de chave/valor que contêm informações personalizadas desta automação (links de agendamento, contatos extras, ids de pixel, etc).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
                    <div className="space-y-1">
                      <Label htmlFor="var-key" className="text-xs text-muted-foreground">Chave (Key)</Label>
                      <Input 
                        id="var-key"
                        placeholder="Ex: link_calendly" 
                        value={newVarKey} 
                        onChange={(e) => setNewVarKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="var-val" className="text-xs text-muted-foreground">Valor (Value)</Label>
                      <div className="flex gap-2">
                        <Input 
                          id="var-val"
                          placeholder="Ex: https://calendly.com/sua-agenda" 
                          value={newVarValue} 
                          onChange={(e) => setNewVarValue(e.target.value)}
                          className="text-xs"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (newVarKey.trim() && newVarValue.trim()) {
                                const exists = variables.some(v => v.key === newVarKey.trim());
                                if (exists) {
                                  setVariables(variables.map(v => v.key === newVarKey.trim() ? { ...v, value: newVarValue.trim() } : v));
                                } else {
                                  setVariables([...variables, { key: newVarKey.trim(), value: newVarValue.trim() }]);
                                }
                                setNewVarKey('');
                                setNewVarValue('');
                              }
                            }
                          }}
                        />
                        <Button 
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            if (newVarKey.trim() && newVarValue.trim()) {
                              const exists = variables.some(v => v.key === newVarKey.trim());
                              if (exists) {
                                setVariables(variables.map(v => v.key === newVarKey.trim() ? { ...v, value: newVarValue.trim() } : v));
                              } else {
                                setVariables([...variables, { key: newVarKey.trim(), value: newVarValue.trim() }]);
                              }
                              setNewVarKey('');
                              setNewVarValue('');
                            }
                          }}
                        >
                          Definir
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4 font-mono">
                    {variables.map((v, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border border-border bg-secondary/20 rounded-lg text-xs max-w-2xl font-mono">
                        <div className="flex items-center gap-3 truncate mr-4">
                          <span className="text-brand-400 font-semibold">{v.key}:</span>
                          <span className="text-muted-foreground truncate max-w-md">{v.value}</span>
                        </div>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="sm" 
                          className="h-7 text-destructive hover:text-destructive/80 font-semibold"
                          onClick={() => setVariables(variables.filter((_, i) => i !== idx))}
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                    {variables.length === 0 && (
                      <div className="text-xs text-muted-foreground italic py-2">
                        Nenhuma variável de contexto configurada neste agente.
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-muted/60 border rounded-lg text-xs leading-relaxed text-muted-foreground">
                  <div className="font-semibold text-foreground mb-1">Como esses dados são enviados:</div>
                  Estes valores são exportados no formato JSON sob o campo <code className="bg-secondary px-1 py-0.5 rounded text-brand-400 font-mono">config.tags</code> e <code className="bg-secondary px-1 py-0.5 rounded text-brand-400 font-mono">config.variables</code> junto com os demais dados do agente, facilitando o mapeamento nas suas automações externas!
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "channels" && (
            <Card>
              <CardHeader>
                <CardTitle>Conexão com Canais</CardTitle>
                <CardDescription>Onde este agente vai atender? Gerencie as integrações oficiais ou extraoficiais do seu bot.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border border-border rounded-lg bg-card overflow-hidden">
                   <div className="p-4 border-b border-border flex items-center gap-4">
                     <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                       <MessageSquare className="h-5 w-5 text-emerald-500" />
                     </div>
                     <div>
                       <div className="font-medium">WhatsApp</div>
                       <div className="text-xs text-muted-foreground mt-0.5">Escolha como este agente vai se conectar ao WhatsApp.</div>
                     </div>
                   </div>

                   <div className="p-4 space-y-4">
                     {/* Seletor de provedor */}
                     <div className="grid sm:grid-cols-2 gap-3">
                       <button
                         type="button"
                         onClick={() => setWhatsappProvider("evolution")}
                         className={`text-left p-3 rounded-lg border transition-all ${whatsappProvider === "evolution" ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/40" : "border-border bg-background hover:border-muted-foreground/40"}`}
                       >
                         <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                             <QrCode className="h-4 w-4 text-emerald-500" />
                             <span className="font-medium text-sm">Evolution API</span>
                           </div>
                           <Badge variant="outline" className="text-[10px] h-4 bg-emerald-500/10 text-emerald-500 border-0">Gratuito</Badge>
                         </div>
                         <ul className="text-[11px] text-muted-foreground space-y-1">
                           <li className="text-emerald-500/90">+ Conecta na hora via QR Code</li>
                           <li className="text-emerald-500/90">+ Sem custo e sem aprovação</li>
                           <li className="text-amber-500/90">− Não-oficial: risco de bloqueio</li>
                         </ul>
                       </button>

                       <button
                         type="button"
                         onClick={() => setWhatsappProvider("meta")}
                         className={`text-left p-3 rounded-lg border transition-all ${whatsappProvider === "meta" ? "border-brand-500 bg-brand-500/5 ring-1 ring-brand-500/40" : "border-border bg-background hover:border-muted-foreground/40"}`}
                       >
                         <div className="flex items-center justify-between mb-2">
                           <div className="flex items-center gap-2">
                             <ShieldCheck className="h-4 w-4 text-brand-500" />
                             <span className="font-medium text-sm">WhatsApp Oficial</span>
                           </div>
                           <Badge variant="outline" className="text-[10px] h-4 bg-brand-500/10 text-brand-500 border-0">Meta API</Badge>
                         </div>
                         <ul className="text-[11px] text-muted-foreground space-y-1">
                           <li className="text-emerald-500/90">+ Oficial, estável e sem risco de ban</li>
                           <li className="text-emerald-500/90">+ Selo verificado e escalável</li>
                           <li className="text-amber-500/90">− Exige conta Meta + cobrança por conversa</li>
                         </ul>
                       </button>
                     </div>

                     {/* Explicação do trade-off */}
                     <div className="flex gap-3 p-3 rounded-lg bg-secondary/40 border border-border">
                       <Info className="h-4 w-4 text-brand-400 shrink-0 mt-0.5" />
                       <div className="text-[11px] text-muted-foreground leading-relaxed">
                         <strong className="text-foreground">Qual escolher?</strong> Para um evento, teste rápido ou quando não compensa
                         cadastrar um número na Meta e esperar aprovação, use a <strong>Evolution</strong> — conecta em segundos
                         lendo um QR Code, de graça. Para operação contínua e profissional (alto volume, marca verificada e zero
                         risco de bloqueio), vale o <strong>WhatsApp Oficial da Meta</strong>, mesmo com o cadastro mais burocrático
                         e a cobrança por conversa.
                       </div>
                     </div>

                     {/* Painel Evolution */}
                     {whatsappProvider === "evolution" && (
                       <div className="pt-2 border-t border-border">
                         <div className="flex items-center justify-between flex-wrap gap-3">
                           <div className="flex items-center gap-3 min-w-0">
                             <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${waConnected ? "bg-emerald-500/10" : "bg-secondary"}`}>
                               <QrCode className={`h-4 w-4 ${waConnected ? "text-emerald-500" : "text-muted-foreground"}`} />
                             </div>
                             <div className="min-w-0">
                               <div className="flex items-center gap-2 flex-wrap">
                                 <div className="font-medium text-sm">Conexão via QR Code</div>
                                 {waConnected ? (
                                   <Badge variant="outline" className="text-[10px] h-4 bg-muted text-emerald-500 border-0">Conectado</Badge>
                                 ) : (
                                   <Badge variant="outline" className="text-[10px] h-4 bg-muted text-muted-foreground border-0">Desconectado</Badge>
                                 )}
                               </div>
                               <div className="text-xs text-muted-foreground mt-0.5">
                                 {waConnected
                                   ? `Instância 'agent_${id}' ativa e recebendo mensagens.`
                                   : "Escaneie o QR Code com o celular que vai atender."}
                               </div>
                             </div>
                           </div>
                           {waConnected ? (
                             <Button onClick={handleDisconnectWhatsapp} variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 border-destructive/20" disabled={waLoading}>
                               {waLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Desconectar"}
                             </Button>
                           ) : (
                             <Button onClick={() => handleConnectWhatsapp()} variant="outline" size="sm" disabled={waLoading || isNew}>
                               {waLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Conectar via QR"}
                             </Button>
                           )}
                         </div>

                         {waQrCode && !waConnected && (
                           <div className="mt-6 pt-4 border-t border-border flex flex-col items-center justify-center">
                             <p className="text-sm font-medium mb-4">Escaneie o QR Code com seu WhatsApp</p>
                             <div className="bg-white p-2 rounded-xl mb-4">
                               {waQrCode.startsWith("data:image") ? (
                                 <img src={waQrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
                               ) : (
                                 <img src={`data:image/png;base64,${waQrCode}`} alt="WhatsApp QR Code" className="w-48 h-48" />
                               )}
                             </div>
                             <div className="flex items-center gap-2">
                               <Button variant="outline" onClick={() => { setWaLoading(true); fetchQrCode(customInstanceName ? `agent_${id}_${customInstanceName.trim().replace(/\s+/g, '')}` : `agent_${id}`); }} disabled={waLoading}>
                                 {waLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                 Atualizar QR
                               </Button>
                               <Button variant="ghost" onClick={() => setCheckingWa(false)}>Cancelar</Button>
                             </div>
                           </div>
                         )}
                       </div>
                     )}

                     {/* Painel Meta Oficial */}
                     {whatsappProvider === "meta" && (
                       <div className="pt-2 border-t border-border space-y-5">
                         <div className="flex items-center justify-between flex-wrap gap-2">
                           <div className="flex items-center gap-2 flex-wrap">
                             <ShieldCheck className="h-4 w-4 text-brand-500" />
                             <span className="font-medium text-sm">WhatsApp Cloud API</span>
                             {metaConnected ? (
                               <Badge variant="outline" className="text-[10px] h-4 bg-muted text-emerald-500 border-0">Conectado</Badge>
                             ) : (
                               <Badge variant="outline" className="text-[10px] h-4 bg-muted text-muted-foreground border-0">Não conectado</Badge>
                             )}
                           </div>
                           {metaConnected && (
                             <Button onClick={handleDisconnectMeta} variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 h-7">Desconectar</Button>
                           )}
                         </div>

                         {/* Aviso de custo por mensagem cobrado pela Meta */}
                         <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                           <div className="flex gap-2">
                             <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                             <div className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                               <strong className="text-foreground">Atenção: a Meta cobra por mensagem/conversa.</strong> Ao usar o WhatsApp Cloud API oficial,
                               toda conversa iniciada fora da janela gratuita de 24h é cobrada pela Meta <strong>diretamente na sua conta Meta Business</strong> —
                               esse custo não é cobrado pela BizPilot e varia por categoria de mensagem e país.
                             </div>
                           </div>
                           <label className="flex items-center gap-2 mt-3 text-xs cursor-pointer">
                             <input type="checkbox" className="h-4 w-4 accent-brand-500" checked={metaCostAck} onChange={(e) => setMetaCostAck(e.target.checked)} />
                             Entendi e estou de acordo com a cobrança por mensagem feita pela Meta.
                           </label>
                         </div>

                         {/* Passo 1: credenciais */}
                         <div className={`space-y-3 ${!metaCostAck ? "opacity-50 pointer-events-none" : ""}`}>
                           <div className="text-xs font-semibold text-foreground">1. Cole as credenciais do seu app na Meta</div>
                           <div className="space-y-1.5">
                             <Label className="text-xs">Phone Number ID</Label>
                             <Input value={metaPhoneNumberId} onChange={(e) => setMetaPhoneNumberId(e.target.value)} placeholder="Ex: 109987654321000" disabled={!metaCostAck} />
                           </div>
                           <div className="space-y-1.5">
                             <Label className="text-xs">Token de Acesso Permanente</Label>
                             <Input type="password" value={metaAccessToken} onChange={(e) => setMetaAccessToken(e.target.value)} placeholder="EAAG..." disabled={!metaCostAck} />
                             <p className="text-[10px] text-muted-foreground">Gere um token permanente em Meta Business → Usuários do Sistema.</p>
                           </div>
                           <div className="space-y-1.5">
                             <Label className="text-xs">WhatsApp Business Account ID (opcional)</Label>
                             <Input value={metaWabaId} onChange={(e) => setMetaWabaId(e.target.value)} placeholder="Ex: 220712345678900" disabled={!metaCostAck} />
                           </div>
                         </div>

                         {/* Passo 2: webhook */}
                         <div className="space-y-3">
                           <div className="text-xs font-semibold text-foreground">2. Cadastre o webhook no painel da Meta</div>
                           <div className="space-y-1.5">
                             <Label className="text-xs">URL de Callback</Label>
                             <div className="flex gap-2">
                               <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                               <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => copyToClipboard(webhookUrl)}><Copy className="h-4 w-4" /></Button>
                             </div>
                           </div>
                           <div className="space-y-1.5">
                             <Label className="text-xs">Token de Verificação</Label>
                             <div className="flex gap-2">
                               <Input readOnly value={metaVerifyToken} className="font-mono text-xs" />
                               <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => copyToClipboard(metaVerifyToken)}><Copy className="h-4 w-4" /></Button>
                             </div>
                           </div>
                           <p className="text-[10px] text-muted-foreground">
                             No painel da Meta, em <strong>WhatsApp → Configuration → Webhook</strong>, cole a URL e o token acima e
                             assine o campo <strong>messages</strong>.
                           </p>
                         </div>

                         {metaTestMsg && (
                           <div className={`flex gap-2 p-2.5 rounded-lg text-xs ${metaTestMsg.ok ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-500"}`}>
                             {metaTestMsg.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                             <span>{metaTestMsg.text}</span>
                           </div>
                         )}

                         <Button onClick={handleTestMeta} disabled={metaTesting || isNew || !metaCostAck} className="w-full">
                           {metaTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                           Testar e Conectar
                         </Button>
                         {isNew && <p className="text-[10px] text-muted-foreground text-center">Salve o agente antes de conectar um canal.</p>}
                       </div>
                     )}
                   </div>
                </div>
                
                <div className="flex items-center justify-between gap-3 p-4 border border-border bg-card rounded-lg relative overflow-hidden">
                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500 rounded-l-lg" />
                   <div className="flex items-center gap-4 ml-2 min-w-0">
                     <div className="h-10 w-10 bg-pink-500/10 rounded-lg flex items-center justify-center shrink-0">
                       <MessageSquare className="h-5 w-5 text-pink-500" />
                     </div>
                     <div className="min-w-0">
                       <div className="flex items-center gap-2 flex-wrap">
                         <div className="font-medium text-foreground">Instagram Direct</div>
                         <Badge variant="outline" className="text-[10px] h-4 bg-brand-500/10 text-brand-500 border-0">Meta Graph API</Badge>
                       </div>
                       <div className="text-xs text-muted-foreground mt-0.5">Responda DMs, automações em Stories e Posts no Instagram.</div>
                     </div>
                   </div>
                   <Button variant="outline" size="sm" className="hidden sm:inline-flex shrink-0">Conectar Instagram</Button>
                </div>

                <div className="flex items-center justify-between gap-3 p-4 border border-border bg-card rounded-lg relative overflow-hidden">
                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-lg" />
                   <div className="flex items-center gap-4 ml-2 min-w-0">
                     <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0">
                       <MessageSquare className="h-5 w-5 text-blue-500" />
                     </div>
                     <div className="min-w-0">
                       <div className="flex items-center gap-2 flex-wrap">
                         <div className="font-medium">Facebook Messenger</div>
                         <Badge variant="outline" className="text-[10px] h-4 bg-brand-500/10 text-brand-500 border-0">Meta Graph API</Badge>
                       </div>
                       <div className="text-xs text-muted-foreground mt-0.5">Conecte com sua página para atender inbox automaticamente.</div>
                     </div>
                   </div>
                   <Button variant="outline" size="sm" className="hidden sm:inline-flex shrink-0">Conectar Página</Button>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3 p-4 border border-border rounded-lg bg-card mt-6">
                   <div className="flex items-center gap-4 min-w-0">
                     <div className="h-10 w-10 bg-brand-500/10 rounded-lg flex items-center justify-center shrink-0">
                       <Smartphone className="h-5 w-5 text-brand-500" />
                     </div>
                     <div className="min-w-0">
                       <div className="font-medium">Chat Web (Widget)</div>
                       <div className="text-xs text-muted-foreground mt-0.5">Incorpore este agente diretamente no seu site.</div>
                     </div>
                   </div>
                   <Button variant="outline" size="sm">Gerar Código</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {showInstanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-2">Conectar Instância do WhatsApp</h3>
            <p className="text-sm text-muted-foreground mb-4">Crie uma nova instância para vincular o WhatsApp deste agente.</p>
            
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Input 
                  placeholder="Nome (ex: suporte_oficial)" 
                  value={customInstanceName} 
                  onChange={(e) => setCustomInstanceName(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">O nome não deve conter espaços. A IA se referenciará por este nome.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowInstanceModal(false)} disabled={waLoading}>Cancelar</Button>
              <Button type="button" onClick={() => handleConnectWhatsapp(true)} disabled={waLoading || !customInstanceName.trim()}>
                {waLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Avançar para o QR Code
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
