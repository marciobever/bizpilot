"use client";
import { Code2, Key, Webhook, BookOpen } from "lucide-react";
import { motion } from "motion/react";

export default function ApiDocs() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-5xl mx-auto px-6 py-24 md:py-32"
    >
      <div className="mb-12">
         <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Documentação da API</h1>
         <p className="text-xl text-muted-foreground">
           Integre poderosos agentes de IA na sua aplicação via REST API ou Webhooks.
         </p>
      </div>

      <div className="grid md:grid-cols-4 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="md:col-span-1 space-y-2 text-sm"
        >
          <div className="font-semibold text-foreground mb-4">Sumário</div>
          <a href="#" className="block py-1 text-brand-400 font-medium">Autenticação</a>
          <a href="#" className="block py-1 text-muted-foreground hover:text-foreground">Criar Agente (POST)</a>
          <a href="#" className="block py-1 text-muted-foreground hover:text-foreground">Enviar Mensagem (POST)</a>
          <a href="#" className="block py-1 text-muted-foreground hover:text-foreground">Webhook de Tools</a>
          <a href="#" className="block py-1 text-muted-foreground hover:text-foreground">Evolution API Sync</a>
        </motion.div>

        <div className="md:col-span-3 space-y-12">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Key className="h-5 w-5 text-brand-400" />
              <h2 className="text-2xl font-bold">Autenticação</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Todas as requisições para a API da BizPilot exigem um token Bearer que pode ser
              obtido no painel de controle (Menu Configurações &gt; API Keys).
            </p>
            <div className="bg-black/90 p-4 rounded-lg border border-border/50 text-sm font-mono text-gray-300">
              Authorization: Bearer sk_live_YOUR_API_KEY
            </div>
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Code2 className="h-5 w-5 text-brand-400" />
              <h2 className="text-2xl font-bold">Enviar Mensagem</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Envia uma nova mensagem para a sessão de um agente, retornando também a resposta (se bloqueada)
              ou acionando o webhook caso funcione de forma assíncrona.
            </p>
            
            <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded text-sm font-bold inline-block mb-4">
              POST /v1/agents/&#123;agentId&#125;/messages
            </div>

            <div className="bg-black/90 p-4 rounded-lg border border-border/50 text-sm font-mono text-gray-300 overflow-x-auto">
              <pre>{`{
  "sessionId": "usr_123984",
  "message": "Quero agendar uma consulta para amanhã",
  "metadata": {
    "channel": "whatsapp",
    "customer": {
      "name": "João",
      "phone": "+5511999999999"
    }
  }
}`}</pre>
            </div>
          </motion.section>
        </div>
      </div>
    </motion.div>
  );
}
