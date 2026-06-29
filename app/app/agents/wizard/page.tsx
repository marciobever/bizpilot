"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTypewriter, type ChatMsg } from "./_hooks/useTypewriter";
import { useWizardFlow, STAGES } from "./_hooks/useWizardFlow";
import { StagePanel } from "./_components/StagePanel";
import { supabase } from "@/lib/supabase";
import { normalizePlan, PLAN_LIMITS } from "@/lib/plans";

const INTRO_TEXT =
  "Oi! Sou o assistente do BizPilot.\nVamos configurar o seu agente em poucos passos.\n\nPrimeiro: qual é o tipo do seu negócio?";

const CREATION_LINES = [
  "Processando suas escolhas...",
  "Gerando personalidade com IA...",
  "Aplicando tom de voz escolhido...",
  "Ativando regras de segurança...",
  "Escrevendo instruções do agente...",
  "Salvando no banco de dados...",
];

export default function AgentWizard() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: "intro", role: "bot", text: INTRO_TEXT },
  ]);
  const [botTyping, setBotTyping] = useState(false);
  const [creationStep, setCreationStep] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tw = useTypewriter();

  // Gate: redireciona para /app/agents se o usuário atingiu o limite de bots
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const [{ data: profile }, { data: agentRows }] = await Promise.all([
        supabase.from("profiles").select("plan").eq("id", user.id).single(),
        supabase.from("agents").select("id"),
      ]);
      const plan = normalizePlan(profile?.plan);
      const limit = PLAN_LIMITS[plan].bots;
      if (limit !== -1 && (agentRows?.length ?? 0) >= limit) {
        router.replace("/app/agents");
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { tw.messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, botTyping, creationStep]);

  const pushUser = (text: string) => {
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", text }]);
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

  useEffect(() => {
    if (!flow.creating) { setCreationStep(0); return; }
    setCreationStep(0);
    const interval = setInterval(() => {
      setCreationStep((n) => {
        if (n >= CREATION_LINES.length) { clearInterval(interval); return n; }
        return n + 1;
      });
    }, 600);
    return () => clearInterval(interval);
  }, [flow.creating]);

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-3 pb-4 shrink-0">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/app/agents"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold tracking-tight">Criar Agente</h2>
          <p className="text-muted-foreground text-xs">Configure seu agente respondendo as perguntas abaixo.</p>
        </div>
      </div>

      <div className="h-1 rounded-full bg-secondary overflow-hidden shrink-0 mb-4">
        <div className="h-full bg-brand-500 transition-all duration-500 rounded-full" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden rounded-xl border border-border bg-card min-h-0">
        {/* Transcript */}
        <div className="flex-1 overflow-auto p-4 font-mono text-sm space-y-0.5 min-h-0">
          {messages.map((m, idx) => {
            const isLastMsg = idx === messages.length - 1;
            if (m.role === "bot") {
              const displayText = tw.getDisplayText(m);
              const lines = displayText.split("\n");
              return (
                <div key={m.id} className="mb-4 animate-in fade-in-0 duration-300">
                  {lines.map((line, li) =>
                    line === "" ? (
                      <div key={li} className="h-2" />
                    ) : (
                      <div key={li} className="flex gap-3 leading-6">
                        <span className={li === 0 ? "text-brand-400 shrink-0" : "w-4 shrink-0"}>
                          {li === 0 ? "❯" : ""}
                        </span>
                        <span className={isLastMsg ? "text-foreground" : "text-muted-foreground"}>{line}</span>
                      </div>
                    )
                  )}
                </div>
              );
            } else {
              return (
                <div key={m.id} className="flex gap-3 leading-5 mb-3 animate-in fade-in-0 duration-200">
                  <Check className="h-3.5 w-3.5 text-brand-500 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground italic text-xs">{m.text}</span>
                </div>
              );
            }
          })}

          {botTyping && !flow.creating && (
            <div className="flex gap-3 leading-6 mb-4 animate-in fade-in-0 duration-150">
              <span className="text-brand-400 shrink-0">❯</span>
              <span className="inline-block w-2 h-[18px] bg-brand-400/60 animate-pulse" />
            </div>
          )}

          {flow.creating && (
            <div className="mt-2 space-y-2">
              {CREATION_LINES.slice(0, creationStep).map((line, i) => (
                <div key={i} className="flex gap-3 animate-in fade-in-0 slide-in-from-left-2 duration-300">
                  <Check className="h-3.5 w-3.5 text-brand-500 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground text-xs">{line}</span>
                </div>
              ))}
              {creationStep < CREATION_LINES.length && (
                <div className="flex gap-3 leading-6">
                  <span className="text-brand-400">❯</span>
                  <span className="inline-block w-2 h-[18px] bg-brand-400/60 animate-pulse" />
                </div>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        {!botTyping && !flow.creating && (
          <div className="border-t border-border p-4">
            <StagePanel {...flow} />
          </div>
        )}
      </div>
    </div>
  );
}
