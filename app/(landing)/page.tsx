"use client";
import Link from 'next/link';
import { Sparkles, Bot, ArrowRight, Play, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { motion } from "motion/react";

export default function Home() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="relative px-6 py-24 md:py-32 overflow-hidden flex flex-col items-center text-center w-full min-h-[calc(100vh-4rem)] flex-1 justify-center">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] max-w-[800px] h-[400px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-sm font-medium text-indigo-300 mb-8">
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
            <Button size="lg" variant="outline" className="h-12 px-8 w-full sm:w-auto text-base border-border">
              <Play className="mr-2 h-4 w-4" /> Agendar Demonstração
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
          <div className="rounded-xl border border-border/50 bg-card p-2 shadow-2xl shadow-indigo-500/10 ring-1 ring-white/10 relative overflow-hidden">
             {/* Simple visual representation of a dashboard */}
             <div className="flex gap-4 p-4 border-b border-border/50 bg-secondary/30">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/50" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/50" />
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
                         <div className={`h-6 rounded-md mt-2 ${i === 0 ? 'bg-indigo-500/20 w-1/2' : i === 1 ? 'bg-emerald-500/20 w-1/3' : 'bg-amber-500/20 w-2/3'}`} />
                       </motion.div>
                     ))}
                   </div>

                   {/* Chat App Mockup */}
                   <div className="flex-1 bg-secondary/20 rounded-xl border border-border/50 p-4 flex flex-col gap-4 overflow-hidden relative shadow-inner">
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1, duration: 0.5 }}
                        className="self-start max-w-[80%] bg-background rounded-2xl rounded-tl-sm p-3 border border-border shadow-sm"
                      >
                         <div className="h-2 w-24 bg-secondary/80 rounded-md mb-3" />
                         <div className="h-2 w-48 bg-secondary/60 rounded-md mb-2" />
                         <div className="h-2 w-32 bg-secondary/60 rounded-md" />
                      </motion.div>
                      
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.5, duration: 0.5 }}
                        className="self-end max-w-[80%] bg-indigo-500/10 rounded-2xl rounded-tr-sm p-3 border border-indigo-500/20 shadow-sm"
                      >
                         <div className="h-2 w-32 bg-indigo-500/40 rounded-md mb-3" />
                         <div className="h-2 w-56 bg-indigo-500/30 rounded-md mb-2" />
                         <div className="h-2 w-40 bg-indigo-500/30 rounded-md" />
                      </motion.div>

                      <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 2, type: 'spring' }}
                        className="self-end mr-4 mb-2"
                      >
                        <div className="bg-emerald-500/10 text-emerald-500 text-[10px] px-3 py-1.5 rounded-full border border-emerald-500/20 flex gap-1.5 items-center font-medium shadow-sm">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Ação Executada: Agendamento</span>
                        </div>
                      </motion.div>

                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 2.5, duration: 0.5 }}
                        className="self-start max-w-[80%] bg-background rounded-2xl rounded-tl-sm p-3 border border-border shadow-sm"
                      >
                         <div className="h-2 w-24 bg-secondary/80 rounded-md mb-3" />
                         <div className="h-2 w-40 bg-secondary/60 rounded-md" />
                      </motion.div>
                      
                      <div className="absolute bottom-4 left-4 right-4 h-12 bg-background/95 backdrop-blur-md rounded-lg border border-border/50 flex items-center px-4 shadow-md">
                        <div className="h-4 w-4 bg-secondary/80 rounded-full mr-3 shrink-0" />
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: "60%" }}
                          transition={{ delay: 3, duration: 2, ease: "linear" }}
                          className="h-2 bg-indigo-500/30 rounded-md"
                        />
                        <motion.div 
                           animate={{ opacity: [0, 1, 0] }}
                           transition={{ repeat: Infinity, duration: 1 }}
                           className="ml-2 w-1.5 h-3.5 bg-indigo-500 rounded-sm"
                        />
                      </div>
                   </div>
                </div>
             </div>

             {/* Fake highlight block over UI */}
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               transition={{ delay: 2.5, type: 'spring' }}
               className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background/95 border border-indigo-500/30 backdrop-blur-xl rounded-xl p-4 flex items-center gap-4 text-sm font-medium shadow-2xl ring-1 ring-white/5"
             >
               <div className="h-10 w-10 bg-indigo-500/20 rounded-full flex items-center justify-center shrink-0">
                 <Bot className="h-5 w-5 text-indigo-400" />
               </div>
               <div>
                  <div className="text-foreground font-semibold">Lead Qualificado (WhatsApp)</div>
                  <div className="text-muted-foreground text-xs mt-0.5">Agente 'Lucas' fechou 1 reunião.</div>
               </div>
             </motion.div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
