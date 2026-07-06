"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Cpu, ExternalLink } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { authFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { USD_BRL_RATE } from "@/lib/plans";

type AgentSummary = { agent_id: string; agent_name: string; cost_usd: number; total_tokens: number; calls: number };
type DayPoint = { date: string; cost_usd: number; calls: number };
type LogRow = { id: string; created_at: string; agent_id: string | null; agent_name: string; conversation_id: string | null; model: string; endpoint: string; total_tokens: number; cost_usd: number };
type HistoryResponse = { agents: { id: string; name: string }[]; totalCostUsd: number; byAgent: AgentSummary[]; byDay: DayPoint[]; logs: LogRow[]; logsTotal: number };

const DAY_RANGES = [7, 30, 90];

const brl = (usd: number) => `R$ ${(usd * USD_BRL_RATE).toFixed(2).replace(".", ",")}`;
const dayLabel = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const dateTimeLabel = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function UsoDeIA() {
  const { user, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [days, setDays] = useState(30);
  const [agentFilter, setAgentFilter] = useState("all");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetchHistory(0, true);
  }, [user, authLoading, days, agentFilter]);

  const fetchHistory = async (nextOffset: number, reset: boolean) => {
    if (!user) { if (!authLoading) setLoading(false); return; }
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const params = new URLSearchParams({ days: String(days), agentId: agentFilter, offset: String(nextOffset) });
      const res = await authFetch(`/api/usage/history?${params}`);
      const json: HistoryResponse = await res.json();
      setData(json);
      setLogs((prev) => (reset ? json.logs : [...prev, ...json.logs]));
    } catch (e) {
      console.error("Erro ao buscar consumo de IA:", e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const chipCls = (active: boolean) =>
    `shrink-0 whitespace-nowrap text-[11px] px-2.5 py-1 rounded-full border transition-colors ${active ? "bg-brand-500 text-white border-brand-500" : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando consumo de IA...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Uso de IA</h2>
        <p className="text-muted-foreground">Consumo real de IA por bot e por dia — o que gerou cada resposta.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {DAY_RANGES.map((d) => (
            <button key={d} type="button" onClick={() => setDays(d)} className={chipCls(days === d)}>
              {d} dias
            </button>
          ))}
        </div>
        {data && data.agents.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto">
            <button type="button" onClick={() => setAgentFilter("all")} className={chipCls(agentFilter === "all")}>Todos os bots</button>
            {data.agents.map((a) => (
              <button key={a.id} type="button" onClick={() => setAgentFilter(a.id)} className={chipCls(agentFilter === a.id)}>{a.name}</button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Custo de IA no período</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{brl(data?.totalCostUsd ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">${(data?.totalCostUsd ?? 0).toFixed(4)} · {data?.logsTotal ?? 0} chamadas de IA</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bot com maior consumo</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums truncate">{data?.byAgent[0]?.agent_name ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">{data?.byAgent[0] ? brl(data.byAgent[0].cost_usd) : "Sem dados no período"}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Custo por dia</CardTitle>
          <CardDescription>Últimos {days} dias</CardDescription>
        </CardHeader>
        <CardContent className="h-[260px]">
          {data && data.byDay.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === "dark" ? "#27272a" : "#e4e4e7"} />
                <XAxis dataKey="date" tickFormatter={dayLabel} stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => brl(v)} width={70} />
                <Tooltip
                  labelFormatter={(v) => dayLabel(String(v))}
                  formatter={(value) => [brl(Number(value)), "Custo"]}
                  contentStyle={{ backgroundColor: theme === "dark" ? "#09090b" : "#ffffff", borderColor: theme === "dark" ? "#27272a" : "#e4e4e7", borderRadius: "8px", color: theme === "dark" ? "#fafafa" : "#18181b" }}
                />
                <Bar dataKey="cost_usd" fill="#1e88ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Sem consumo de IA no período.</div>
          )}
        </CardContent>
      </Card>

      {data && data.byAgent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Consumo por bot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.byAgent.map((a) => (
              <div key={a.agent_id} className="flex items-center justify-between text-sm">
                <span className="font-medium truncate">{a.agent_name}</span>
                <span className="text-muted-foreground tabular-nums shrink-0 ml-3">{a.calls} chamadas · {brl(a.cost_usd)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico detalhado</CardTitle>
          <CardDescription>Cada chamada de IA, com data, hora e link pra conversa de origem.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border">
                  <th className="px-4 py-2 font-medium">Data/Hora</th>
                  <th className="px-4 py-2 font-medium">Bot</th>
                  <th className="px-4 py-2 font-medium">Modelo</th>
                  <th className="px-4 py-2 font-medium">Tokens</th>
                  <th className="px-4 py-2 font-medium">Custo</th>
                  <th className="px-4 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-2 whitespace-nowrap tabular-nums text-muted-foreground">{dateTimeLabel(log.created_at)}</td>
                    <td className="px-4 py-2 truncate max-w-[160px]">{log.agent_name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{log.model}</td>
                    <td className="px-4 py-2 tabular-nums">{log.total_tokens}</td>
                    <td className="px-4 py-2 tabular-nums font-medium">{brl(log.cost_usd)}</td>
                    <td className="px-4 py-2">
                      {log.conversation_id && (
                        <Link href={`/app/conversations?c=${log.conversation_id}`} className="inline-flex items-center gap-1 text-brand-500 hover:underline text-xs">
                          Ver conversa <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Nenhuma chamada de IA no período.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {data && logs.length < data.logsTotal && (
            <div className="p-3 flex justify-center border-t border-border">
              <button type="button" onClick={() => fetchHistory(logs.length, false)} disabled={loadingMore}
                className="text-sm text-brand-500 hover:underline disabled:opacity-50 flex items-center gap-1.5">
                {loadingMore && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Carregar mais
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
