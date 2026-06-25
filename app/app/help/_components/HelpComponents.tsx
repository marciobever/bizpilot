import React from "react";
import { Sparkles, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{n}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export function Code({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono break-all">{children}</code>;
}

export function Tip({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "warn" }) {
  return (
    <div className={cn(
      "flex gap-2 items-start p-3 rounded-lg border text-xs leading-relaxed",
      variant === "info" ? "bg-brand-500/5 border-brand-500/20 text-brand-300" : "bg-amber-500/5 border-amber-500/20 text-amber-300"
    )}>
      {variant === "info" ? <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
      <div>{children}</div>
    </div>
  );
}
