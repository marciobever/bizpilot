"use client";
import Link from "next/link";
import { Code2, Webhook, Bell, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

// A API pública ainda não existe — esta página é honesta sobre isso e captura
// o interesse de quem precisa dela. Quando a API for construída, a doc real
// volta a viver nesta rota.
export default function ApiDocs() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-3xl mx-auto px-6 py-24 md:py-32 text-center"
    >
      <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 rounded-full px-4 py-1.5 mb-8">
        <Bell className="h-3.5 w-3.5" /> Em breve
      </div>

      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">API pública da BizPilot</h1>
      <p className="text-xl text-muted-foreground leading-relaxed mb-12">
        Estamos construindo uma API REST para você integrar seus agentes de IA
        diretamente na sua aplicação — criar agentes, enviar mensagens e receber
        eventos por webhook, tudo programaticamente.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 text-left mb-12">
        <div className="rounded-2xl border border-border bg-card p-6">
          <Code2 className="h-6 w-6 text-brand-500 mb-3" />
          <div className="font-semibold mb-1">REST API</div>
          <p className="text-sm text-muted-foreground">
            Endpoints para gerenciar agentes e conversas a partir do seu sistema.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6">
          <Webhook className="h-6 w-6 text-brand-500 mb-3" />
          <div className="font-semibold mb-1">Webhooks</div>
          <p className="text-sm text-muted-foreground">
            Receba eventos de novas mensagens, leads e agendamentos em tempo real.
          </p>
        </div>
      </div>

      <p className="text-muted-foreground mb-6">
        Precisa da API para o seu caso de uso? Fale com a gente — priorizamos o
        roadmap com base em quem pede.
      </p>
      <Link
        href="/contato"
        className="inline-flex items-center gap-2 h-12 px-6 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors"
      >
        Falar com o time <ArrowRight className="h-4 w-4" />
      </Link>
    </motion.div>
  );
}
