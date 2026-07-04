"use client";
import { useState } from "react";
import { authFetch } from "@/lib/api-client";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { SupportChatButton } from "./SupportChatButton";
import { SupportChatPanel, type Message } from "./SupportChatPanel";

function extractAgentId(pathname: string): string {
  const match = pathname.match(/\/app\/agents\/([^/]+)/);
  const id = match?.[1];
  return id && id !== "new" && id !== "wizard" ? id : "";
}

export function SupportChat() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", content: trimmed };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const res = await authFetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          context: {
            userId: user?.id || "",
            agentId: extractAgentId(pathname),
          },
        }),
      });
      const data = await res.json();
      const reply = data.reply || "Desculpe, tive um problema. Tente novamente.";
      setMessages([...history, { role: "assistant", content: reply, suggestions: data.suggestions ?? [] }]);
    } catch {
      setMessages([...history, { role: "assistant", content: "Desculpe, tive um problema. Tente novamente.", suggestions: [] }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <SupportChatPanel
          messages={messages}
          input={input}
          loading={loading}
          onInputChange={setInput}
          onSend={() => send(input)}
          onSuggestion={send}
          onClose={() => setOpen(false)}
        />
      )}
      <SupportChatButton open={open} onClick={() => setOpen((v) => !v)} />
    </>
  );
}
