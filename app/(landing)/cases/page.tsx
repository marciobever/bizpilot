"use client";
import { TrendingUp, Clock, Users, ArrowUpRight } from "lucide-react";
import Link from 'next/link';
import { motion } from "motion/react";

export default function CaseStudies() {
  const CASES = [
    {
      company: "Real Estate Prime (Imobiliária)",
      metric: "+320%",
      metricDesc: "aumento nas visitas agendadas",
      description: "Ao plugar um Agente da BizPilot no Evolution API (WhatsApp), a Real Estate Prime conseguiu garantir atendimento 24/7. O agente responde às dúvidas sobre os imóveis baseados na planilha RAG, qualifica o lead (renda e interesse) e usa o webhhok do Calendly para agendar o corretor.",
      icon: TrendingUp,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10"
    },
    {
      company: "Clínica Vida Saúde",
      metric: "90%",
      metricDesc: "redução no tempo de resposta",
      description: "Antes os pacientes esperavam horas. Hoje, a IA faz toda a triagem de plano de saúde e sintomas. Nos raros casos que a IA não tem permissão para prosseguir, ela aciona a fila de 'Handoff' transferindo para a secretária humana.",
      icon: Clock,
      color: "text-brand-500",
      bg: "bg-brand-500/10"
    },
    {
      company: "Agência Digital Growth",
      metric: "12.000+",
      metricDesc: "conversas simultâneas na Black Friday",
      description: "Durante o pico de alto tráfego no e-commerce, mantivemos SLA perfeito. O agente conseguiu recuperar milhares de carrinhos esquecidos, disparando e validando links do Stripe em tempo real pela DM do Instagram.",
      icon: Users,
      color: "text-amber-500",
      bg: "bg-amber-500/10"
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-6xl mx-auto px-6 py-24 md:py-32"
    >
      <div className="text-center max-w-3xl mx-auto mb-20">
         <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Eles decolaram com a BizPilot</h1>
         <p className="text-xl text-muted-foreground leading-relaxed">
           Veja como soluções de negócio reais aumentaram margens e salvaram milhares de 
           horas integrando inteligência artificial nos seus canais.
         </p>
      </div>

      <div className="space-y-12">
        {CASES.map((item, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            key={i} 
            className="flex flex-col md:flex-row gap-8 bg-card border border-border rounded-3xl p-8 md:p-12 items-center"
          >
             <div className="w-full md:w-1/3 flex flex-col items-center md:items-start text-center md:text-left">
                <div className={`h-16 w-16 ${item.bg} rounded-2xl flex items-center justify-center mb-6`}>
                   <item.icon className={`h-8 w-8 ${item.color}`} />
                </div>
                <div className={`text-5xl font-extrabold tracking-tight ${item.color} mb-2`}>
                   {item.metric}
                </div>
                <div className="text-sm uppercase font-semibold tracking-wider text-muted-foreground">
                   {item.metricDesc}
                </div>
             </div>
             
             <div className="w-full md:w-2/3 border-t md:border-t-0 md:border-l border-border/50 pt-8 md:pt-0 md:pl-12">
                <h3 className="text-2xl font-bold mb-4">{item.company}</h3>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  {item.description}
                </p>
                <Link href="/app" className="inline-flex items-center gap-2 text-foreground font-semibold hover:text-brand-400 transition-colors">
                  Ver integração completa <ArrowUpRight className="h-4 w-4" />
                </Link>
             </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
