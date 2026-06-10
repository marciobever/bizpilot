"use client";
import { motion } from "motion/react";
import { MessageSquare, Workflow, Brain, Webhook, Zap, Clock } from "lucide-react";

export default function Features() {
  const features = [
    {
      title: "IA Nativa, não Fluxos Rígidos.",
      description: "Diferente de chatbots antiquados de botãozinho, nossos agentes usam RAG e prompts sistêmicos. O cliente fala naturalmente e a IA resolve.",
      icon: Brain,
      color: "text-indigo-500"
    },
    {
      title: "Ações no Mundo Real",
      description: "A IA pode chamar APIs, enviar boletos pelo Stripe, agendar no Calendly ou registrar dados no seu banco através das 'Tool Calls'.",
      icon: Webhook,
      color: "text-emerald-500"
    },
    {
      title: "Multi-Canais Seamless",
      description: "WhatsApp, Instagram DM, Site Web. O mesmo agente, na mesma plataforma, sincronizando todo o contexto do seu cliente empresarial.",
      icon: MessageSquare,
      color: "text-amber-500"
    },
    {
      title: "Velocidade na Escala",
      description: "Atenda 10.000 clientes no Black Friday simultaneamente com o mesmo nível técnico e personalização de um atendimento 1-to-1 humano.",
      icon: Zap,
      color: "text-rose-500"
    },
    {
      title: "Onboarding em 10 minutos",
      description: "Faça upload dos seus PDFs, manuais e histórico de conversas. A inteligência artificial consome tudo e vira especialista instantaneamente.",
      icon: Clock,
      color: "text-blue-500"
    },
    {
      title: "Fluxos de Repasse (Handoff)",
      description: "O robô não decide tudo - configure regras para alertar sua equipe de vendas e passar o controle da conversa se a compra for de alto ticket.",
      icon: Workflow,
      color: "text-purple-500"
    }
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-24 md:py-32">
       <div className="text-center max-w-3xl mx-auto mb-20">
         <h2 className="text-4xl font-bold tracking-tight mb-4">A evolução dos Chatbots.</h2>
         <p className="text-xl text-muted-foreground">
           Diga adeus as árvores de decisão infinitas. Entregue um atendimento conversacional profundo 
           que entende, raciocina e executa.
         </p>
       </div>

       <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
         {features.map((f, i) => {
           const Icon = f.icon;
           return (
             <motion.div 
               key={f.title}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: i * 0.1 }}
               className="p-8 rounded-2xl bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors"
             >
               <div className={`h-12 w-12 rounded-lg bg-card border border-border flex items-center justify-center mb-6`}>
                 <Icon className={`h-6 w-6 ${f.color}`} />
               </div>
               <h3 className="text-xl font-semibold mb-3">{f.title}</h3>
               <p className="text-muted-foreground leading-relaxed">{f.description}</p>
             </motion.div>
           )
         })}
       </div>
    </div>
  )
}
