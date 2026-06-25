"use client";
import { useState } from "react";
import { SupportChatButton } from "./SupportChatButton";
import { SupportChatPanel, type Message } from "./SupportChatPanel";

export function SupportChat() {
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
      const res = await fetch("/api/support-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      const reply = data.reply || "Desculpe, tive um problema. Tente novamente.";
      const suggestions: string[] = data.suggestions ?? [];
      setMessages([...history, { role: "assistant", content: reply, suggestions }]);
    } catch {
      setMessages([...history, { role: "assistant", content: "Desculpe, tive um problema. Tente novamente.", suggestions: [] }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSuggestion(text: string) {
    send(text);
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
          onSuggestion={handleSuggestion}
          onClose={() => setOpen(false)}
        />
      )}
      <SupportChatButton open={open} onClick={() => setOpen((v) => !v)} />
    </>
  );
}
