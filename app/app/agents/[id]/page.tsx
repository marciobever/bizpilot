"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Save, Bot, MessageSquare, ShieldAlert, Database, Zap, Smartphone, FileText, Loader2, Settings, Puzzle, Smile, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
// Hooks
import { useAgentForm } from "./_hooks/useAgentForm";
import { useWhatsappChannel } from "./_hooks/useWhatsappChannel";
import { useKnowledgeBase } from "./_hooks/useKnowledgeBase";
import { useAgentTools } from "./_hooks/useAgentTools";
import { useMediaFiles } from "./_hooks/useMediaFiles";
// Tabs
import { IdentityTab } from "./_tabs/IdentityTab";
import { PersonalityTab } from "./_tabs/PersonalityTab";
import { ConfigTab } from "./_tabs/ConfigTab";
import { AddonsTab } from "./_tabs/AddonsTab";
import { InstructionsTab } from "./_tabs/InstructionsTab";
import { TagsTab } from "./_tabs/TagsTab";
import { KnowledgeTab } from "./_tabs/KnowledgeTab";
import { ChannelsTab } from "./_tabs/ChannelsTab";
import { AfiliadosTab } from "./_tabs/AfiliadosTab";
// Views
import { NewAgentView } from "./_views/NewAgentView";
import { SetupWhatsappView } from "./_views/SetupWhatsappView";
// Components
import { AgentTour } from "./_components/AgentTour";

// ─────────────────────────────────────────────────────────────────────────────

export default function AgentConfig() {
  const navigate = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const setupStep = searchParams.get("setup");
  const { user, loading: authLoading } = useAuth();
  const agentId = Array.isArray(id) ? id[0] : (id as string);
  const isNew = agentId === "new";

  const [activeTab, setActiveTab] = useState("identity");
  const [agentType, setAgentType] = useState("atendimento");
  const [affiliateGroups, setAffiliateGroups] = useState<{ id: string; name: string }[]>([]);
  const [hasAffiliateIntegration, setHasAffiliateIntegration] = useState(false);

  // ── Hooks ─────────────────────────────────────────────────────────────────
  const form = useAgentForm(isNew);
  const waChannel = useWhatsappChannel(agentId, form.agentName, isNew);
  const knowledge = useKnowledgeBase(agentId, activeTab, isNew);
  const tools = useAgentTools();
  const media = useMediaFiles();

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user && !isNew) {
      fetchAgent();
      waChannel.checkWhatsappStatus();
    } else if (!authLoading && !isNew && !user) {
      form.setLoading(false);
    }
  }, [user, agentId, authLoading]);

  // ── Data Fetching (orchestrates all hooks) ────────────────────────────────
  const fetchAgent = async () => {
    form.setLoading(true);
    try {
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .eq("id", agentId)
        .single();
      if (error) throw error;
      if (!data) return;

      form.setAgentName(data.name || "");
      setAgentType(data.type || "atendimento");
      if (data.system_prompt) form.setSystemPrompt(data.system_prompt);

      if (data.config) {
        const cfg = typeof data.config === "string" ? JSON.parse(data.config) : data.config;
        if (cfg.model) form.setSelectedModel(cfg.model);
        if (cfg.role) form.setRole(cfg.role);
        if (cfg.niche) form.setNiche(cfg.niche);
        if (cfg.tone) form.setTone(cfg.tone);
        if (cfg.greeting) form.setGreeting(cfg.greeting);
        if (cfg.typingSpeed) form.setTypingSpeed(cfg.typingSpeed);
        if (cfg.voice_enabled !== undefined) form.setVoiceEnabled(cfg.voice_enabled);
        if (cfg.voice_voice) form.setVoiceVoice(cfg.voice_voice);
        if (cfg.limitations && Array.isArray(cfg.limitations)) form.setLimitations(cfg.limitations);
        if (cfg.ignoreGroups !== undefined) form.setIgnoreGroups(cfg.ignoreGroups);
        if (cfg.dataRecordsEnabled !== undefined) form.setDataRecordsEnabled(cfg.dataRecordsEnabled);
        if (cfg.handoffContacts && Array.isArray(cfg.handoffContacts)) form.setHandoffContacts(cfg.handoffContacts);
        else if (cfg.handoffPhone) form.setHandoffContacts([{ name: "Atendente", phone: cfg.handoffPhone }]);
        if (cfg.blocklist && Array.isArray(cfg.blocklist)) form.setBlocklist(cfg.blocklist);
        if (cfg.tags && Array.isArray(cfg.tags)) form.setTags(cfg.tags);
        if (cfg.variables) {
          if (Array.isArray(cfg.variables)) {
            form.setVariables(cfg.variables);
          } else {
            form.setVariables(Object.entries(cfg.variables).map(([k, v]) => ({ key: k, value: String(v) })));
          }
        }
        if (cfg.tools && Array.isArray(cfg.tools)) tools.setTools(cfg.tools);
        if (cfg.mediaFiles && Array.isArray(cfg.mediaFiles)) media.setMediaFiles(cfg.mediaFiles);
        if (cfg.affiliateGroups && Array.isArray(cfg.affiliateGroups)) setAffiliateGroups(cfg.affiliateGroups);
        // Verifica se o add-on de afiliados está ativo para este usuário
        const { data: affInt } = await supabase.from("integrations")
          .select("status").eq("user_id", data.user_id).eq("provider", "affiliate").maybeSingle();
        setHasAffiliateIntegration(affInt?.status === "connected");
        if (cfg.whatsapp) {
          const wa = cfg.whatsapp;
          if (wa.provider === "meta" || wa.provider === "evolution") waChannel.setWhatsappProvider(wa.provider);
          if (wa.meta) {
            if (wa.meta.phoneNumberId) waChannel.setMetaPhoneNumberId(wa.meta.phoneNumberId);
            if (wa.meta.accessToken) waChannel.setMetaAccessToken(wa.meta.accessToken);
            if (wa.meta.wabaId) waChannel.setMetaWabaId(wa.meta.wabaId);
            if (wa.meta.verifyToken) waChannel.setMetaVerifyToken(wa.meta.verifyToken);
            if (wa.meta.connected) waChannel.setMetaConnected(true);
            if (wa.meta.costAcknowledged) waChannel.setMetaCostAck(true);
          }
        }
      }
    } catch (error) {
      console.error("Erro ao buscar agente:", error);
    } finally {
      form.setLoading(false);
    }
  };

  // ── Config builder (shared between save and create) ───────────────────────
  const buildConfigData = () => {
    const varsObject: Record<string, string> = {};
    form.variables.forEach((v) => { if (v.key.trim()) varsObject[v.key.trim()] = v.value; });
    return {
      model: form.selectedModel,
      role: form.role,
      niche: form.niche,
      tone: form.tone,
      greeting: form.greeting,
      typingSpeed: form.typingSpeed,
      voice_enabled: form.voiceEnabled,
      voice_voice: form.voiceVoice,
      limitations: form.limitations,
      ignoreGroups: form.ignoreGroups,
      dataRecordsEnabled: form.dataRecordsEnabled,
      handoffContacts: form.handoffContacts.map((c) => ({ name: c.name.trim(), phone: c.phone.replace(/\D/g, "") })).filter((c) => c.phone),
      handoffPhone: (form.handoffContacts[0]?.phone || "").replace(/\D/g, ""),
      blocklist: form.blocklist,
      tags: form.tags,
      variables: varsObject,
      tools: tools.tools,
      mediaFiles: media.mediaFiles,
      affiliateGroups,
      whatsapp: {
        provider: waChannel.whatsappProvider,
        meta: {
          phoneNumberId: waChannel.metaPhoneNumberId.trim(),
          accessToken: waChannel.metaAccessToken.trim(),
          wabaId: waChannel.metaWabaId.trim(),
          verifyToken: waChannel.metaVerifyToken.trim(),
          connected: waChannel.metaConnected,
          costAcknowledged: waChannel.metaCostAck,
        },
      },
    };
  };

  // ── Save / Create ─────────────────────────────────────────────────────────
  const handleCreateAndContinue = async () => {
    if (!user) return;
    if (!form.agentName.trim()) { alert("Por favor, preencha o nome do seu agente virtual."); return; }
    form.setSaving(true);
    try {
      const { data, error } = await supabase
        .from("agents")
        .insert([{ user_id: user.id, name: form.agentName, type: "atendimento", system_prompt: form.systemPrompt, status: "offline", config: buildConfigData() }])
        .select();
      if (error) throw error;
      if (data && data.length > 0) navigate.push(`/app/agents/${data[0].id}?setup=whatsapp`);
    } catch (error) {
      console.error("Erro ao criar agente:", error);
      alert("Erro ao criar agente.");
    } finally {
      form.setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    form.setSaving(true);
    try {
      const { error } = await supabase
        .from("agents")
        .update({ name: form.agentName, system_prompt: form.systemPrompt, config: buildConfigData() })
        .eq("id", agentId);
      if (error) throw error;
      alert("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar agente:", error);
      alert("Erro ao salvar o agente.");
    } finally {
      form.setSaving(false);
    }
  };

  // ── Rendering ─────────────────────────────────────────────────────────────
  if (form.loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (isNew) {
    return (
      <NewAgentView
        agentName={form.agentName} setAgentName={form.setAgentName}
        niche={form.niche} setNiche={form.setNiche}
        role={form.role} setRole={form.setRole}
        saving={form.saving} onCreateAndContinue={handleCreateAndContinue}
      />
    );
  }

  if (setupStep === "whatsapp") {
    return (
      <SetupWhatsappView
        agentId={agentId} agentName={form.agentName}
        customInstanceName={waChannel.customInstanceName}
        waConnected={waChannel.waConnected} checkingWa={waChannel.checkingWa}
        waLoading={waChannel.waLoading} waQrCode={waChannel.waQrCode}
        onConnectWhatsapp={waChannel.handleConnectWhatsapp}
        onFetchQrCode={waChannel.fetchQrCode}
        onCancelQr={() => { waChannel.setCheckingWa(false); waChannel.setWaQrCode(""); }}
      />
    );
  }

  const addonsLocked = form.userPlan === "basico";
  const isAfiliados = agentType === "afiliados" || agentType === "afiliado" || hasAffiliateIntegration;
  const tabs = [
    { id: "identity", label: "Identidade", icon: Bot },
    { id: "personality", label: "Personalidade", icon: Smile },
    { id: "config", label: "Configurações", icon: Settings },
    { id: "addons", label: "Funcionalidades", icon: Puzzle },
    { id: "instructions", label: "Instruções", icon: ShieldAlert },
    { id: "tags", label: "Dados Dinâmicos", icon: FileText },
    { id: "knowledge", label: "Base de Conhecimento", icon: Database },
    { id: "channels", label: "Canais", icon: Zap },
    ...(isAfiliados ? [{ id: "afiliados", label: "Grupos de Oferta", icon: Users }] : []),
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-10 bg-background/95 backdrop-blur py-4 border-b border-border">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate.push("/app/agents")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight truncate">Configurar Agente</h2>
            <p className="text-muted-foreground text-sm">Treine a personalidade e os limites da inteligência artificial.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex-1 md:flex-initial">Testar no Chat</Button>
          <Button className="gap-2 flex-1 md:flex-initial" onClick={handleSave} disabled={form.saving}>
            {form.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar e Publicar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Sidebar Navigation */}
        <div className="md:col-span-1 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
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

        {/* Tab Content */}
        <div className="md:col-span-4 space-y-6">
          <AgentTour
            agentId={agentId}
            agentName={form.agentName}
            waConnected={waChannel.waConnected}
            metaConnected={waChannel.metaConnected}
            knowledgeCount={knowledge.knowledgeEntries.length}
            onNavigate={setActiveTab}
            onSave={handleSave}
          />
          {activeTab === "identity" && (
            <IdentityTab agentName={form.agentName} setAgentName={form.setAgentName} role={form.role} setRole={form.setRole} niche={form.niche} setNiche={form.setNiche} />
          )}
          {activeTab === "personality" && (
            <PersonalityTab
              tone={form.tone} setTone={form.setTone}
              greeting={form.greeting} setGreeting={form.setGreeting}
              typingSpeed={form.typingSpeed} setTypingSpeed={form.setTypingSpeed}
              showGreetingAI={form.showGreetingAI} setShowGreetingAI={form.setShowGreetingAI}
              greetingAIDescription={form.greetingAIDescription} setGreetingAIDescription={form.setGreetingAIDescription}
              greetingAILoading={form.greetingAILoading} onGenerateGreeting={form.handleGenerateGreeting}
            />
          )}
          {activeTab === "config" && (
            <ConfigTab
              selectedModel={form.selectedModel} setSelectedModel={form.setSelectedModel}
              ignoreGroups={form.ignoreGroups} setIgnoreGroups={form.setIgnoreGroups}
              handoffContacts={form.handoffContacts} setHandoffContacts={form.setHandoffContacts}
              blocklist={form.blocklist} setBlocklist={form.setBlocklist}
              newBlock={form.newBlock} setNewBlock={form.setNewBlock}
            />
          )}
          {activeTab === "addons" && (
            <AddonsTab
              userPlan={form.userPlan}
              voiceEnabled={form.voiceEnabled} setVoiceEnabled={form.setVoiceEnabled}
              voiceVoice={form.voiceVoice} setVoiceVoice={form.setVoiceVoice}
              onPlayVoicePreview={form.playVoicePreview}
              dataRecordsEnabled={form.dataRecordsEnabled} setDataRecordsEnabled={form.setDataRecordsEnabled}
              tools={tools.tools} showToolsManager={tools.showToolsManager} setShowToolsManager={tools.setShowToolsManager}
              showToolForm={tools.showToolForm} setShowToolForm={tools.setShowToolForm}
              toolForm={tools.toolForm} setToolForm={tools.setToolForm}
              toolParamKey={tools.toolParamKey} setToolParamKey={tools.setToolParamKey}
              toolParamDesc={tools.toolParamDesc} setToolParamDesc={tools.setToolParamDesc}
              toolHeaderKey={tools.toolHeaderKey} setToolHeaderKey={tools.setToolHeaderKey}
              toolHeaderVal={tools.toolHeaderVal} setToolHeaderVal={tools.setToolHeaderVal}
              onAddTool={tools.handleAddTool} onDeleteTool={tools.handleDeleteTool}
              mediaFiles={media.mediaFiles} showMediaManager={media.showMediaManager} setShowMediaManager={media.setShowMediaManager}
              showMediaFileForm={media.showMediaFileForm} setShowMediaFileForm={media.setShowMediaFileForm}
              mediaFileForm={media.mediaFileForm} setMediaFileForm={media.setMediaFileForm}
              uploadingMediaFile={media.uploadingMediaFile} mediaUploadError={media.mediaUploadError}
              onAddMediaFile={media.handleAddMediaFile} onDeleteMediaFile={media.handleDeleteMediaFile}
              onUploadMediaFile={media.handleUploadMediaFile}
            />
          )}
          {activeTab === "instructions" && (
            <InstructionsTab
              systemPrompt={form.systemPrompt} setSystemPrompt={form.setSystemPrompt}
              limitations={form.limitations} setLimitations={form.setLimitations}
              newLimitation={form.newLimitation} setNewLimitation={form.setNewLimitation}
              showTemplates={form.showTemplates} setShowTemplates={form.setShowTemplates}
              showInstructionsAI={form.showInstructionsAI} setShowInstructionsAI={form.setShowInstructionsAI}
              instructionsAIDescription={form.instructionsAIDescription} setInstructionsAIDescription={form.setInstructionsAIDescription}
              instructionsAILoading={form.instructionsAILoading}
              onAutoComplete={form.handleAutoComplete}
              onGenerateInstructions={form.handleGenerateInstructions}
              onApplyTemplate={form.applyTemplate}
            />
          )}
          {activeTab === "tags" && (
            <TagsTab
              tags={form.tags} setTags={form.setTags}
              newTag={form.newTag} setNewTag={form.setNewTag}
              variables={form.variables} setVariables={form.setVariables}
              newVarKey={form.newVarKey} setNewVarKey={form.setNewVarKey}
              newVarValue={form.newVarValue} setNewVarValue={form.setNewVarValue}
            />
          )}
          {activeTab === "knowledge" && (
            <KnowledgeTab
              isNew={isNew}
              knowledgeEntries={knowledge.knowledgeEntries}
              loadingKnowledge={knowledge.loadingKnowledge}
              addingKnowledge={knowledge.addingKnowledge}
              showKnowledgeForm={knowledge.showKnowledgeForm} setShowKnowledgeForm={knowledge.setShowKnowledgeForm}
              knowledgeForm={knowledge.knowledgeForm} setKnowledgeForm={knowledge.setKnowledgeForm}
              sitemapForm={knowledge.sitemapForm} setSitemapForm={knowledge.setSitemapForm}
              importingSitemap={knowledge.importingSitemap} sitemapResult={knowledge.sitemapResult}
              onAddKnowledge={knowledge.handleAddKnowledge}
              onImportSitemap={knowledge.handleImportSitemap}
              onDeleteKnowledge={knowledge.handleDeleteKnowledge}
            />
          )}
          {activeTab === "channels" && (
            <ChannelsTab
              agentId={agentId} isNew={isNew}
              whatsappProvider={waChannel.whatsappProvider} setWhatsappProvider={waChannel.setWhatsappProvider}
              waConnected={waChannel.waConnected} waQrCode={waChannel.waQrCode}
              waLoading={waChannel.waLoading} checkingWa={waChannel.checkingWa}
              customInstanceName={waChannel.customInstanceName}
              onConnectWhatsapp={waChannel.handleConnectWhatsapp}
              onDisconnectWhatsapp={waChannel.handleDisconnectWhatsapp}
              onFetchQrCode={waChannel.fetchQrCode}
              onSwitchToMeta={waChannel.handleSwitchToMeta}
              metaConnected={waChannel.metaConnected} metaTesting={waChannel.metaTesting}
              metaTestMsg={waChannel.metaTestMsg}
              metaPhoneNumberId={waChannel.metaPhoneNumberId} setMetaPhoneNumberId={waChannel.setMetaPhoneNumberId}
              metaAccessToken={waChannel.metaAccessToken} setMetaAccessToken={waChannel.setMetaAccessToken}
              metaWabaId={waChannel.metaWabaId} setMetaWabaId={waChannel.setMetaWabaId}
              metaVerifyToken={waChannel.metaVerifyToken}
              metaCostAck={waChannel.metaCostAck} setMetaCostAck={waChannel.setMetaCostAck}
              webhookUrl={waChannel.webhookUrl}
              onTestMeta={waChannel.handleTestMeta}
              onDisconnectMeta={waChannel.handleDisconnectMeta}
              onCopyToClipboard={waChannel.copyToClipboard}
            />
          )}
          {activeTab === "afiliados" && (
            <AfiliadosTab
              agentId={agentId}
              affiliateGroups={affiliateGroups}
              setAffiliateGroups={setAffiliateGroups}
            />
          )}
        </div>
      </div>

      {/* Instance Modal */}
      {waChannel.showInstanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-2">Conectar Instância do WhatsApp</h3>
            <p className="text-sm text-muted-foreground mb-4">Crie uma nova instância para vincular o WhatsApp deste agente.</p>
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Nome (ex: suporte_oficial)"
                  value={waChannel.customInstanceName}
                  onChange={(e) => waChannel.setCustomInstanceName(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground">O nome não deve conter espaços.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => waChannel.setShowInstanceModal(false)} disabled={waChannel.waLoading}>Cancelar</Button>
              <Button type="button" onClick={() => waChannel.handleConnectWhatsapp(true)} disabled={waChannel.waLoading || !waChannel.customInstanceName.trim()}>
                {waChannel.waLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Avançar para o QR Code
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
