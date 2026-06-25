"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Bot } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useTypewriter, type ChatMsg } from "./_hooks/useTypewriter";
import { useWizardFlow, STAGES } from "./_hooks/useWizardFlow";
import { StagePanel } from "./_components/StagePanel";

const INTRO_TEXT = "Oi! 👋 Sou o assistente de criação de agentes do BizPilot. Em poucos minutos a gente monta o seu robô de atendimento.\n\nPra começar: qual é o setor do seu negócio? Escolha a opção que mais combina — ou, se nenhuma encaixar, toque em \"Outro\" e descreva o seu caso.";

export default function AgentWizard() {
  const [messages, setMessages] = useState<ChatMsg[]>([{ id: "intro", role: "bot", text: INTRO_TEXT }]);
  const [botTyping, setBotTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tw = useTypewriter();

  useEffect(() => { tw.messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botTyping]);

  const pushUser = (text: string) => {
    const id = `u-${Date.now()}`;
    setMessages((m) => [...m, { id, role: "user", text }]);
  };

  const pushBot = (text: string, delay = 550) => {
    setBotTyping(true);
    setTimeout(() => {
      const id = `b-${Date.now()}`;
      setMessages((m) => [...m, { id, role: "bot", text }]);
      setBotTyping(false);
      tw.startTypewriting(id);
    }, delay);
  };

  const addBotMessageDirect = (id: string, text: string) => {
    setMessages((m) => [...m, { id, role: "bot", text }]);
  };

  const flow = useWizardFlow({ pushUser, pushBot, setBotTyping, addBotMessageDirect });

  const stageIndex = STAGES.indexOf(flow.stage);
  const progressPct = ((stageIndex + (botTyping ? 0.5 : 1)) / STAGES.length) * 100;

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-3 pb-4 shrink-0">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/app/agents"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold tracking-tight">Criar Agente</h2>
          <p className="text-muted-foreground text-xs">Converse com o assistente para configurar seu agente de IA.</p>
        </div>
      </div>

      <div className="h-1 rounded-full bg-secondary overflow-hidden shrink-0 mb-4">
        <div className="h-full bg-brand-500 transition-all duration-500 rounded-full" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-border bg-card p-4 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={cn("flex max-w-[85%] gap-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300", m.role === "user" ? "ml-auto justify-end" : "")}>
            {m.role === "bot" && (
              <div className="h-7 w-7 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-4 w-4 text-brand-500" />
              </div>
            )}
            <div className={cn("p-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed",
              m.role === "bot" ? "bg-secondary text-foreground rounded-tl-sm" : "bg-brand-600 text-white rounded-tr-sm")}>
              {tw.getDisplayText(m)}
            </div>
          </div>
        ))}

        {botTyping && (
          <div className="flex gap-2 max-w-[85%]">
            <div className="h-7 w-7 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4 text-brand-500" />
            </div>
            <div className="p-3 rounded-2xl rounded-tl-sm bg-secondary flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" />
            </div>
          </div>
        )}

        {!botTyping && <StagePanel {...flow} />}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
