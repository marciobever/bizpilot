"use client";
import { Webhook, CalendarDays, CreditCard, Bot, Zap, MessageSquare } from "lucide-react";
import Link from 'next/link';
import { motion } from "motion/react";

export default function Integrations() {
  const integrations = [
    {
      name: "Google Calendar",
      category: "Agendamentos",
      desc: "Conecte sua agenda para o agente verificar horários livres e marcar compromissos com os leads.",
      icon: CalendarDays,
      color: "text-violet-500"
    },
    {
      name: "Pagamentos (Pix, Mercado Pago, Asaas)",
      category: "Faturamento",
      desc: "Gere links e QR Codes de pagamento automaticamente durante a conversa.",
      icon: CreditCard,
      color: "text-emerald-500"
    },
    {
      name: "Evolution API",
      category: "Canais de Comunicação",
      desc: "Integração nativa para rodar agentes em milhares de instâncias de WhatsApp Web.",
      icon: MessageSquare,
      color: "text-emerald-400"
    },
    {
      name: "Meta Cloud API",
      category: "Canais de Comunicação",
      desc: "Para operações Enterprise, conecte o agente na API Oficial do WhatsApp Business.",
      icon: Bot,
      color: "text-blue-500"
    },
    {
      name: "Cal.com / Calendly",
      category: "Agendamentos",
      desc: "Alternativas de agenda para quem não usa o Google Calendar.",
      icon: Zap,
      color: "text-brand-500"
    },
    {
      name: "n8n (n8n.io)",
      category: "Workflows & Lógica",
      desc: "Chame webhooks do n8n (Tools) durante as conversas do agente de forma autônoma.",
      icon: Webhook,
      color: "text-rose-500"
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-7xl mx-auto px-6 py-24 md:py-32"
    >
      <div className="text-center max-w-3xl mx-auto mb-20">
         <h1 className="text-4xl font-bold tracking-tight mb-4">Integrações de ferramentas.</h1>
         <p className="text-xl text-muted-foreground">
           Não opere no escuro. Nossos agentes operam acoplando suas lógicas em APIs 
           via "Tools" autônomas.
         </p>
      </div>

       <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
         {integrations.map((feat, i) => {
           const Icon = feat.icon;
           return (
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               whileInView={{ opacity: 1, scale: 1 }}
               viewport={{ once: true }}
               transition={{ duration: 0.4, delay: i * 0.1 }}
               key={feat.name}
               className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-4 hover:border-brand-500/30 transition-colors"
             >
               <div className="flex items-center gap-4">
                 <div className="h-12 w-12 rounded-lg bg-secondary/80 border border-border flex items-center justify-center shrink-0">
                   <Icon className={`h-6 w-6 ${feat.color}`} />
                 </div>
                 <div>
                   <h3 className="text-lg font-semibold">{feat.name}</h3>
                   <span className="text-xs text-muted-foreground uppercase font-medium">{feat.category}</span>
                 </div>
               </div>
               <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                 {feat.desc}
               </p>
               <Link href="/app" className="text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors">
                 Ver Instruções &rarr;
               </Link>
             </motion.div>
           )
         })}
       </div>
    </motion.div>
  )
}
