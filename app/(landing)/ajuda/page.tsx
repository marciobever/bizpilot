"use client";
import { Search, Info, Settings, Target, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { motion } from "motion/react";

export default function HelpCenter() {
  const CATEGORIES = [
    { title: "Primeiros Passos", desc: "Como criar sua conta e configurar seu primeiro agente.", icon: Info },
    { title: "Configuração do Agente", desc: "Ajuste prompt sistêmico, motor de LLM e regras de tom de voz.", icon: Settings },
    { title: "Base de Conhecimento", desc: "Anexe PDFs, URLs e crie o RAG para seu agente estudar.", icon: Target },
    { title: "Canais e WhatsApp", desc: "Aprenda a conectar via Evolution API ou Meta Oficial.", icon: MessageSquare },
  ];

  const FAQ = [
    { q: "Qual modelo de Inteligência vocês usam?", a: "Rodamos em um modelo avançado da OpenAI, ajustado para respostas precisas e fiéis à base de conhecimento do seu negócio — o bot consulta o que você cadastrou antes de responder, em vez de inventar." },
    { q: "O robô vaza informações dos meus PDFs?", a: "Não. A inserção no RAG passa por camadas de segurança fortes (System Prompt Isolations) que garantem que o robô apenas repasse o ensinado, sem 'alucinar' ou desviar do tema." },
    { q: "Posso cancelar a qualquer momento?", a: "Sim. A assinatura pode ser gerenciada diretamente pelo painel e o cancelamento é imediato sem burocracias ou carências." }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto px-6 py-24 md:py-32"
    >
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Como podemos te ajudar?</h1>
        <div className="relative max-w-xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Busque por 'whatsapp', 'ferramentas', 'pagamento'..." 
            className="pl-12 h-14 text-base rounded-full bg-secondary/30 border-border/50" 
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-20">
        {CATEGORIES.map((cat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            key={cat.title} 
            className="p-6 rounded-2xl bg-card border border-border hover:border-brand-500/30 transition-colors cursor-pointer group"
          >
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-brand-500/10 rounded-lg flex items-center justify-center shrink-0">
                <cat.icon className="h-5 w-5 text-brand-400" />
              </div>
              <div>
                <h3 className="font-semibold mb-1 group-hover:text-brand-400 transition-colors">{cat.title}</h3>
                <p className="text-sm text-muted-foreground">{cat.desc}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2 className="text-2xl font-bold mb-8">Perguntas Frequentes (FAQ)</h2>
        <div className="space-y-6">
          {FAQ.map((item, i) => (
            <div key={i} className="pb-6 border-b border-border/50 last:border-0 last:pb-0">
              <h4 className="font-semibold text-lg mb-2">{item.q}</h4>
              <p className="text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
