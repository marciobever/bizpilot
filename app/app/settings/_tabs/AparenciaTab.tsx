"use client";
import { Sun, Moon, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

interface Props {
  theme: string;
  setTheme: (v: string) => void;
}

export function AparenciaTab({ theme, setTheme }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aparência</CardTitle>
        <CardDescription>Escolha o tema de exibição do painel.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
          {[
            { id: "light", label: "Modo Claro", desc: "Fundo claro com contraste suave.", icon: Sun, iconClass: "h-9 w-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center" },
            { id: "dark", label: "Modo Escuro", desc: "Ideal para ambientes com pouca luz.", icon: Moon, iconClass: "h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center" },
          ].map((t) => {
            const active = theme === t.id;
            return (
              <button key={t.id} onClick={() => setTheme(t.id)} className={cn("rounded-xl border-2 p-4 text-left transition-colors", active ? "border-brand-500 bg-brand-500/5" : "border-border hover:border-brand-500/40")}>
                <div className="flex items-center justify-between mb-3">
                  <div className={t.iconClass}><t.icon className="h-5 w-5" /></div>
                  {active && (
                    <div className="h-5 w-5 rounded-full bg-brand-500 text-white flex items-center justify-center">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <p className="font-semibold text-foreground">{t.label}</p>
                <p className="text-sm text-muted-foreground">{t.desc}</p>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
