"use client";
import { useState, useEffect } from "react";
import { Plus, Phone, Mail, Search, Users, Bot, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Lead } from "@/types/database";
import { CreateLeadModal } from "./_modals/CreateLeadModal";
import { LeadDetailModal } from "./_modals/LeadDetailModal";

const STATUS_MAP = [
  { id: "novo", title: "Novo", color: "bg-blue-500", pill: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { id: "em_atendimento", title: "Em Atendimento", color: "bg-amber-500", pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { id: "qualificado", title: "Qualificado", color: "bg-brand-500", pill: "bg-brand-500/10 text-brand-600 dark:text-brand-400" },
  { id: "convertido", title: "Convertido", color: "bg-emerald-500", pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { id: "perdido", title: "Perdido", color: "bg-red-500", pill: "bg-red-500/10 text-red-600 dark:text-red-400" },
];

// Template de colunas compartilhado entre cabeçalho e linhas (tabela alinhada).
const GRID_COLS = "grid grid-cols-[minmax(0,2.4fr)_minmax(0,1.8fr)_130px_150px_64px_76px] gap-4 items-center";

export default function Leads() {
  const { user, loading: authLoading } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // lead_id -> agentes (bots) que já conversaram com ele; o 1º é o de origem.
  const [leadAgents, setLeadAgents] = useState<Record<string, { id: string; name: string }[]>>({});
  const [agentFilter, setAgentFilter] = useState("all");

  // Modal de criação
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", phone: "", email: "" });
  const [creating, setCreating] = useState(false);

  // Modal de detalhes / edição
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; phone: string; email: string; status: string; score: number; tags: string[] }>({
    name: "", phone: "", email: "", status: "novo", score: 0, tags: [],
  });
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasConversation, setHasConversation] = useState(false);

  useEffect(() => {
    if (user) {
      fetchLeads();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);

      // Origem do lead: deriva o(s) agente(s) a partir das conversas (agentes
      // apagados, mesmo em carência, não contam mais como origem visível).
      const { data: convs } = await supabase
        .from('conversations')
        .select('lead_id, agent_id, agent:agents(name, deleted_at)')
        .order('created_at', { ascending: true });
      const map: Record<string, { id: string; name: string }[]> = {};
      (convs || []).forEach((c: any) => {
        if (!c.lead_id || !c.agent_id || c.agent?.deleted_at) return;
        const arr = map[c.lead_id] || [];
        if (!arr.some(a => a.id === c.agent_id)) arr.push({ id: c.agent_id, name: c.agent?.name || 'Agente' });
        map[c.lead_id] = arr;
      });
      setLeadAgents(map);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching leads:", error);
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
       await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
       setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
       notifyLeadStatusChange(leadId, newStatus);
    } catch (e) {
       console.error("Erro ao atualizar lead", e);
    }
  };

  // Dispara o webhook customizado (se configurado) quando um lead vira qualificado/convertido.
  const notifyLeadStatusChange = (leadId: string, newStatus: string) => {
    if (!user) return;
    const eventMap: Record<string, string> = { qualificado: 'lead_qualified', convertido: 'lead_converted' };
    const event = eventMap[newStatus];
    if (!event) return;
    const lead = leads.find(l => l.id === leadId);
    fetch('/api/webhooks/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, event, payload: { lead: { ...lead, status: newStatus } } }),
    }).catch(() => {});
  };

  // ── Criar lead ──────────────────────────────────────────────────────────────
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newLead.name.trim()) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert([{
          user_id: user.id,
          name: newLead.name.trim(),
          phone: newLead.phone.trim() || null,
          email: newLead.email.trim() || null,
          status: 'novo',
          score: 0,
          tags: [],
        }])
        .select().single();

      if (error) throw error;
      if (data) {
        setLeads(prev => [data, ...prev]);
        setShowCreateModal(false);
        setNewLead({ name: "", phone: "", email: "" });
      }
    } catch (error) {
      console.error("Erro ao criar lead:", error);
    } finally {
      setCreating(false);
    }
  };

  // ── Detalhes / edição ──────────────────────────────────────────────────────
  const openLeadDetails = async (lead: Lead) => {
    setSelectedLead(lead);
    setEditForm({
      name: lead.name || "",
      phone: lead.phone || "",
      email: lead.email || "",
      status: lead.status || "novo",
      score: lead.score || 0,
      tags: lead.tags || [],
    });
    setNewTag("");
    setHasConversation(false);

    const { data } = await supabase.from('conversations').select('id').eq('lead_id', lead.id).limit(1);
    setHasConversation(!!(data && data.length > 0));
  };

  const closeLeadDetails = () => setSelectedLead(null);

  const handleSaveLead = async () => {
    if (!selectedLead) return;
    setSaving(true);
    try {
      const updates = {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        status: editForm.status,
        score: Number(editForm.score) || 0,
        tags: editForm.tags,
      };
      const { error } = await supabase.from('leads').update(updates).eq('id', selectedLead.id);
      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, ...updates } : l));
      if (updates.status !== selectedLead.status) notifyLeadStatusChange(selectedLead.id, updates.status);
      setSelectedLead(null);
    } catch (error) {
      console.error("Erro ao salvar lead:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    if (!confirm(`Excluir o lead "${selectedLead.name || selectedLead.phone}"? Esta ação é irreversível.`)) return;
    try {
      await supabase.from('leads').delete().eq('id', selectedLead.id);
      setLeads(prev => prev.filter(l => l.id !== selectedLead.id));
      setSelectedLead(null);
    } catch (error) {
      console.error("Erro ao excluir lead:", error);
    }
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !editForm.tags.includes(tag)) {
      setEditForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setNewTag("");
  };

  const removeTag = (tag: string) => {
    setEditForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const agentChips = (() => {
    const m = new Map<string, { id: string; name: string; count: number }>();
    leads.forEach(l => {
      (leadAgents[l.id] || []).forEach(a => {
        const e = m.get(a.id) || { id: a.id, name: a.name, count: 0 };
        e.count++;
        m.set(a.id, e);
      });
    });
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const chipCls = (active: boolean) =>
    `shrink-0 whitespace-nowrap text-[11px] px-2 py-0.5 rounded-full border transition-colors ${active ? 'bg-brand-500 text-white border-brand-500' : 'bg-secondary/40 text-muted-foreground border-border hover:bg-secondary'}`;

  const statusInfo = (id: string) => STATUS_MAP.find(s => s.id === id) || STATUS_MAP[0];

  const filteredLeads = leads.filter(l => {
    if (agentFilter !== "all" && !(leadAgents[l.id] || []).some(a => a.id === agentFilter)) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (l.name || "").toLowerCase().includes(q) || (l.phone || "").includes(q) || (l.email || "").toLowerCase().includes(q);
  });

  if (loading) {
     return (
       <div className="h-[calc(100vh-8rem)] flex items-center justify-center text-muted-foreground gap-2">
         <Loader2 className="h-5 w-5 animate-spin" /> Carregando leads...
       </div>
     );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center mb-4 shrink-0 gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            Leads e CRM
            <Badge variant="secondary" className="text-[10px] font-normal gap-1">
              <Users className="h-3 w-3" /> {leads.length}
            </Badge>
          </h2>
          <p className="text-xs text-muted-foreground">Pipeline gerado e qualificado automaticamente pelos agentes.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lead..."
              className="pl-9 w-44 sm:w-56 bg-secondary/30 border-secondary h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button size="sm" className="gap-2" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4" /> Novo Lead
          </Button>
        </div>
      </div>

      {/* Filtro por bot de origem */}
      {agentChips.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-3 shrink-0">
          <button type="button" onClick={() => setAgentFilter("all")} className={chipCls(agentFilter === "all")}>
            Todos <span className="opacity-60">{leads.length}</span>
          </button>
          {agentChips.map((a) => (
            <button type="button" key={a.id} onClick={() => setAgentFilter(a.id)} className={chipCls(agentFilter === a.id)}>
              {a.name} <span className="opacity-60">{a.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Tabela de leads */}
      <div className="flex-1 overflow-auto rounded-xl border border-border bg-card">
        <div className="min-w-[760px]">
          <div className={`${GRID_COLS} sticky top-0 z-10 bg-secondary/50 backdrop-blur px-4 py-2.5 border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground font-medium`}>
            <span>Lead</span>
            <span>Contato</span>
            <span>Bot de origem</span>
            <span>Status</span>
            <span className="text-right">Score</span>
            <span />
          </div>

          {filteredLeads.map((lead) => {
            const si = statusInfo(lead.status || 'novo');
            const ags = leadAgents[lead.id] || [];
            const primary = ags[0];
            return (
              <div
                key={lead.id}
                onClick={() => openLeadDetails(lead)}
                className={`${GRID_COLS} group px-4 py-3 border-b border-border/50 last:border-0 hover:bg-secondary/30 cursor-pointer transition-colors`}
              >
                {/* Lead */}
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar fallback={(lead.name || "??").substring(0, 2).toUpperCase()} className="h-9 w-9 shrink-0 bg-gradient-to-br from-brand-500 to-purple-500 text-white border-0 text-xs" />
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{lead.name || lead.phone || 'Sem nome'}</div>
                    {lead.tags && lead.tags.length > 0 ? (
                      <div className="flex items-center gap-1 mt-1 overflow-hidden">
                        {lead.tags.slice(0, 2).map(t => (
                          <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary">{t}</Badge>
                        ))}
                        {lead.tags.length > 2 && <span className="text-[10px] text-muted-foreground">+{lead.tags.length - 2}</span>}
                      </div>
                    ) : (
                      <div className="text-[11px] text-muted-foreground/70 mt-0.5">Sem tags</div>
                    )}
                  </div>
                </div>

                {/* Contato */}
                <div className="min-w-0 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 truncate"><Phone className="h-3 w-3 shrink-0" /><span className="truncate">{lead.phone || '—'}</span></div>
                  <div className="flex items-center gap-1.5 truncate mt-1"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{lead.email || '—'}</span></div>
                </div>

                {/* Bot de origem */}
                <div className="min-w-0">
                  {primary ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-foreground max-w-full">
                      <Bot className="h-3.5 w-3.5 text-brand-500 shrink-0" />
                      <span className="truncate">{primary.name}{ags.length > 1 && <span className="text-muted-foreground"> +{ags.length - 1}</span>}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/70">
                      <Bot className="h-3.5 w-3.5 shrink-0" /> Manual
                    </span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full ${si.pill}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${si.color}`} />
                    {si.title}
                  </span>
                </div>

                {/* Score */}
                <div className="text-right text-sm font-semibold">{lead.score || 0}</div>

                {/* Ações (hover) */}
                <div className="flex items-center justify-end gap-0.5">
                  {lead.status !== 'convertido' && (
                    <button title="Marcar como ganho" onClick={(e) => { e.stopPropagation(); updateLeadStatus(lead.id, 'convertido'); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500 hover:bg-emerald-500/10 rounded p-1">
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                  {lead.status !== 'perdido' && lead.status !== 'convertido' && (
                    <button title="Marcar como perdido" onClick={(e) => { e.stopPropagation(); updateLeadStatus(lead.id, 'perdido'); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:bg-red-500/10 rounded p-1">
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredLeads.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground py-20 gap-2">
              <Users className="h-8 w-8 text-muted-foreground/40" />
              {search.trim() || agentFilter !== "all" ? "Nenhum lead com esses filtros." : "Nenhum lead ainda."}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateLeadModal
          newLead={newLead}
          setNewLead={setNewLead}
          creating={creating}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateLead}
        />
      )}

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          leadAgents={leadAgents[selectedLead.id] || []}
          editForm={editForm}
          setEditForm={setEditForm}
          newTag={newTag}
          setNewTag={setNewTag}
          saving={saving}
          hasConversation={hasConversation}
          onClose={closeLeadDetails}
          onSave={handleSaveLead}
          onDelete={handleDeleteLead}
          onAddTag={addTag}
          onRemoveTag={removeTag}
        />
      )}
    </div>
  );
}
