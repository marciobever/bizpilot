"use client";
import { useState } from "react";
import { SupportChatButton } from "./SupportChatButton";
import { SupportChatPanel, type Message } from "./SupportChatPanel";

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages([...next, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "Desculpe, tive um problema ao responder. Tente novamente." }]);
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
          onSend={handleSend}
          onClose={() => setOpen(false)}
        />
      )}
      <SupportChatButton open={open} onClick={() => setOpen((v) => !v)} />
    </>
  );
}
