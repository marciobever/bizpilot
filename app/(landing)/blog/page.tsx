"use client";
import Link from 'next/link';
import { ArrowRight, Calendar, User } from "lucide-react";
import { motion } from "motion/react";

export default function Blog() {
  const POSTS = [
    {
      title: "Como usar Webhooks para conectar sua IA ao CRM",
      excerpt: "Descubra como ferramentas (Tools) e Webhooks podem transformar um chatbot simples em um agente de vendas autônomo conectado ao seu RD Station ou HubSpot.",
      date: "24 de Maio, 2026",
      author: "Equipe Synapse",
      category: "Técnico"
    },
    {
      title: "O fim das Árvores de Decisão (Chatbots Tradicionais)",
      excerpt: "Por que as empresas estão migrando de fluxos engessados para Inteligência Artificial Generativa baseada em RAG e instruções sistêmicas.",
      date: "12 de Maio, 2026",
      author: "Marcos V.",
      category: "Mercado"
    },
    {
      title: "Case de Sucesso: Redução de 80% do tempo de atendimento",
      excerpt: "Veja como a Clínica XYZ conseguiu automatizar o agendamento de mais de 2.000 pacientes no mês utilizando a Synapse AI integrada via WhatsApp.",
      date: "03 de Abril, 2026",
      author: "Mariana Costa",
      category: "Cases"
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-7xl mx-auto px-6 py-24 md:py-32"
    >
      <div className="max-w-3xl mb-16">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Blog e Novidades</h1>
        <p className="text-xl text-muted-foreground leading-relaxed">
          Artigos, tutoriais e insights sobre automação inteligente, integração via APIs 
          e o futuro do atendimento ao cliente.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {POSTS.map((post, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={post.title} 
            className="flex flex-col bg-card border border-border rounded-2xl overflow-hidden hover:border-indigo-500/30 transition-colors group cursor-pointer"
          >
            <div className="h-48 bg-secondary/50 flex items-center justify-center p-6 border-b border-border">
              <span className="text-indigo-400 font-medium tracking-wider uppercase text-sm border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 rounded-full">
                {post.category}
              </span>
            </div>
            <div className="p-6 flex flex-col flex-1">
              <h3 className="text-xl font-bold mb-3 group-hover:text-indigo-400 transition-colors">
                {post.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6 flex-1">
                {post.excerpt}
              </p>
              
              <div className="flex items-center justify-between mt-auto pt-6 border-t border-border/50">
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {post.date}</div>
                  <div className="flex items-center gap-1.5"><User className="h-3 w-3" /> {post.author}</div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-indigo-400 transition-colors" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
