"use client";
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LifeBuoy, Send, Loader2, MessageSquare, ShieldAlert, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/admin";

type Ticket = {
  id: string;
  user_id: string;
  user_email: string;
  subject: string;
  status: "open" | "answered" | "closed";
  created_at: string;
  updated_at: string;
};

type TicketMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  is_admin: boolean;
  message: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, { label: string; variant: "secondary" | "success" | "outline" }> = {
  open: { label: "Aberto", variant: "secondary" },
  answered: { label: "Respondido", variant: "success" },
  closed: { label: "Encerrado", variant: "outline" },
};

export default function AdminTicketsPage() {
  const { user, loading: authLoading } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = isAdminEmail(user?.email);

  useEffect(() => {
    if (user && isAdmin) fetchTickets();
    else if (!authLoading) setLoading(false);
  }, [user, authLoading, isAdmin]);

  useEffect(() => {
    if (activeId) fetchMessages(activeId);
    else setMessages([]);
  }, [activeId]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    const interval = setInterval(() => {
      fetchTickets();
      if (activeId) fetchMessages(activeId);
    }, 5000);
    return () => clearInterval(interval);
  }, [user, isAdmin, activeId]);

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("updated_at", { ascending: false });
    if (!error) {
      setTickets(data || []);
      if (!activeId && data && data.length > 0) setActiveId(data[0].id);
    }
    setLoading(false);
  };

  const fetchMessages = async (ticketId: string) => {
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });
    if (!error) {
      setMessages(prev => {
        const newMessages = data || [];
        if (prev.length !== newMessages.length) {
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          return newMessages;
        }
        return prev;
      });
    }
  };

  const handleReply = async () => {
    if (!user || !activeId || !replyText.trim()) return;
    const text = replyText.trim();
    setReplyText("");
    try {
      await supabase.from("support_messages").insert({
        ticket_id: activeId,
        sender_id: user.id,
        is_admin: true,
        message: text,
      });
      await supabase.from("support_tickets").update({ status: "answered", updated_at: new Date().toISOString() }).eq("id", activeId);
      await fetchMessages(activeId);
      await fetchTickets();
    } catch (e) {
      console.error("Erro ao enviar resposta:", e);
    }
  };

  const handleClose = async () => {
    if (!activeId) return;
    await supabase.from("support_tickets").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", activeId);
    await fetchTickets();
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const activeTicket = tickets.find(t => t.id === activeId);

  if (authLoading || loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center text-muted-foreground gap-2">
        <ShieldAlert className="h-10 w-10 text-muted-foreground/40" />
        <span>Acesso restrito.</span>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-xl border border-border bg-card overflow-hidden">
      {/* Sidebar - Tickets List */}
      <div className="w-80 border-r border-border flex flex-col shrink-0 bg-background/50">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold text-sm flex items-center gap-2"><LifeBuoy className="h-4 w-4 text-brand-500" /> Chamados de Suporte</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{tickets.length} chamado(s)</p>
        </div>
        <div className="flex-1 overflow-auto">
          {tickets.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className={`w-full text-left p-4 border-b border-border transition-colors hover:bg-secondary/40 ${activeId === t.id ? 'bg-secondary/40 border-l-2 border-l-brand-500' : 'border-l-2 border-l-transparent'}`}
            >
              <div className="font-medium text-sm truncate">{t.subject}</div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">{t.user_email}</div>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={STATUS_LABEL[t.status]?.variant || "secondary"} className="text-[10px] px-1.5 py-0 h-4">
                  {STATUS_LABEL[t.status]?.label || t.status}
                </Badge>
                <span className="text-[10px] text-muted-foreground">{formatTime(t.updated_at)}</span>
              </div>
            </button>
          ))}
          {tickets.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground mt-16 px-4 gap-2">
              <LifeBuoy className="h-8 w-8 text-muted-foreground/40" />
              Nenhum chamado aberto.
            </div>
          )}
        </div>
      </div>

      {/* Main Area - Thread */}
      <div className="flex-1 flex flex-col min-w-0 bg-card">
        {activeTicket ? (
          <>
            <div className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0">
              <div>
                <div className="font-medium text-sm">{activeTicket.subject}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {activeTicket.user_email} · <Badge variant={STATUS_LABEL[activeTicket.status]?.variant || "secondary"} className="text-[10px] px-1.5 py-0 h-4 ml-1">
                    {STATUS_LABEL[activeTicket.status]?.label || activeTicket.status}
                  </Badge>
                </div>
              </div>
              {activeTicket.status !== "closed" && (
                <Button variant="outline" size="sm" className="h-8" onClick={handleClose}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Encerrar
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-4">
              {messages.map(m => (
                <div key={m.id} className={`flex max-w-[80%] ${!m.is_admin ? '' : 'ml-auto justify-end'}`}>
                  <div className="flex flex-col">
                    <div className={`text-[10px] text-muted-foreground mb-1 ${!m.is_admin ? 'ml-1' : 'mr-1 text-right'}`}>
                      {m.is_admin ? "Você (Equipe)" : activeTicket.user_email} · {formatTime(m.created_at)}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm whitespace-pre-wrap ${!m.is_admin ? 'bg-secondary text-foreground rounded-tl-sm' : 'bg-brand-600 text-white rounded-tr-sm'}`}>
                      {m.message}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-border bg-background/50 shrink-0">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Responder ao usuário..."
                  className="bg-card"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleReply(); }}
                />
                <Button size="icon" className="shrink-0" onClick={handleReply} disabled={!replyText.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
            <span>Selecione um chamado para visualizar.</span>
          </div>
        )}
      </div>
    </div>
  );
}
