"use client";
import Link from 'next/link';
import { motion } from "motion/react";

export default function About() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto px-6 py-24 md:py-32"
    >
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Sobre a Synapse AI</h1>
        <p className="text-xl text-muted-foreground">
          Nossa missão é democratizar a inteligência artificial para empresas de todos os tamanhos.
        </p>
      </div>
      <div className="prose prose-invert max-w-none text-muted-foreground leading-relaxed space-y-6">
        <p>
          A Synapse AI foi fundada com uma visão clara: automatizar as interações maçantes do dia a dia e devolver
          o tempo para que humanos foquem naquilo que realmente importa - estratégia, criatividade e relacionamento.
        </p>
        <p>
          Acreditamos que os chatbots baseados em fluxos rígidos já não atendem as expectativas do consumidor moderno.
          Por isso, desenvolvemos uma arquitetura nativa em LLMs (Large Language Models), permitindo que agentes virtuais
          possam não apenas responder dúvidas, mas também acessar bancos de dados, qualificar leads e usar "Tools" para
          agendar reuniões, emitir contratos e interagir com o mundo real.
        </p>
        <p>
          De imobiliárias e clínicas médicas ao e-commerce, estamos ajudando milhares de negócios a escalar seu atendimento
          sem perder a personalização.
        </p>
      </div>
    </motion.div>
  );
}
