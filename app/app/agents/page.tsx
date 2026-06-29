"use client";
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { Plus, MoreHorizontal, MessageSquare, Settings2, Trash2, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { Agent } from "@/types/database";

export default function Agents() {
  const { user, loading: authLoading } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAgents();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Erro ao buscar agentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (agent: Agent) => {
    const newStatus = agent.status === 'online' ? 'offline' : 'online';
    try {
      const { error } = await supabase.from('agents').update({ status: newStatus }).eq('id', agent.id);
      if (error) throw error;
      setAgents(agents.map(a => a.id === agent.id ? { ...a, status: newStatus } : a));
    } catch (error) {
      console.error('Erro ao atualizar status do agente:', error);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    try {
      // Remove a instância Evolution junto com o agente (best-effort: a rota
      // resolve o sufixo custom e ignora agentes Meta/sem instância). Se falhar,
      // ainda apagamos o agente — só registramos para não deixar instância órfã.
      try {
        await fetch(`/api/evolution/instances/agent_${id}`, { method: 'DELETE' });
      } catch (e) {
        console.error('Falha ao remover instância Evolution do agente:', e);
      }
      const { error } = await supabase.from('agents').delete().eq('id', id);
      if (error) throw error;
      setAgents(agents.filter(a => a.id !== id));
      setShowDeleteModal(null);
    } catch (error) {
      console.error('Erro ao deletar agente:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Meus Agentes</h2>
          <p className="text-muted-foreground">Crie e gerencie sua equipe de inteligência artificial.</p>
        </div>
        <Button asChild className="bg-brand-500 hover:bg-brand-600 text-white gap-2">
          <Link href="/app/agents/new">
            <Plus className="h-4 w-4" />
            Novo Agente
          </Link>
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {loading ? (
          <div className="py-12 flex justify-center items-center">
            <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
          </div>
        ) : agents.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center px-4">
            <div className="h-12 w-12 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <Bot className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Nenhum agente encontrado</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">
              Você ainda não criou nenhuma inteligência artificial. Crie seu primeiro agente para começar a automatizar seu atendimento.
            </p>
            <Button asChild variant="outline">
              <Link href="/app/agents/new">
                <Plus className="mr-2 h-4 w-4" /> Criar Primeiro Agente
              </Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-secondary/50 uppercase border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-medium">Agente</th>
                  <th className="px-6 py-4 font-medium">Tipo</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{agent.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Criado em: {new Date(agent.created_at).toLocaleDateString('pt-BR')}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground capitalize">{agent.type}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={agent.status === 'online'}
                            onChange={() => handleToggleStatus(agent)}
                          />
                          <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                        </label>
                        <Badge variant={agent.status === 'online' ? 'success' : agent.status === 'paused' ? 'warning' : 'secondary'} className="border-0">
                          {agent.status}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-muted-foreground hover:text-foreground">
                          <Link href={`/app/agents/${agent.id}`}>
                            <Settings2 className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setShowDeleteModal(agent.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-1 text-destructive">Excluir Agente</h3>
            <p className="text-sm text-muted-foreground mb-6">Esta ação é irreversível. O agente e todo o seu histórico serão removidos.</p>
            
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowDeleteModal(null)}>Cancelar</Button>
              <Button type="button" variant="destructive" onClick={() => showDeleteModal && handleDeleteAgent(showDeleteModal)}>
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
