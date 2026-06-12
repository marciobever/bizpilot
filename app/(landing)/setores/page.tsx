"use client";
import { Target, Shield, Zap, LineChart, MessageSquare, Bot, Sparkles } from "lucide-react";
import { motion } from "motion/react";

const NICHES = [
  { name: "Imobiliárias", desc: "Qualificação de leads, agendamento de visitas e envio de catálogos.", icon: Target },
  { name: "Clínicas de Saúde", desc: "Marcação de consultas, respostas sobre especialidades e convênios.", icon: Shield },
  { name: "E-commerce", desc: "Recuperação de carrinho via WhatsApp, status de pedidos e FAQs.", icon: Zap },
  { name: "Escritórios Jurídicos", desc: "Triagem inicial, captação de clientes B2B e agendamento de calls.", icon: LineChart },
  { name: "Restaurantes e Delivery", desc: "Recebimento de pedidos, integração com PDV e programa de fidelidade.", icon: MessageSquare },
  { name: "Prestadores de Serviço", desc: "Suporte nível 1 automatizado, orçamentos e dúvidas técnicas.", icon: Bot },
];

export default function Niches() {
  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-24 md:py-32">
      <div className="text-center max-w-3xl mx-auto mb-20">
         <h2 className="text-4xl font-bold tracking-tight mb-4">Feito especialmente para a sua realidade.</h2>
         <p className="text-xl text-muted-foreground">
           Agentes especialistas pré-treinados para conversar, vender e dar suporte independente 
           do seu tipo de negócio.
         </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {NICHES.map((n, i) => {
          const Icon = n.icon;
          return (
            <motion.div
              key={n.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-4 p-8 bg-card border border-border rounded-2xl transition-colors hover:border-brand-500/50"
            >
              <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center shrink-0">
                 <Icon className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">{n.name}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{n.desc}</p>
              </div>
            </motion.div>
          );
        })}

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: NICHES.length * 0.1 }}
          className="md:col-span-2 flex items-start gap-4 p-8 bg-brand-500/5 border border-brand-500/30 rounded-2xl transition-colors hover:border-brand-500/60"
        >
          <div className="h-14 w-14 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
             <Sparkles className="h-6 w-6 text-brand-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Não encontrou o seu segmento?</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Sem problema. Na configuração do seu agente você descreve, em texto livre, como o seu negócio funciona,
              o tom de voz desejado e as regras de atendimento — e a BizPilot monta um agente sob medida pra sua realidade.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
