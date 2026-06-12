"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, X, Trash2, MessageSquare, Phone, Mail, Loader2, Search, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Lead } from "@/types/database";

const STATUS_MAP = [
  { id: "novo", title: "Novo Lead", color: "bg-blue-500" },
  { id: "em_atendimento", title: "Em Atendimento", color: "bg-amber-500" },
  { id: "qualificado", title: "Qualificado", color: "bg-brand-500" },
  { id: "convertido", title: "Convertido", color: "bg-emerald-500" },
  { id: "perdido", title: "Perdido", color: "bg-red-500" }
];

export default function Leads() {
  const { user, loading: authLoading } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const filteredLeads = leads.filter(l => {
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

      <div className="flex-1 overflow-hidden">
        <div className="flex md:grid md:grid-cols-5 gap-3 h-full pb-4 overflow-x-auto">
          {STATUS_MAP.map((col) => {
            const columnLeads = filteredLeads.filter(l => l.status === col.id || (!l.status && col.id === 'novo'));

            return (
              <div key={col.id} className="w-[80vw] shrink-0 md:w-auto md:min-w-0 flex flex-col bg-secondary/20 rounded-xl border border-border overflow-hidden">
                <div className="p-3 border-b border-border bg-card flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${col.color}`} />
                    <span className="font-semibold text-xs">{col.title}</span>
                    <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5">{columnLeads.length}</Badge>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {columnLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => openLeadDetails(lead)}
                      className="bg-card border border-border p-3 rounded-lg shadow-sm cursor-pointer hover:border-brand-500/50 transition-colors group relative"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar fallback={(lead.name || "??").substring(0, 2).toUpperCase()} className="h-7 w-7 shrink-0 bg-gradient-to-br from-brand-500 to-purple-500 text-white border-0 text-[10px]" />
                        <div className="min-w-0">
                          <div className="font-medium text-sm truncate">{lead.name || lead.phone}</div>
                          <div className="text-[11px] text-muted-foreground truncate">{lead.email || "Sem e-mail"}</div>
                        </div>
                      </div>

                      {lead.tags && lead.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mb-2">
                            {lead.tags.map(t => (
                                <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary">
                                  {t}
                                </Badge>
                            ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-1 pt-2 border-t border-border/50">
                        <div className="text-[11px] font-medium text-emerald-500 shrink-0">
                           Score: {lead.score || 0}
                        </div>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-secondary/50 border-0 text-muted-foreground truncate max-w-full">
                          {lead.phone}
                        </Badge>
                      </div>

                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                         {col.id !== 'convertido' && (
                             <button onClick={(e) => { e.stopPropagation(); updateLeadStatus(lead.id, 'convertido'); }} className="bg-emerald-500 text-white text-[10px] px-2 py-1 rounded">
                                 Ganho
                             </button>
                         )}
                         {col.id !== 'perdido' && col.id !== 'convertido' && (
                             <button onClick={(e) => { e.stopPropagation(); updateLeadStatus(lead.id, 'perdido'); }} className="bg-red-500 text-white text-[10px] px-2 py-1 rounded">
                                 Perda
                             </button>
                         )}
                      </div>
                    </div>
                  ))}
                  {columnLeads.length === 0 && (
                      <div className="text-center text-xs text-muted-foreground py-10 border border-dashed border-border rounded-lg">
                          {search.trim() ? "Nenhum resultado" : "Vazio"}
                      </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal: Novo Lead */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-1">Novo Lead</h3>
            <p className="text-sm text-muted-foreground mb-6">Adicione um contato manualmente ao pipeline.</p>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input
                  placeholder="Ex: João da Silva"
                  value={newLead.name}
                  onChange={(e) => setNewLead(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Telefone</label>
                <Input
                  placeholder="Ex: 5511999999999"
                  value={newLead.phone}
                  onChange={(e) => setNewLead(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">E-mail</label>
                <Input
                  type="email"
                  placeholder="Ex: joao@email.com"
                  value={newLead.email}
                  onChange={(e) => setNewLead(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                <Button type="submit" disabled={!newLead.name.trim() || creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Criar Lead
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detalhes do Lead */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-1">
              <h3 className="text-lg font-bold">Detalhes do Lead</h3>
              <button onClick={closeLeadDetails} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Criado em {new Date(selectedLead.created_at).toLocaleDateString('pt-BR')}
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input value={editForm.name} onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</label>
                  <Input value={editForm.phone} onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1"><Mail className="h-3 w-3" /> E-mail</label>
                  <Input type="email" value={editForm.email} onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {STATUS_MAP.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Score</label>
                  <Input type="number" value={editForm.score} onChange={(e) => setEditForm(prev => ({ ...prev, score: Number(e.target.value) }))} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tags</label>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {editForm.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5 bg-primary/10 text-primary gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {editForm.tags.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma tag</span>}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nova tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    className="h-8 text-xs"
                  />
                  <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={addTag}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {hasConversation && (
                <Link
                  href="/app/conversations"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <MessageSquare className="h-4 w-4" /> Ver conversas com este lead
                </Link>
              )}
            </div>

            <div className="pt-6 flex justify-between gap-3">
              <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={handleDeleteLead}>
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={closeLeadDetails}>Cancelar</Button>
                <Button type="button" onClick={handleSaveLead} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
