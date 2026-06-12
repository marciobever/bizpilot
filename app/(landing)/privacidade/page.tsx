"use client";
import { motion } from "motion/react";

export default function Privacy() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto px-6 py-24 md:py-32"
    >
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Política de Privacidade</h1>
        <p className="text-muted-foreground">Última atualização: Outubro de 2023</p>
      </div>
      <div className="prose prose-invert max-w-none text-muted-foreground space-y-6">
        <p>
          Sua privacidade é importante para nós. É política da BizPilot respeitar a sua privacidade em
          relação a qualquer informação sua que possamos coletar em nosso site e em outros sites que 
          possuímos e operamos.
        </p>
        
        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Que informações nós coletamos?</h2>
        <p>
          Coletamos informações pessoais identificáveis – como nome, e-mail e dados de faturamento – 
          que você nos fornece ativamente ao se registrar na plataforma.
          Além disso, processamos e armazenamos as transcrições das conversas geradas pelos agentes 
          configurados na sua conta (via canais como Chat Web, WhatsApp ou Instagram).
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Como usamos suas informações?</h2>
        <p>
          Utilizamos suas informações para:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Fornecer, operar e manter nosso serviço.</li>
          <li>Personalizar e melhorar a experiência e desempenho dos modelos LLM.</li>
          <li>Comunicar com você sobre atualizações, avisos de segurança e suporte.</li>
        </ul>
        
        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">Retenção de Arquivos (RAG)</h2>
        <p>
          Documentos, PDFs e links enviados para a área de "Base de Conhecimento" do seu agente são
          vetorizados de forma segura. Eles não são utilizados publicamente para treinar os modelos 
          base (fundacionais) da Google ou da OpenAI. A privacidade do seu modelo de conhecimento RAG 
          é inteiramente restrita ao seu tenant do aplicativo.
        </p>
      </div>
    </motion.div>
  );
}
