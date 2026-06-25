"use client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Props {
  newLead: { name: string; phone: string; email: string };
  setNewLead: (v: { name: string; phone: string; email: string }) => void;
  creating: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function CreateLeadModal({ newLead, setNewLead, creating, onClose, onSubmit }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-6">
        <h3 className="text-lg font-bold mb-1">Novo Lead</h3>
        <p className="text-sm text-muted-foreground mb-6">Adicione um contato manualmente ao pipeline.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input placeholder="Ex: João da Silva" value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Telefone</label>
            <Input placeholder="Ex: 5511999999999" value={newLead.phone} onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">E-mail</label>
            <Input type="email" placeholder="Ex: joao@email.com" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!newLead.name.trim() || creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Lead
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
