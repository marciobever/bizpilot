"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useConversations } from "./_hooks/useConversations";
import { ConversationList } from "./_components/ConversationList";
import { ChatView } from "./_components/ChatView";

export default function Conversations() {
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("all");
  const [showResolved, setShowResolved] = useState(false);

  const {
    conversations, activeId, setActiveId, messages, loading,
    activeConv, messagesEndRef,
    handleSendMessage, togglePause, markResolved,
  } = useConversations();

  if (loading) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Carregando conversas...
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-xl border border-border bg-card overflow-hidden">
      <ConversationList
        conversations={conversations}
        activeId={activeId}
        search={search}
        setSearch={setSearch}
        agentFilter={agentFilter}
        setAgentFilter={setAgentFilter}
        showResolved={showResolved}
        setShowResolved={setShowResolved}
        onSelectId={setActiveId}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-card">
        <ChatView
          activeConv={activeConv}
          messages={messages}
          messagesEndRef={messagesEndRef}
          onSendMessage={handleSendMessage}
          onTogglePause={togglePause}
          onMarkResolved={markResolved}
        />
      </div>
    </div>
  );
}
