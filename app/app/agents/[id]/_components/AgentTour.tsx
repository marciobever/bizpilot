"use client";
import { useState, useEffect } from "react";
import { X, CheckCircle2, Circle, Smartphone, BookOpen, Save, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  agentId: string;
  agentName: string;
  waConnected: boolean;
  metaConnected: boolean;
  knowledgeCount: number;
  onNavigate: (tab: string) => void;
  onSave: () => void;
}

export function AgentTour({ agentId, agentName, waConnected, metaConnected, knowledgeCount, onNavigate, onSave }: Props) {
  const welcomeKey = `bizpilot-tour-welcome-${agentId}`;
  const checklistKey = `bizpilot-tour-checklist-${agentId}`;

  const [showWelcome, setShowWelcome] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(welcomeKey)) setShowWelcome(true);
    if (localStorage.getItem(checklistKey)) setChecklistDismissed(true);
  }, [agentId]);

  const isWhatsAppDone = waConnected || metaConnected;
  const isKnowledgeDone = knowledgeCount > 0;

  const steps = [
    {
      icon: Smartphone,
      title: "Conectar WhatsApp",
      desc: "Vincule o número que o bot vai usar para responder seus clientes.",
      done: isWhatsAppDone,
      action: () => { onNavigate("channels"); closeWelcome(); },
    },
    {
      icon: BookOpen,
      title: "Ensinar sobre sua empresa",
      desc: "Adicione preços, serviços e FAQ para o bot responder com precisão.",
      done: isKnowledgeDone,
      action: () => { onNavigate("knowledge"); closeWelcome(); },
    },
    {
      icon: Save,
      title: "Salvar e Publicar",
      desc: "Quando estiver pronto, salve e o bot começa a funcionar imediatamente.",
      done: false,
      action: () => { onSave(); closeWelcome(); },
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = isWhatsAppDone && isKnowledgeDone;

  function closeWelcome() {
    setShowWelcome(false);
    localStorage.setItem(welcomeKey, "1");
  }

  function dismissChecklist() {
    setChecklistDismissed(true);
    localStorage.setItem(checklistKey, "1");
  }

  return (
    <>
      {/* ── Modal de boas-vindas (aparece uma vez) ── */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl">
            <div className="p-6">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-brand-500" />
                  <h2 className="text-xl font-bold">Bot criado com sucesso!</h2>
                </div>
                <button onClick={closeWelcome} className="text-muted-foreground hover:text-foreground p-1 -mt-1 -mr-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-muted-foreground text-sm mb-5">
                Configure <strong>{agentName}</strong> em 3 passos rápidos para começar a atender clientes.
              </p>

              <div className="space-y-3">
                {steps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <button
                      key={i}
                      onClick={step.action}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-background hover:border-brand-500/50 hover:bg-brand-500/5 transition-all text-left group"
                    >
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-brand-500">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{step.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-brand-500 shrink-0 transition-colors" />
                    </button>
                  );
                })}
              </div>

              <Button variant="ghost" size="sm" onClick={closeWelcome} className="w-full mt-4 text-muted-foreground hover:text-foreground">
                Explorar por conta própria
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Checklist persistente (fica até completar ou dispensar) ── */}
      {!showWelcome && !checklistDismissed && !allDone && (
        <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 px-4 py-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-brand-400 uppercase tracking-wide">
              Primeiros passos — {doneCount} de {steps.length} concluídos
            </p>
            <button onClick={dismissChecklist} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            {steps.map((step, i) => {
              const Icon = step.done ? CheckCircle2 : Circle;
              return (
                <button
                  key={i}
                  onClick={step.done ? undefined : step.action}
                  disabled={step.done}
                  className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg transition-all ${
                    step.done
                      ? "opacity-50 cursor-default"
                      : "hover:bg-brand-500/10 hover:text-brand-400 cursor-pointer"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${step.done ? "text-emerald-500" : "text-muted-foreground"}`} />
                  <span className={step.done ? "line-through text-muted-foreground" : ""}>{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
