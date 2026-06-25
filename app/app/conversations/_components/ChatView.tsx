"use client";
import { useState } from "react";
import { Send, CheckCircle2, PauseCircle, PlayCircle, Bot, User, FileText, Download, MessageSquare } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Message } from "@/types/database";

const formatTime = (ts: string) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function renderMedia(msg: Message) {
  if (!msg.media_url) return null;
  if (msg.media_type === "image") {
    return (
      <a href={msg.media_url} target="_blank" rel="noreferrer" className="block mt-1.5">
        <img src={msg.media_url} alt={msg.media_name || "imagem"} className="rounded-lg max-w-[220px] max-h-[280px] object-contain border border-border bg-white" />
      </a>
    );
  }
  if (msg.media_type === "audio") return <audio controls src={msg.media_url} className="mt-1.5 max-w-[240px]" />;
  return (
    <a href={msg.media_url} target="_blank" rel="noreferrer" className="mt-1.5 flex items-center gap-2 px-3 py-2 rounded-lg bg-black/10 border border-white/20 text-xs hover:bg-black/20">
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate max-w-[160px]">{msg.media_name || "Documento"}</span>
      <Download className="h-3.5 w-3.5 shrink-0 opacity-70 ml-auto" />
    </a>
  );
}

interface Props {
  activeConv: any;
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSendMessage: (text: string) => void;
  onTogglePause: () => void;
  onMarkResolved: () => void;
}

export function ChatView({ activeConv, messages, messagesEndRef, onSendMessage, onTogglePause, onMarkResolved }: Props) {
  const [inputText, setInputText] = useState("");

  if (!activeConv) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
        <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
        <span>Selecione uma conversa para visualizar.</span>
      </div>
    );
  }

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  return (
    <>
      <div className={`h-14 border-b border-border flex items-center justify-between gap-3 px-4 shrink-0 ${activeConv.status === "paused" ? "bg-yellow-500/10" : ""}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar fallback={(activeConv.lead?.name || "??").substring(0, 2).toUpperCase()} className="h-9 w-9 shrink-0 bg-gradient-to-br from-brand-500 to-purple-500 text-white border-0 text-xs" />
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">
              {activeConv.lead?.name || "Desconhecido"} {activeConv.lead?.phone ? <span className="text-muted-foreground font-normal">· {activeConv.lead?.phone}</span> : ""}
            </div>
            <div className="text-[11px] font-medium truncate">
              {activeConv.status === "paused" ? <span className="text-yellow-500">IA pausada — atendimento humano</span>
                : activeConv.status === "closed" ? <span className="text-muted-foreground">Conversa encerrada</span>
                : <span className="text-emerald-500">Em atendimento por {activeConv.agent?.name || "IA"}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className={`h-8 ${activeConv.status === "paused" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/50 hover:bg-emerald-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/50 hover:bg-yellow-500/20"}`}
            onClick={onTogglePause} disabled={activeConv.status === "closed"}>
            {activeConv.status === "paused" ? <PlayCircle className="h-4 w-4 sm:mr-1.5" /> : <PauseCircle className="h-4 w-4 sm:mr-1.5" />}
            <span className="hidden sm:inline">{activeConv.status === "paused" ? "Retomar IA" : "Assumir"}</span>
          </Button>
          {activeConv.status !== "closed" && (
            <Button variant="outline" size="sm" className="h-8" onClick={onMarkResolved}>
              <CheckCircle2 className="h-4 w-4 sm:mr-1.5" /><span className="hidden sm:inline">Resolver</span>
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isLead = msg.sender_type === "lead";
          const isHuman = msg.sender_type === "human";
          if (isLead) {
            return (
              <div key={msg.id} className="flex gap-2 max-w-[80%]">
                <Avatar fallback="L" className="h-7 w-7 shrink-0 text-[10px]" />
                <div>
                  <div className="text-[10px] text-muted-foreground mb-0.5 ml-1">{formatTime(msg.created_at)}</div>
                  <div className="bg-secondary px-3 py-2 rounded-2xl rounded-tl-sm text-sm text-foreground">
                    {msg.content && <div className="whitespace-pre-wrap break-words">{msg.content}</div>}
                    {renderMedia(msg)}
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div key={msg.id} className="flex gap-2 max-w-[80%] ml-auto justify-end">
              <div className="items-end flex flex-col min-w-0">
                <div className="text-[10px] text-muted-foreground mb-0.5 mr-1 flex items-center gap-1">
                  {formatTime(msg.created_at)}
                  {!isHuman && <Bot className="h-3 w-3" />}
                  {isHuman && <User className="h-3 w-3" />}
                </div>
                <div className={`px-3 py-2 rounded-2xl rounded-tr-sm text-sm text-white ${isHuman ? "bg-emerald-600" : "bg-brand-600"}`}>
                  {msg.content && <div className="whitespace-pre-wrap break-words">{msg.content}</div>}
                  {renderMedia(msg)}
                </div>
              </div>
              <Avatar fallback={isHuman ? "H" : "A"} className={`h-7 w-7 shrink-0 text-[10px] text-white border-0 ${isHuman ? "bg-emerald-500" : "bg-gradient-to-br from-brand-500 to-purple-500"}`} />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border bg-background/50 shrink-0">
        <div className="flex items-center gap-2">
          <Input
            placeholder={activeConv.status === "paused" ? "Digite sua mensagem..." : "A IA está conduzindo. Digite para assumir..."}
            className="bg-card"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
            disabled={activeConv.status === "closed"}
          />
          <Button size="icon" className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSend} disabled={activeConv.status === "closed" || !inputText.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-center mt-2 text-[10px] text-muted-foreground">
          {activeConv.status === "paused" ? "Você assumiu esta conversa. A IA não responderá até você retomá-la."
            : activeConv.status === "closed" ? "Conversa encerrada."
            : "A qualquer momento você pode assumir esta conversa manualmente."}
        </div>
      </div>
    </>
  );
}
