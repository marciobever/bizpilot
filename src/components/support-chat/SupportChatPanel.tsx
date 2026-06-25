"use client";
import { useEffect, useRef } from "react";
import { X, Send, Loader2, Bot } from "lucide-react";

export interface Message {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
}

interface Props {
  messages: Message[];
  input: string;
  loading: boolean;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onSuggestion: (text: string) => void;
  onClose: () => void;
}

const INITIAL_SUGGESTIONS = [
  "Como conecto o WhatsApp?",
  "O que é a Base de Conhecimento?",
  "Bot não está respondendo",
  "Quais são os planos disponíveis?",
];

export function SupportChatPanel({ messages, input, loading, onInputChange, onSend, onSuggestion, onClose }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const lastAssistantSuggestions =
    messages.length > 0 && messages[messages.length - 1].role === "assistant"
      ? (messages[messages.length - 1].suggestions ?? [])
      : [];

  return (
    <div className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden" style={{ maxHeight: "70vh" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-brand-600 shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Suporte BizPilot</p>
            <p className="text-[10px] text-white/70">Tiro dúvidas sobre o sistema</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center pt-2">Olá! Sobre o que você tem dúvida?</p>
            <div className="flex flex-col gap-1.5">
              {INITIAL_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => onSuggestion(s)}
                  className="text-xs text-left px-3 py-2.5 rounded-xl border border-border hover:border-brand-500/50 hover:bg-brand-500/5 transition-colors text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-brand-600 text-white rounded-br-sm"
                  : "bg-secondary text-foreground rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl rounded-bl-sm px-3 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        {/* Sugestões da última resposta */}
        {!loading && lastAssistantSuggestions.length > 0 && (
          <div className="flex flex-col gap-1.5 pl-1">
            {lastAssistantSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSuggestion(s)}
                className="text-xs text-left px-3 py-2 rounded-xl border border-brand-500/30 bg-brand-500/5 hover:bg-brand-500/10 text-brand-400 hover:text-brand-300 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-3 flex gap-2 shrink-0">
        <input
          className="flex-1 bg-secondary rounded-xl px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-brand-500"
          placeholder="Digite sua dúvida..."
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          disabled={loading}
        />
        <button
          onClick={onSend}
          disabled={loading || !input.trim()}
          className="h-9 w-9 rounded-xl bg-brand-600 hover:bg-brand-700 flex items-center justify-center text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
