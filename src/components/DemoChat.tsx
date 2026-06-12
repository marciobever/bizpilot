"use client";
import { useState, useRef, useEffect } from "react";
import { X, Send, CheckCircle2, Tag, Clock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Logo } from "@/components/ui/Logo";

type ListItem = {
  icon: "tag" | "clock" | "sparkles";
  title: string;
  subtitle?: string;
};

type Message = {
  id: number;
  from: "bot" | "user";
  text?: string;
  list?: ListItem[];
  action?: string;
};

const LIST_ICONS = {
  tag: Tag,
  clock: Clock,
  sparkles: Sparkles,
};

const INITIAL_MESSAGE: Message = {
  id: 0,
  from: "bot",
  text: "Olá! 👋 Sou o assistente virtual da BizPilot. Pergunte sobre preços, horários, ou diga algo como \"quero agendar uma reunião\" para ver como cuido do seu atendimento 24h.",
};

function replyFor(text: string): Message[] {
  const t = text.toLowerCase();

  if (/preç|valor|plano|quanto custa/.test(t)) {
    return [
      {
        id: Date.now(),
        from: "bot",
        text: "Temos planos pensados pro seu negócio crescer sem dor de cabeça:",
      },
      {
        id: Date.now() + 1,
        from: "bot",
        list: [
          { icon: "tag", title: "Básico — R$ 39,99/mês", subtitle: "WhatsApp ilimitado + base de conhecimento" },
          { icon: "tag", title: "Profissional — R$ 79,99/mês", subtitle: "+ respostas em áudio e memória de dados" },
          { icon: "tag", title: "Avançado — sob consulta", subtitle: "Múltiplos agentes e integrações" },
        ],
      },
      {
        id: Date.now() + 2,
        from: "bot",
        text: "Quer que eu te envie o link com todos os detalhes?",
      },
    ];
  }

  if (/agend|reuni|hor[áa]rio|marcar/.test(t)) {
    return [
      {
        id: Date.now(),
        from: "bot",
        text: "Consigo verificar sua agenda e marcar automaticamente. Tenho esses horários livres amanhã:",
      },
      {
        id: Date.now() + 1,
        from: "bot",
        list: [
          { icon: "clock", title: "10:00", subtitle: "Manhã" },
          { icon: "clock", title: "15:00", subtitle: "Tarde" },
        ],
      },
      {
        id: Date.now() + 2,
        from: "bot",
        action: "Ação Executada: Agendamento criado para amanhã, 10h",
      },
    ];
  }

  if (/oi|ol[áa]|bom dia|boa tarde|boa noite|tudo bem/.test(t)) {
    return [{
      id: Date.now(),
      from: "bot",
      text: "Tudo ótimo! Estou pronto pra te ajudar 24 horas por dia. Quer saber sobre preços, agendar um horário ou tirar alguma dúvida sobre o produto?",
    }];
  }

  return [{
    id: Date.now(),
    from: "bot",
    text: "Entendi! No seu agente real, essa resposta seria baseada na sua base de conhecimento (RAG), no tom de voz e nas regras que você configurar — sem precisar programar nada.",
  }];
}

export function DemoChatModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || typing) return;

    const userMsg: Message = { id: Date.now(), from: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      setMessages((prev) => [...prev, ...replyFor(text)]);
    }, 1100);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.4 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col h-[600px] max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-secondary/40 shrink-0">
            <Logo className="h-9 w-9" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">Atendimento BizPilot</div>
              <div className="text-xs text-emerald-500 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online — simulação
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-background/50">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={m.from === "user" ? "flex justify-end" : "flex justify-start"}
              >
                {m.action ? (
                  <div className="bg-emerald-500/10 text-emerald-500 text-xs px-3 py-1.5 rounded-full border border-emerald-500/20 flex gap-1.5 items-center font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>{m.action}</span>
                  </div>
                ) : m.list ? (
                  <div className="max-w-[85%] w-full bg-card border border-border rounded-2xl rounded-tl-sm overflow-hidden shadow-sm divide-y divide-border">
                    {m.list.map((item, i) => {
                      const Icon = LIST_ICONS[item.icon];
                      return (
                        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                          <div className="h-8 w-8 rounded-lg bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground leading-tight">{item.title}</div>
                            {item.subtitle && (
                              <div className="text-xs text-muted-foreground leading-tight mt-0.5">{item.subtitle}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={
                      m.from === "user"
                        ? "max-w-[80%] bg-brand-500 text-white rounded-2xl rounded-tr-sm px-3 py-2 text-sm leading-relaxed shadow-sm"
                        : "max-w-[80%] bg-card border border-border rounded-2xl rounded-tl-sm px-3 py-2 text-sm leading-relaxed shadow-sm"
                    }
                  >
                    {m.text}
                  </div>
                )}
              </motion.div>
            ))}
            {typing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-2.5 flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border bg-card shrink-0">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Digite uma mensagem..."
                className="flex-1 h-10 rounded-full border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || typing}
                className="h-10 w-10 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0 disabled:opacity-50 hover:bg-brand-600 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Simulação para demonstração — seu agente real responde com base na sua configuração.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
