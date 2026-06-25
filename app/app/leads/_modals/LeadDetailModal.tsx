"use client";
import Link from "next/link";
import { X, Trash2, Plus, Phone, Mail, MessageSquare, Bot, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Lead } from "@/types/database";

const STATUS_MAP = [
  { id: "novo", title: "Novo" },
  { id: "em_atendimento", title: "Em Atendimento" },
  { id: "qualificado", title: "Qualificado" },
  { id: "convertido", title: "Convertido" },
  { id: "perdido", title: "Perdido" },
];

interface EditForm {
  name: string;
  phone: string;
  email: string;
  status: string;
  score: number;
  tags: string[];
}

interface Props {
  lead: Lead;
  leadAgents: { id: string; name: string }[];
  editForm: EditForm;
  setEditForm: (v: EditForm) => void;
  newTag: string;
  setNewTag: (v: string) => void;
  saving: boolean;
  hasConversation: boolean;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  onAddTag: () => void;
  onRemoveTag: (tag: string) => void;
}

export function LeadDetailModal({
  lead, leadAgents, editForm, setEditForm,
  newTag, setNewTag, saving, hasConversation,
  onClose, onSave, onDelete, onAddTag, onRemoveTag,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-bold">Detalhes do Lead</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-6 flex items-center gap-2 flex-wrap">
          <span>Criado em {new Date(lead.created_at).toLocaleDateString("pt-BR")}</span>
          {leadAgents.length > 0 && (
            <span className="inline-flex items-center gap-1 text-brand-500">
              <Bot className="h-3 w-3" /> {leadAgents.map((a) => a.name).join(", ")}
            </span>
          )}
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1"><Phone className="h-3 w-3" /> Telefone</label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1"><Mail className="h-3 w-3" /> E-mail</label>
              <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {STATUS_MAP.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Score</label>
              <Input type="number" value={editForm.score} onChange={(e) => setEditForm({ ...editForm, score: Number(e.target.value) })} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tags</label>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {editForm.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5 bg-primary/10 text-primary gap-1">
                  {tag}
                  <button onClick={() => onRemoveTag(tag)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
              {editForm.tags.length === 0 && <span className="text-xs text-muted-foreground">Nenhuma tag</span>}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Nova tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAddTag(); } }}
                className="h-8 text-xs"
              />
              <Button type="button" size="sm" variant="outline" className="h-8 shrink-0" onClick={onAddTag}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {hasConversation && (
            <Link href="/app/conversations" className="flex items-center gap-2 text-sm text-primary hover:underline">
              <MessageSquare className="h-4 w-4" /> Ver conversas com este lead
            </Link>
          )}
        </div>

        <div className="pt-6 flex justify-between gap-3">
          <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" /> Excluir
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="button" onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
