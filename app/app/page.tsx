"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Bot, MessageSquare, TrendingUp, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import type { Agent } from "@/types/database";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function pctChange(current: number, previous: number): { label: string; positive: boolean } | null {
  if (previous === 0) {
    if (current === 0) return null;
    return { label: "novo", positive: true };
  }
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? "+" : "";
  return { label: `${sign}${change.toFixed(0)}% vs. semana anterior`, positive: change >= 0 };
}

export default function DashboardMetrics() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);

  const [messagesToday, setMessagesToday] = useState(0);
  const [messagesYesterday, setMessagesYesterday] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [leadsThisWeek, setLeadsThisWeek] = useState(0);
  const [leadsLastWeek, setLeadsLastWeek] = useState(0);
  const [convertedLeads, setConvertedLeads] = useState(0);
  const [agentMessagesTotal, setAgentMessagesTotal] = useState(0);
  const [chartData, setChartData] = useState<{ name: string; leads: number; convos: number }[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    if (user) {
      fetchData();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const sevenDaysAgo = new Date(todayStart); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const fourteenDaysAgo = new Date(todayStart); fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);

      const [agentsRes, leadsRes, messagesRes] = await Promise.all([
        supabase.from('agents').select('*').order('created_at', { ascending: false }),
        supabase.from('leads').select('id, status, created_at').gte('created_at', fourteenDaysAgo.toISOString()),
        supabase.from('messages').select('id, sender_type, created_at').gte('created_at', sevenDaysAgo.toISOString()),
      ]);

      const allAgents = agentsRes.data || [];
      setAgents(allAgents);

      const recentLeads = leadsRes.data || [];
      const recentMessages = messagesRes.data || [];

      // Totais de leads (busca separada para contagem total e conversões, sem limite de data)
      const { count: totalLeadsCount } = await supabase.from('leads').select('id', { count: 'exact', head: true });
      const { count: convertedCount } = await supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'convertido');
      setTotalLeads(totalLeadsCount || 0);
      setConvertedLeads(convertedCount || 0);

      // Leads desta semana vs. semana anterior
      const thisWeek = recentLeads.filter(l => new Date(l.created_at) >= sevenDaysAgo).length;
      const lastWeek = recentLeads.filter(l => new Date(l.created_at) < sevenDaysAgo).length;
      setLeadsThisWeek(thisWeek);
      setLeadsLastWeek(lastWeek);

      // Mensagens hoje vs. ontem
      const today = recentMessages.filter(m => new Date(m.created_at) >= todayStart).length;
      const yesterday = recentMessages.filter(m => {
        const d = new Date(m.created_at);
        return d >= yesterdayStart && d < todayStart;
      }).length;
      setMessagesToday(today);
      setMessagesYesterday(yesterday);

      // Mensagens enviadas pela IA (total geral)
      const { count: agentMsgCount } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('sender_type', 'agent');
      setAgentMessagesTotal(agentMsgCount || 0);

      // Gráfico: últimos 7 dias
      const days: { name: string; leads: number; convos: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayStart);
        d.setDate(d.getDate() - i);
        const dEnd = new Date(d); dEnd.setDate(dEnd.getDate() + 1);
        const leadsCount = recentLeads.filter(l => {
          const dt = new Date(l.created_at);
          return dt >= d && dt < dEnd;
        }).length;
        const convosCount = recentMessages.filter(m => {
          const dt = new Date(m.created_at);
          return dt >= d && dt < dEnd;
        }).length;
        days.push({ name: DAY_LABELS[d.getDay()], leads: leadsCount, convos: convosCount });
      }
      setChartData(days);
    } catch (error) {
      console.error('Erro ao buscar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0.0";
  const messagesChange = pctChange(messagesToday, messagesYesterday);
  const leadsChange = pctChange(leadsThisWeek, leadsLastWeek);
  const estimatedHoursSaved = ((agentMessagesTotal * 2) / 60).toFixed(1); // ~2 min economizados por mensagem automatizada

  const statusColor = (status: string) => {
    if (status === 'online') return 'bg-emerald-500';
    if (status === 'paused') return 'bg-amber-500';
    return 'bg-zinc-500';
  };
  const statusLabel = (status: string) => {
    if (status === 'online') return 'Online';
    if (status === 'paused') return 'Pausado';
    return 'Offline';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Carregando métricas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Visão Geral</h2>
          <p className="text-muted-foreground">Métricas e acompanhamento do desempenho dos seus agentes.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mensagens Hoje</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{messagesToday}</div>
            {messagesChange ? (
              <p className={`text-xs mt-1 font-medium ${messagesChange.positive ? 'text-emerald-500' : 'text-red-500'}`}>
                {messagesChange.label.includes('vs') ? messagesChange.label.replace('vs. semana anterior', 'vs. ontem') : messagesChange.label}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">Sem dados de ontem</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads Gerados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            {leadsChange ? (
              <p className={`text-xs mt-1 font-medium ${leadsChange.positive ? 'text-emerald-500' : 'text-red-500'}`}>{leadsChange.label}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">{leadsThisWeek} esta semana</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Conversão</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">{convertedLeads} de {totalLeads} leads convertidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tempo Economizado</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{estimatedHoursSaved}h</div>
            <p className="text-xs text-muted-foreground mt-1">{agentMessagesTotal} respostas automatizadas (estimativa)</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts & Lists */}
      <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-7">
        <Card className="md:col-span-4 lg:col-span-5">
          <CardHeader>
            <CardTitle>Engajamento</CardTitle>
            <CardDescription>Volume de leads e mensagens nos últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorConvos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === "dark" ? "#27272a" : "#e4e4e7"} />
                <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: theme === "dark" ? "#09090b" : "#ffffff", borderColor: theme === "dark" ? "#27272a" : "#e4e4e7", borderRadius: '8px', color: theme === "dark" ? "#fafafa" : "#18181b" }} />
                <Area type="monotone" name="Mensagens" dataKey="convos" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorConvos)" />
                <Area type="monotone" name="Leads" dataKey="leads" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 lg:col-span-2">
          <CardHeader>
            <CardTitle>Agentes</CardTitle>
            <CardDescription>Status dos seus robôs de atendimento</CardDescription>
          </CardHeader>
          <CardContent>
            {agents.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Nenhum agente criado ainda. <Link href="/app/agents" className="text-primary underline">Criar agente</Link>
              </div>
            ) : (
              <div className="space-y-5">
                {agents.slice(0, 6).map((agent) => (
                  <Link key={agent.id} href={`/app/agents/${agent.id}`} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${statusColor(agent.status)}`} />
                      <div className="font-medium text-sm truncate group-hover:text-primary transition-colors">{agent.name}</div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0 ml-2">{statusLabel(agent.status)}</div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
