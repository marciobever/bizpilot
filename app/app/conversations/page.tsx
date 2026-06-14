"use client";
import { useState, useEffect, useRef } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Search, Send, CheckCircle2, Smartphone, Bot, User, PauseCircle, PlayCircle, MessageSquare, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Conversation, Message } from "@/types/database";

export default function Conversations() {
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      const convSubscription = supabase
        .channel('public:conversations')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, payload => {
           fetchConversations();
        })
        .subscribe();

      const messagesSubscription = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
           if (payload.new && payload.new.conversation_id === activeId) {
             setMessages(prev => {
                const messageExists = prev.some(m => m.id === payload.new.id);
                if (!messageExists) {
                  scrollToBottom();
                  return [...prev, payload.new as Message];
                }
                return prev;
             });
           }
           fetchConversations();
        })
        .subscribe();

      // Fallback Polling para garantir atualização em tempo real mesmo sem Realtime configurado nas tabelas do Supabase
      const intervalId = setInterval(() => {
         fetchConversations();
         if (activeId) {
            fetchMessages(activeId);
         }
      }, 3000);

      return () => {
        supabase.removeChannel(convSubscription);
        supabase.removeChannel(messagesSubscription);
        clearInterval(intervalId);
      };
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, activeId, authLoading]);

  useEffect(() => {
    if (activeId) {
      fetchMessages(activeId);
    } else {
      setMessages([]);
    }
  }, [activeId]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          lead:leads(*),
          agent:agents(*)
        `)
        .order('last_message_at', { ascending: false });
        
      if (error) throw error;
      setConversations(data || []);
      if (!activeId && data && data.length > 0) {
        setActiveId(data[0].id);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      const newMessages = data || [];
      setMessages(prev => {
        if (prev.length !== newMessages.length) {
          scrollToBottom();
          return newMessages;
        }
        return prev;
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeConv) return;
    const text = inputText.trim();
    setInputText("");

    try {
      // 1. Marcar conversa como pausada (intervenção humana)
      if (activeConv.status !== 'paused') {
          await supabase.from('conversations').update({ status: 'paused' }).eq('id', activeConv.id);
      }

      // 2. Salvar mensagem no banco
      const { data: newMessage, error: msgError } = await supabase.from('messages').insert({
        conversation_id: activeConv.id,
        sender_type: 'human',
        content: text
      }).select().single();
      
      if (msgError) throw msgError;

      // 3. Atualizar last_message_at
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', activeConv.id);

      // Envia ao WhatsApp pelo provedor configurado no agente (Meta ou Evolution).
      if (activeConv.agent_id && activeConv.lead?.phone) {
         const cfg = (activeConv.agent?.config && typeof activeConv.agent.config === 'object') ? activeConv.agent.config : {};
         const provider = cfg?.whatsapp?.provider;

         if (provider === 'meta') {
            fetch('/api/meta/send', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                  agentId: activeConv.agent_id,
                  to: activeConv.lead.phone,
                  text: text
               })
            }).catch(e => console.error("Erro ao enviar para Meta:", e));
         } else {
            fetch(`/api/evolution/instances/agent_${activeConv.agent_id}/sendText`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                  number: activeConv.lead.phone + "@s.whatsapp.net",
                  text: text
               })
            }).catch(e => console.error("Erro ao enviar para evolution:", e));
         }
      }

    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  const togglePause = async () => {
     if (!activeConv) return;
     const newStatus = activeConv.status === 'paused' ? 'active' : 'paused';
     await supabase.from('conversations').update({ status: newStatus }).eq('id', activeConv.id);
  };

  const markResolved = async () => {
     if (!activeConv) return;
     await supabase.from('conversations').update({ status: 'closed' }).eq('id', activeConv.id);
  };

  const activeConv = conversations.find(c => c.id === activeId);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatListTime = (ts: string) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Ontem";
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  // Agentes presentes nas conversas (para os chips de filtro), com contador.
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

  const filteredConversations = conversations.filter((c: any) => {
    if (agentFilter !== "all" && (c.agent?.id || "none") !== agentFilter) return false;
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (c.lead?.name || "").toLowerCase().includes(q) || (c.lead?.phone || "").includes(q);
  });

  const chipCls = (active: boolean) =>
    `shrink-0 whitespace-nowrap text-xs px-2.5 py-1 rounded-full border transition-colors ${active ? 'bg-brand-500 text-white border-brand-500' : 'bg-secondary/30 text-muted-foreground border-border hover:bg-secondary'}`;

  if (loading) {
     return (
       <div className="h-[calc(100vh-8rem)] flex items-center justify-center text-muted-foreground gap-2">
         <Loader2 className="h-5 w-5 animate-spin" /> Carregando conversas...
       </div>
     );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-xl border border-border bg-card overflow-hidden">
      {/* Sidebar - Chat List */}
      <div className="w-80 border-r border-border flex flex-col shrink-0 bg-background/50">
        <div className="p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou telefone..."
              className="pl-9 bg-secondary/30 border-secondary"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {agentChips.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto mt-3 pb-1">
              <button type="button" onClick={() => setAgentFilter("all")} className={chipCls(agentFilter === "all")}>
                Todos <span className="opacity-60">{conversations.length}</span>
              </button>
              {agentChips.map((a) => (
                <button type="button" key={a.id} onClick={() => setAgentFilter(a.id)} className={chipCls(agentFilter === a.id)}>
                  {a.name} <span className="opacity-60">{a.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-auto">
          {filteredConversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={`w-full text-left p-4 border-b border-border transition-colors hover:bg-secondary/40 flex gap-3 ${activeId === c.id ? 'bg-secondary/40 border-l-2 border-l-brand-500' : 'border-l-2 border-l-transparent'}`}
            >
              <Avatar fallback={(c.lead?.name || "??").substring(0, 2).toUpperCase()} className="h-10 w-10 shrink-0 bg-gradient-to-br from-brand-500 to-purple-500 text-white border-0" />
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex justify-between items-baseline mb-1">
                  <div className="font-medium text-sm truncate">{c.lead?.name || c.lead?.phone || 'Desconhecido'}</div>
                  <div className="text-xs text-muted-foreground shrink-0 ml-2">{formatListTime(c.last_message_at)}</div>
                </div>
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                   <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary gap-1">
                     <Bot className="h-2.5 w-2.5" /> {c.agent?.name || 'Nenhum'}
                   </Badge>
                   {c.status === 'paused' && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">Pausado</Badge>
                   )}
                   {c.status === 'closed' && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Resolvido</Badge>
                   )}
                   {c.status === 'active' && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ativo</span>
                   )}
                </div>
              </div>
            </button>
          ))}
          {filteredConversations.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center text-sm text-muted-foreground mt-16 px-4 gap-2">
              <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
              {search.trim() || agentFilter !== "all" ? "Nenhuma conversa encontrada com esses filtros." : "Nenhuma conversa encontrada."}
            </div>
          )}
        </div>
      </div>

      {/* Main Area - Chat View */}
      <div className="flex-1 flex flex-col min-w-0 bg-card">
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className={`h-16 border-b border-border flex items-center justify-between px-6 shrink-0 ${activeConv.status === 'paused' ? 'bg-yellow-500/10' : ''}`}>
              <div className="flex items-center gap-3">
                 <Avatar fallback={(activeConv.lead?.name || "??").substring(0, 2).toUpperCase()} className="bg-gradient-to-br from-brand-500 to-purple-500 text-white border-0" />
                 <div>
                   <div className="font-medium text-sm flex items-center gap-2">
                     {activeConv.lead?.name || 'Desconhecido'} {activeConv.lead?.phone ? `(${activeConv.lead?.phone})` : ''}
                     <Smartphone className="h-3 w-3 text-muted-foreground" />
                   </div>
                   <div className="text-xs font-medium flex items-center gap-1">
                     {activeConv.status === 'paused' ? (
                       <span className="text-yellow-500">IA Pausada (Atendimento Humano)</span>
                     ) : activeConv.status === 'closed' ? (
                       <span className="text-muted-foreground">Conversa Encerrada</span>
                     ) : (
                       <span className="text-emerald-500">Em atendimento por {activeConv.agent?.name || 'IA'}</span>
                     )}
                   </div>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={`h-8 ${activeConv.status === 'paused' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/50 hover:bg-emerald-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/20'}`}
                  onClick={togglePause}
                  disabled={activeConv.status === 'closed'}
                >
                  {activeConv.status === 'paused' ? <PlayCircle className="mr-2 h-4 w-4" /> : <PauseCircle className="mr-2 h-4 w-4" />}
                  {activeConv.status === 'paused' ? 'Retomar IA' : 'Assumir Conversa'}
                </Button>
                {activeConv.status !== 'closed' && (
                    <Button variant="outline" size="sm" className="h-8" onClick={markResolved}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Marcar como Resolvido
                    </Button>
                )}
              </div>
            </div>

            {/* Chat Log */}
            <div className="flex-1 overflow-auto p-6 space-y-6">
              {messages.map((msg, idx) => {
                const isLead = msg.sender_type === 'lead';
                const isHuman = msg.sender_type === 'human';
                const isAgent = msg.sender_type === 'agent';

                if (isLead) {
                   return (
                     <div key={msg.id} className="flex gap-3 max-w-[80%]">
                       <Avatar fallback="L" className="h-8 w-8" />
                       <div>
                         <div className="text-[10px] text-muted-foreground mb-1 ml-1">{formatTime(msg.created_at)}</div>
                         <div className="bg-secondary p-3 rounded-2xl rounded-tl-sm text-sm text-foreground">
                           {msg.content}
                         </div>
                       </div>
                     </div>
                   );
                } else {
                   return (
                     <div key={msg.id} className="flex gap-3 max-w-[80%] ml-auto justify-end">
                       <div className="items-end flex flex-col">
                         <div className="text-[10px] text-muted-foreground mb-1 mr-1 flex items-center gap-1">
                           {formatTime(msg.created_at)}
                           {isAgent && <Bot className="h-3 w-3" />}
                           {isHuman && <User className="h-3 w-3" />}
                         </div>
                         <div className={`p-3 rounded-2xl rounded-tr-sm text-sm text-white ${isHuman ? 'bg-emerald-600' : 'bg-brand-600'}`}>
                           {msg.content}
                         </div>
                       </div>
                       <Avatar fallback={isHuman ? "H" : "A"} className={`h-8 w-8 text-white border-0 ${isHuman ? 'bg-emerald-500' : 'bg-gradient-to-br from-brand-500 to-purple-500'}`} />
                     </div>
                   );
                }
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-border bg-background/50 shrink-0">
              <div className="flex items-center gap-2">
                <Input 
                   placeholder={activeConv.status === 'paused' ? "Digite sua mensagem..." : "A IA está conduzindo. Digite para assumir..."} 
                   className="bg-card" 
                   value={inputText}
                   onChange={e => setInputText(e.target.value)}
                   onKeyDown={e => {
                      if (e.key === 'Enter') handleSendMessage();
                   }}
                   disabled={activeConv.status === 'closed'}
                />
                <Button 
                   size="icon" 
                   className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
                   onClick={handleSendMessage}
                   disabled={activeConv.status === 'closed' || !inputText.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-center mt-2 text-[10px] text-muted-foreground">
                {activeConv.status === 'paused' ? (
                   "Você assumiu esta conversa. A IA não responderá até você retomá-la."
                ) : activeConv.status === 'closed' ? (
                   "Conversa encerrada."
                ) : (
                   "A qualquer momento você pode assumir esta conversa manualmente."
                )}
              </div>
            </div>
          </>
        ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
              <span>Selecione uma conversa para visualizar.</span>
           </div>
        )}
      </div>
    </div>
  );
}
