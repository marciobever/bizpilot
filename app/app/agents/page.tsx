"use client";
import React, { useState, useEffect } from "react";
import { authFetch } from "@/lib/api-client";
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { Plus, Settings2, Trash2, Bot, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { normalizePlan, PLAN_LIMITS, PLAN_LABEL, addonCountsFromRows, computeEffectiveLimits } from "@/lib/plans";
import { agentHasNumber } from "@/lib/agentChannel";
import type { Agent } from "@/types/database";

export default function Agents() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<string>("starter");
  const [extraBots, setExtraBots] = useState(0);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [deleteAction, setDeleteAction] = useState<"archive" | "delete" | null>(null);
  const [showLimitModal, setShowLimitModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAgents();
      supabase.from("profiles").select("plan").eq("id", user.id).single()
        .then(({ data }) => { if (data?.plan) setPlan(data.plan); });
      supabase.from("user_addons").select("addon_id, status, current_period_end").eq("user_id", user.id)
        .then(({ data }) => {
          const counts = addonCountsFromRows(data as any);
          setExtraBots(counts["addon_bot"] ?? 0);
        });
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agents').select('*').is('deleted_at', null).order('created_at', { ascending: false });
      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Erro ao buscar agentes:', error);
    } finally {
      setLoading(false);
    }
  };

  const normalizedPlan = normalizePlan(plan);
  const botLimit = computeEffectiveLimits(plan, { addon_bot: extraBots }).bots;
  const atBotLimit = botLimit !== -1 && agents.length >= botLimit;

  const handleNewAgent = () => {
    if (atBotLimit) { setShowLimitModal(true); return; }
    router.push("/app/agents/wizard");
  };

  const handleToggleStatus = async (agent: Agent) => {
    // Sem número de WhatsApp conectado, o agente não pode ser ligado.
    if (!agentHasNumber((agent as any).config)) return;
    const newStatus = agent.status === 'online' ? 'offline' : 'online';
    try {
      const { error } = await supabase.from('agents').update({ status: newStatus }).eq('id', agent.id);
      if (error) throw error;
      setAgents(agents.map(a => a.id === agent.id ? { ...a, status: newStatus } : a));
    } catch (error) {
      console.error('Erro ao atualizar status do agente:', error);
    }
  };

  const handleArchiveAndDelete = async (id: string) => {
    setDeleteAction("archive");
    try {
      const res = await authFetch(`/api/agents/${id}/export`);
      const archive = await res.json();
      const agentName = agents.find((a) => a.id === id)?.name || "agente";
      const blob = new Blob([JSON.stringify(archive, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `historico-${agentName.replace(/[^a-z0-9-]/gi, "_")}.json`;
      link.click();
      URL.revokeObjectURL(url);

      try { await authFetch(`/api/evolution/instances/agent_${id}`, { method: 'DELETE' }); } catch {}
      await authFetch(`/api/agents/${id}/purge`, { method: "POST" });
      setAgents(agents.filter(a => a.id !== id));
      setShowDeleteModal(null);
    } catch (error) {
      console.error('Erro ao arquivar agente:', error);
    } finally {
      setDeleteAction(null);
    }
  };

  const handleSoftDelete = async (id: string) => {
    setDeleteAction("delete");
    try {
      try { await authFetch(`/api/evolution/instances/agent_${id}`, { method: 'DELETE' }); } catch {}
      await authFetch(`/api/agents/${id}/soft-delete`, { method: "POST" });
      setAgents(agents.filter(a => a.id !== id));
      setShowDeleteModal(null);
    } catch (error) {
      console.error('Erro ao apagar agente:', error);
    } finally {
      setDeleteAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Meus Agentes</h2>
          <p className="text-muted-foreground">Crie e gerencie sua equipe de inteligência artificial.</p>
        </div>
        <div className="flex items-center gap-3">
          {!loading && (
            <div className="text-sm text-muted-foreground">
              {botLimit === -1
                ? <span className="text-emerald-500 font-medium">{agents.length} agentes (ilimitado)</span>
                : <span className={agents.length >= botLimit ? "text-amber-500 font-medium" : ""}>{agents.length} / {botLimit} agentes</span>}
            </div>
          )}
          <Button onClick={handleNewAgent} className="bg-brand-500 hover:bg-brand-600 text-white gap-2">
            <Plus className="h-4 w-4" /> Novo Agente
          </Button>
        </div>
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
            <Button onClick={handleNewAgent} variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Criar Primeiro Agente
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
                      {(() => {
                        const hasNumber = agentHasNumber((agent as any).config);
                        return (
                          <div className="flex items-center gap-3">
                            <label className={`relative inline-flex items-center ${hasNumber ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`} title={hasNumber ? '' : 'Conecte um número de WhatsApp para ativar'}>
                              <input type="checkbox" className="sr-only peer" disabled={!hasNumber} checked={hasNumber && agent.status === 'online'} onChange={() => handleToggleStatus(agent)} />
                              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
                            </label>
                            {hasNumber ? (
                              <Badge variant={agent.status === 'online' ? 'success' : 'secondary'} className="border-0">
                                {agent.status === 'online' ? 'online' : 'pausado'}
                              </Badge>
                            ) : (
                              <Link href={`/app/agents/${agent.id}?setup=whatsapp`}>
                                <Badge variant="warning" className="border-0 cursor-pointer hover:opacity-80">Aguardando WhatsApp</Badge>
                              </Link>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" asChild className="h-8 px-2 text-muted-foreground hover:text-foreground">
                          <Link href={`/app/agents/${agent.id}`}><Settings2 className="h-4 w-4" /></Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setShowDeleteModal(agent.id)} className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10">
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

      {/* Modal: limite de bots atingido */}
      {showLimitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-6">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <h3 className="text-lg font-bold mb-1">Limite de agentes atingido</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Seu plano <span className="font-semibold text-foreground">{PLAN_LABEL[normalizedPlan]}</span>
              {extraBots > 0 && <> + <span className="font-semibold text-foreground">{extraBots} bot{extraBots > 1 ? 's' : ''} extra{extraBots > 1 ? 's' : ''}</span></>}
              {" "}permite até <span className="font-semibold text-foreground">{botLimit} agente{botLimit > 1 ? 's' : ''}</span>.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Adicione um <span className="font-semibold text-foreground">Bot Adicional</span> (R$ 19,90/mês) ou faça upgrade de plano para continuar criando agentes.
            </p>
            <div className="flex flex-col gap-2">
              <Button className="bg-brand-500 hover:bg-brand-600 text-white" onClick={() => { setShowLimitModal(false); router.push("/app/settings?tab=plano"); }}>
                Ver planos e extras
              </Button>
              <Button variant="outline" onClick={() => setShowLimitModal(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: excluir agente — arquivar ou apagar */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-2xl p-6">
            <h3 className="text-lg font-bold mb-1 text-destructive">Excluir Agente</h3>
            <p className="text-sm text-muted-foreground mb-4">O que fazer com o histórico de conversas deste agente?</p>
            <div className="flex flex-col gap-2 mb-4">
              <Button type="button" variant="outline" disabled={deleteAction !== null} onClick={() => handleArchiveAndDelete(showDeleteModal)} className="justify-center">
                {deleteAction === "archive" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Arquivar e baixar histórico
              </Button>
              <Button type="button" variant="destructive" disabled={deleteAction !== null} onClick={() => handleSoftDelete(showDeleteModal)} className="justify-center">
                {deleteAction === "delete" && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Apagar sem arquivar
              </Button>
              <Button type="button" variant="ghost" disabled={deleteAction !== null} onClick={() => setShowDeleteModal(null)}>Cancelar</Button>
            </div>
            <p className="text-xs text-muted-foreground">Arquivar baixa um arquivo com todas as conversas e já libera o espaço. Apagar sem arquivar esconde o agente na hora; os dados somem de vez do banco em 15 dias.</p>
          </div>
        </div>
      )}
    </div>
  );
}
