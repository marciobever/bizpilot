"use client";
import { Search, Bot, MessageSquare } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Conversation } from "@/types/database";

const chipCls = (active: boolean) =>
  `shrink-0 whitespace-nowrap text-[11px] px-2 py-0.5 rounded-full border transition-colors ${active ? "bg-brand-500 text-white border-brand-500" : "bg-secondary/40 text-muted-foreground border-border hover:bg-secondary"}`;

const statusMeta = (s: string) =>
  s === "paused" ? { dot: "bg-yellow-500", label: "Pausado", color: "text-yellow-500" }
  : s === "closed" ? { dot: "bg-muted-foreground", label: "Resolvido", color: "text-muted-foreground" }
  : { dot: "bg-emerald-500", label: "Ativo", color: "text-emerald-500" };

const formatListTime = (ts: string) => {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

interface Props {
  conversations: any[];
  activeId: string | null;
  search: string;
  setSearch: (v: string) => void;
  agentFilter: string;
  setAgentFilter: (v: string) => void;
  showResolved: boolean;
  setShowResolved: (v: boolean) => void;
  onSelectId: (id: string) => void;
}

export function ConversationList({ conversations, activeId, search, setSearch, agentFilter, setAgentFilter, showResolved, setShowResolved, onSelectId }: Props) {
  const resolvedCount = conversations.filter((c: any) => c.status === "closed").length;
  const openCount = conversations.length - resolvedCount;

  const agentChips = (() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    conversations.forEach((c: any) => {
      const id = c.agent?.id || "none";
      const name = c.agent?.name || "Sem agente";
      const e = map.get(id) || { id, name, count: 0 };
      e.count++;
      map.set(id, e);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  })();

  const filtered = conversations.filter((c: any) => {
    const isClosed = c.status === "closed";
    if (showResolved ? !isClosed : isClosed) return false;
    if (agentFilter !== "all" && (c.agent?.id || "none") !== agentFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (c.lead?.name || "").toLowerCase().includes(q) || (c.lead?.phone || "").includes(q);
  });

  return (
    <div className="w-80 border-r border-border flex flex-col shrink-0 bg-background/50">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou telefone..." className="pl-9 bg-secondary/30 border-secondary" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 mt-2.5">
          <button type="button" onClick={() => setShowResolved(false)} className={chipCls(!showResolved)}>Em aberto <span className="opacity-60">{openCount}</span></button>
          <button type="button" onClick={() => setShowResolved(true)} className={chipCls(showResolved)}>Resolvidas <span className="opacity-60">{resolvedCount}</span></button>
        </div>
        {agentChips.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto mt-2.5 pb-0.5">
            <button type="button" onClick={() => setAgentFilter("all")} className={chipCls(agentFilter === "all")}>Todos <span className="opacity-60">{conversations.length}</span></button>
            {agentChips.map((a) => (
              <button type="button" key={a.id} onClick={() => setAgentFilter(a.id)} className={chipCls(agentFilter === a.id)}>{a.name} <span className="opacity-60">{a.count}</span></button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-auto">
        {filtered.map((c: any) => {
          const sm = statusMeta(c.status);
          return (
            <button key={c.id} onClick={() => onSelectId(c.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-border/60 transition-colors hover:bg-secondary/40 flex gap-2.5 items-center ${activeId === c.id ? "bg-secondary/50 border-l-2 border-l-brand-500" : "border-l-2 border-l-transparent"}`}>
              <Avatar fallback={(c.lead?.name || "??").substring(0, 2).toUpperCase()} className="h-9 w-9 shrink-0 bg-gradient-to-br from-brand-500 to-purple-500 text-white border-0 text-xs" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-medium text-sm truncate">{c.lead?.name || c.lead?.phone || "Desconhecido"}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0">{formatListTime(c.last_message_at)}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${sm.dot}`} />
                  <Bot className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground truncate">{c.agent?.name || "Sem agente"}</span>
                  {c.status !== "active" && <span className={`text-[11px] shrink-0 ${sm.color}`}>· {sm.label}</span>}
                </div>
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground mt-16 px-4 gap-2">
            <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
            {search.trim() || agentFilter !== "all" ? "Nenhuma conversa encontrada com esses filtros." : "Nenhuma conversa encontrada."}
          </div>
        )}
      </div>
    </div>
  );
}
