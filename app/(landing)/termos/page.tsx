"use client";
import { motion } from "motion/react";

export default function Terms() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto px-6 py-24 md:py-32"
    >
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Termos de Uso</h1>
        <p className="text-muted-foreground">Última atualização: Outubro de 2023</p>
      </div>
      <div className="prose prose-invert max-w-none text-muted-foreground space-y-6">
        <p>
          Bem-vindo aos Termos de Uso da Synapse AI. Leia atentamente estas condições antes de utilizar
          nossa plataforma e serviços.
        </p>
        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">1. Aceitação dos Termos</h2>
        <p>
          Ao acessar e utilizar os serviços da Synapse AI, você concorda em cumprir e ser regido por
          estes Termos de Uso. Se você não concorda com qualquer parte destes termos, você não terá permissão
          para acessar o serviço.
        </p>
        
        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">2. Uso do Serviço</h2>
        <p>
          A Synapse AI fornece uma plataforma de criação e orquestração de Agentes Virtuais de Inteligência
          Artificial. O usuário é o único responsável por configurar limites, bases de conhecimento (RAG)
          e permissões concedidas aos agentes criados.
        </p>

        <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4">3. Limites de Responsabilidade</h2>
        <p>
          Em nenhuma circunstância a Synapse AI será responsável por danos diretos, indiretos, incidentais
          ou consequenciais resultantes de respostas geradas pelos agentes de Inteligência Artificial,
          especialmente (mas não limitado a) alucinações de IA, ofertas de descontos indevidas ou acordos verbais.
        </p>
        <p>
          Recomendamos fortemente a utilização adequada dos campos "Instruções Reativas" e limites de escopo (Handoff).
        </p>
      </div>
    </motion.div>
  );
}
