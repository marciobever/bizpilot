"use client";
import { useState, useEffect } from "react";
import { X, CheckCircle2, Circle, Smartphone, BookOpen, Save } from "lucide-react";

interface Props {
  agentId: string;
  agentName: string;
  waConnected: boolean;
  metaConnected: boolean;
  knowledgeCount: number;
  onNavigate: (tab: string) => void;
  onSave: () => void;
}

export function AgentTour({ agentId, waConnected, metaConnected, knowledgeCount, onNavigate, onSave }: Props) {
  const checklistKey = `bizpilot-tour-checklist-${agentId}`;

  const [checklistDismissed, setChecklistDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(checklistKey)) setChecklistDismissed(true);
  }, [agentId]);

  const isWhatsAppDone = waConnected || metaConnected;
  const isKnowledgeDone = knowledgeCount > 0;

  const steps = [
    {
      icon: Smartphone,
      title: "Conectar WhatsApp",
      done: isWhatsAppDone,
      action: () => onNavigate("channels"),
    },
    {
      icon: BookOpen,
      title: "Ensinar sobre sua empresa",
      done: isKnowledgeDone,
      action: () => onNavigate("knowledge"),
    },
    {
      icon: Save,
      title: "Salvar e Publicar",
      done: false,
      action: () => onSave(),
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = isWhatsAppDone && isKnowledgeDone;

  function dismissChecklist() {
    setChecklistDismissed(true);
    localStorage.setItem(checklistKey, "1");
  }

  if (checklistDismissed || allDone) return null;

  return (
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
  );
}
