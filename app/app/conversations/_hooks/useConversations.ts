"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { Conversation, Message } from "@/types/database";

export function useConversations() {
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { if (!authLoading) setLoading(false); return; }

    fetchConversations();

    const convSub = supabase.channel("public:conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => fetchConversations())
      .subscribe();

    const msgSub = supabase.channel("public:messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        if (payload.new && payload.new.conversation_id === activeId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            scrollToBottom();
            return [...prev, payload.new as Message];
          });
        }
        fetchConversations();
      })
      .subscribe();

    const intervalId = setInterval(() => {
      fetchConversations();
      if (activeId) fetchMessages(activeId);
    }, 3000);

    return () => {
      supabase.removeChannel(convSub);
      supabase.removeChannel(msgSub);
      clearInterval(intervalId);
    };
  }, [user, activeId, authLoading]);

  useEffect(() => {
    if (activeId) fetchMessages(activeId);
    else setMessages([]);
  }, [activeId]);

  const scrollToBottom = () => {
    setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, 100);
  };

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, lead:leads(*), agent:agents(*)")
        .order("last_message_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      setConversations(data || []);
      if (!activeId && data && data.length > 0) {
        const firstOpen = data.find((c: any) => c.status !== "closed") || data[0];
        setActiveId(firstOpen.id);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", conversationId).order("created_at", { ascending: true });
      if (error) throw error;
      const newMessages = data || [];
      setMessages((prev) => {
        if (prev.length !== newMessages.length) { scrollToBottom(); return newMessages; }
        return prev;
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const activeConv = conversations.find((c) => c.id === activeId) as any;

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || !activeConv) return;
    try {
      if (activeConv.status !== "paused") {
        await supabase.from("conversations").update({ status: "paused" }).eq("id", activeConv.id);
      }
      await supabase.from("messages").insert({ conversation_id: activeConv.id, sender_type: "human", content: text }).select().single();
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", activeConv.id);

      if (activeConv.agent_id && activeConv.lead?.phone) {
        const cfg = (activeConv.agent?.config && typeof activeConv.agent.config === "object") ? activeConv.agent.config : {};
        if (cfg?.whatsapp?.provider === "meta") {
          fetch("/api/meta/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentId: activeConv.agent_id, to: activeConv.lead.phone, text }) }).catch(() => {});
        } else {
          fetch(`/api/evolution/instances/agent_${activeConv.agent_id}/sendText`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number: activeConv.lead.phone + "@s.whatsapp.net", text }) }).catch(() => {});
        }
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  };

  const togglePause = async () => {
    if (!activeConv) return;
    const newStatus = activeConv.status === "paused" ? "active" : "paused";
    await supabase.from("conversations").update({ status: newStatus }).eq("id", activeConv.id);
  };

  const markResolved = async () => {
    if (!activeConv) return;
    await supabase.from("conversations").update({ status: "closed" }).eq("id", activeConv.id);
  };

  return {
    conversations, activeId, setActiveId, messages, loading,
    activeConv, messagesEndRef,
    handleSendMessage, togglePause, markResolved,
  };
}
