"use client";
import { useEffect, useState } from "react";
import Link from 'next/link';
import { Sparkles, Bot, ArrowRight, Play, CheckCircle2, Calendar, PackageCheck, QrCode, CreditCard, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { motion, AnimatePresence } from "motion/react";
import { DemoChatModal } from "@/components/DemoChat";

type LiveMessage =
  | { from: "user" | "bot"; type: "text"; text: string }
  | { from: "bot"; type: "options"; options: string[] }
  | { from: "bot"; type: "payment"; title: string; amount: string }
  | { from: "bot"; type: "qrcode"; label: string };

const QR_PATTERN = [
  [1, 0, 1, 1, 0, 1],
  [0, 1, 0, 0, 1, 0],
  [1, 1, 0, 1, 1, 1],
  [0, 0, 1, 0, 0, 1],
  [1, 0, 1, 1, 0, 1],
  [0, 1, 1, 0, 1, 0],
];

const LIVE_SCENARIOS: { messages: LiveMessage[]; action: string; badge: { icon: typeof Bot; title: string; subtitle: string } }[] = [
  {
    messages: [
      { from: "user", type: "text", text: "Vocês atendem fora do horário comercial?" },
      { from: "bot", type: "text", text: "Sim! Funcionamos 24h por dia, posso te ajudar agora mesmo 😊" },
    ],
    action: "Lead Qualificado",
    badge: { icon: Bot, title: "Lead Qualificado (WhatsApp)", subtitle: "Agente 'Lucas' fechou 1 reunião." },
  },
  {
    messages: [
      { from: "user", type: "text", text: "Quero agendar uma visita pro apartamento" },
      { from: "bot", type: "text", text: "Consigo ver a agenda agora! Esses horários estão livres:" },
      { from: "bot", type: "options", options: ["Qui · 14h", "Sex · 10h"] },
    ],
    action: "Agendamento Confirmado",
    badge: { icon: Calendar, title: "Agendamento Confirmado", subtitle: "Agente 'Ana' marcou 1 visita." },
  },
  {
    messages: [
      { from: "user", type: "text", text: "Quero fechar o plano Pro" },
      { from: "bot", type: "text", text: "Show! Aqui está o link de pagamento seguro:" },
      { from: "bot", type: "payment", title: "Plano Pro", amount: "R$ 79,90/mês" },
    ],
    action: "Pagamento Recebido",
    badge: { icon: CreditCard, title: "Pagamento Recebido", subtitle: "Cliente assinou o plano Pro." },
  },
  {
    messages: [
      { from: "user", type: "text", text: "Como faço o pagamento via Pix?" },
      { from: "bot", type: "text", text: "Aqui está o QR Code, é só escanear no app do banco:" },
      { from: "bot", type: "qrcode", label: "Pix · R$ 150,00" },
    ],
    action: "Pix Gerado",
    badge: { icon: QrCode, title: "Pix Gerado", subtitle: "Cobrança de R$ 150,00 enviada." },
  },
  {
    messages: [
      { from: "user", type: "text", text: "Qual o status do meu pedido #4521?" },
      { from: "bot", type: "text", text: "Seu pedido saiu para entrega e chega hoje até 18h!" },
    ],
    action: "Pedido Atualizado",
    badge: { icon: PackageCheck, title: "Cliente Atendido", subtitle: "Agente 'Marina' resolveu em 12s." },
  },
];

export default function Home() {
  const [demoOpen, setDemoOpen] = useState(false);
  const [liveStep, setLiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveStep((s) => (s + 1) % LIVE_SCENARIOS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative px-6 py-24 md:py-32 overflow-hidden flex flex-col items-center text-center w-full min-h-[calc(100vh-4rem)] flex-1 justify-center">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] max-w-[800px] h-[400px] bg-brand-500/20 blur-[120px] rounded-full pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-sm font-medium text-brand-300 mb-8">
            <Sparkles className="mr-2 h-4 w-4" />
            A nova era da automação
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/70 mb-6 font-sans">
            Automatize seu negócio com <br className="hidden md:block" />
            Funcionários Virtuais de IA
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Atenda clientes, qualifique leads, execute tarefas e aumente vendas 24 horas por dia. 
            Não é mais um chatbot. É inteligência artificial trabalhando para você.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" asChild className="h-12 px-8 w-full sm:w-auto text-base">
              <Link href="/app">Começar Agora <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8 w-full sm:w-auto text-base border-border" onClick={() => setDemoOpen(true)}>
              <Play className="mr-2 h-4 w-4" /> Simular Atendimento
            </Button>
          </div>
        </motion.div>

        {/* Dashboard Mockup Preview */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-20 relative w-full max-w-5xl mx-auto hidden md:block"
        >
          <div className="rounded-xl border border-border/50 bg-card p-2 shadow-2xl shadow-brand-500/10 ring-1 ring-white/10 relative overflow-hidden">
             {/* Simple visual representation of a dashboard */}
             <div className="flex items-center justify-between gap-4 p-4 border-b border-border/50 bg-secondary/30">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-500">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Ao vivo
                </div>
             </div>
             
             <div className="aspect-[16/9] bg-background/50 flex overflow-hidden">
                {/* Sidebar Mockup */}
                <div className="w-1/4 min-w-[200px] border-r border-border/50 p-4 space-y-4">
                   <div className="h-6 w-1/2 bg-secondary/80 rounded-md mb-8" />
                   {[...Array(5)].map((_, i) => (
                     <div key={i} className="flex gap-3 items-center">
                       <div className="h-4 w-4 bg-secondary/80 rounded-full" />
                       <div className={`h-4 bg-secondary/50 rounded-md flex-1 ${i % 2 === 0 ? 'max-w-[80%]' : 'max-w-[60%]'}`} />
                     </div>
                   ))}
                </div>
                
                {/* Main Content Mockup */}
                <div className="flex-1 p-6 flex flex-col gap-6">
                   {/* Top Stats */}
                   <div className="grid grid-cols-3 gap-4 h-24">
                     {[...Array(3)].map((_, i) => (
                       <motion.div 
                         key={i}
                         initial={{ opacity: 0, scale: 0.9 }}
                         animate={{ opacity: 1, scale: 1 }}
                         transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                         className="bg-secondary/30 rounded-lg border border-border/50 p-4 flex flex-col justify-between"
                       >
                         <div className="h-3 w-1/3 bg-secondary/60 rounded-md" />
                         <div className={`h-6 rounded-md mt-2 ${i === 0 ? 'bg-brand-500/20 w-1/2' : i === 1 ? 'bg-emerald-500/20 w-1/3' : 'bg-amber-500/20 w-2/3'}`} />
                       </motion.div>
                     ))}
                   </div>

                   {/* Chat App Mockup */}
                   <div className="flex-1 bg-secondary/20 rounded-xl border border-border/50 p-4 flex flex-col gap-2.5 overflow-hidden relative shadow-inner">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={liveStep}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4 }}
                          className="flex flex-col gap-2.5"
                        >
                          {LIVE_SCENARIOS[liveStep].messages.map((m, i) => {
                            const delay = 0.2 + i * 0.6;
                            const align = m.from === "user" ? "self-start" : "self-end";
                            const x = m.from === "user" ? -20 : 20;

                            if (m.type === "text") {
                              return (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, x }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay, duration: 0.5 }}
                                  className={`${align} max-w-[80%] rounded-2xl p-3 border shadow-sm text-xs text-foreground ${
                                    m.from === "user"
                                      ? "bg-background rounded-tl-sm border-border"
                                      : "bg-brand-500/10 rounded-tr-sm border-brand-500/20"
                                  }`}
                                >
                                  {m.text}
                                </motion.div>
                              );
                            }

                            if (m.type === "options") {
                              return (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, x }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay, duration: 0.5 }}
                                  className={`${align} flex gap-2`}
                                >
                                  {m.options.map((opt) => (
                                    <div key={opt} className="flex items-center gap-1.5 bg-brand-500/10 border border-brand-500/20 rounded-full px-3 py-1.5 text-[11px] font-medium text-brand-400">
                                      <Clock className="h-3 w-3" />
                                      {opt}
                                    </div>
                                  ))}
                                </motion.div>
                              );
                            }

                            if (m.type === "payment") {
                              return (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, x }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay, duration: 0.5 }}
                                  className={`${align} max-w-[75%] bg-background rounded-2xl rounded-tr-sm border border-brand-500/20 shadow-sm p-3 flex items-center gap-3`}
                                >
                                  <div className="h-9 w-9 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                                    <CreditCard className="h-4 w-4 text-brand-400" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold text-foreground truncate">{m.title}</div>
                                    <div className="text-[11px] text-muted-foreground">{m.amount}</div>
                                  </div>
                                  <div className="ml-auto shrink-0 bg-brand-500 text-white text-[10px] font-medium rounded-full px-2.5 py-1">
                                    Pagar
                                  </div>
                                </motion.div>
                              );
                            }

                            // qrcode
                            return (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay, duration: 0.5 }}
                                className={`${align} max-w-[75%] bg-background rounded-2xl rounded-tr-sm border border-brand-500/20 shadow-sm p-3 flex items-center gap-3`}
                              >
                                <div className="h-12 w-12 rounded-lg bg-white p-1 grid grid-cols-6 gap-[2px] shrink-0">
                                  {QR_PATTERN.flat().map((cell, idx) => (
                                    <div key={idx} className={cell ? "bg-black rounded-[1px]" : "bg-transparent"} />
                                  ))}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold text-foreground">QR Code Pix</div>
                                  <div className="text-[11px] text-muted-foreground">{m.label}</div>
                                </div>
                              </motion.div>
                            );
                          })}

                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 + LIVE_SCENARIOS[liveStep].messages.length * 0.6, type: 'spring' }}
                            className="self-end mr-4 mb-2"
                          >
                            <div className="bg-emerald-500/10 text-emerald-500 text-[10px] px-3 py-1.5 rounded-full border border-emerald-500/20 flex gap-1.5 items-center font-medium shadow-sm">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Ação Executada: {LIVE_SCENARIOS[liveStep].action}</span>
                            </div>
                          </motion.div>
                        </motion.div>
                      </AnimatePresence>

                      <div className="absolute bottom-4 left-4 right-4 h-12 bg-background/95 backdrop-blur-md rounded-lg border border-border/50 flex items-center px-4 shadow-md">
                        <div className="h-4 w-4 bg-secondary/80 rounded-full mr-3 shrink-0" />
                        <motion.div
                          key={`typing-${liveStep}`}
                          initial={{ width: 0 }}
                          animate={{ width: "60%" }}
                          transition={{ delay: 0.4, duration: 1.6, ease: "linear" }}
                          className="h-2 bg-brand-500/30 rounded-md"
                        />
                        <motion.div
                           animate={{ opacity: [0, 1, 0] }}
                           transition={{ repeat: Infinity, duration: 1 }}
                           className="ml-2 w-1.5 h-3.5 bg-brand-500 rounded-sm"
                        />
                      </div>
                   </div>
                </div>
             </div>

             {/* Live notification toast */}
             <AnimatePresence mode="wait">
               <motion.div
                 key={liveStep}
                 initial={{ opacity: 0, x: 40, y: -10 }}
                 animate={{ opacity: 1, x: 0, y: 0 }}
                 exit={{ opacity: 0, x: 40, y: -10 }}
                 transition={{ delay: 2.6, type: 'spring' }}
                 className="absolute top-16 right-4 bg-background/95 border border-brand-500/30 backdrop-blur-xl rounded-lg p-2.5 flex items-center gap-2.5 text-xs font-medium shadow-xl ring-1 ring-white/5 max-w-[220px]"
               >
                 <div className="h-8 w-8 bg-brand-500/20 rounded-full flex items-center justify-center shrink-0">
                   {(() => {
                     const BadgeIcon = LIVE_SCENARIOS[liveStep].badge.icon;
                     return <BadgeIcon className="h-4 w-4 text-brand-400" />;
                   })()}
                 </div>
                 <div className="min-w-0">
                    <div className="text-foreground font-semibold text-[11px] leading-tight truncate">{LIVE_SCENARIOS[liveStep].badge.title}</div>
                    <div className="text-muted-foreground text-[10px] mt-0.5 leading-tight truncate">{LIVE_SCENARIOS[liveStep].badge.subtitle}</div>
                 </div>
               </motion.div>
             </AnimatePresence>
          </div>
        </motion.div>
      </section>

      <DemoChatModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
