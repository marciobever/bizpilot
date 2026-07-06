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
import { addonCountsFromRows, computeEffectiveLimits } from "@/lib/plans";

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
      const [{ data: profile }, { data: agentRows }, { data: addonRows }] = await Promise.all([
        supabase.from("profiles").select("plan").eq("id", user.id).single(),
        supabase.from("agents").select("id"),
        supabase.from("user_addons").select("addon_id, status").eq("user_id", user.id),
      ]);
      const counts = addonCountsFromRows(addonRows as any);
      const limit = computeEffectiveLimits(profile?.plan, counts).bots;
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
        {/* Transcript — bolhas de chat, mesma linguagem visual do resto do produto */}
        <div className="flex-1 overflow-auto p-4 text-sm space-y-3 min-h-0">
          {messages.map((m) => {
            if (m.role === "bot") {
              const displayText = tw.getDisplayText(m);
              return (
                <div key={m.id} className="flex animate-in fade-in-0 duration-300">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-brand-500/10 border border-brand-500/20 px-4 py-3 leading-relaxed whitespace-pre-line">
                    {displayText}
                  </div>
                </div>
              );
            }
            return (
              <div key={m.id} className="flex justify-end animate-in fade-in-0 duration-200">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-500 text-white px-4 py-2.5 leading-relaxed">
                  {m.text}
                </div>
              </div>
            );
          })}

          {botTyping && !flow.creating && (
            <div className="flex animate-in fade-in-0 duration-150">
              <div className="rounded-2xl rounded-tl-sm bg-brand-500/10 border border-brand-500/20 px-4 py-3 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {flow.creating && (
            <div className="flex animate-in fade-in-0 duration-300">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-brand-500/10 border border-brand-500/20 px-4 py-3 space-y-2">
                {CREATION_LINES.slice(0, creationStep).map((line, i) => (
                  <div key={i} className="flex gap-2.5 items-start animate-in fade-in-0 slide-in-from-left-2 duration-300">
                    <Check className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                    <span className="text-muted-foreground text-xs">{line}</span>
                  </div>
                ))}
                {creationStep < CREATION_LINES.length && (
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                )}
              </div>
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
