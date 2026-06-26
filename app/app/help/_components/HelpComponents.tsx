import React from "react";
import { Sparkles, AlertTriangle, Play, Monitor, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="h-6 w-6 rounded-full bg-brand-500/10 text-brand-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-secondary text-xs font-mono break-all text-foreground">{children}</code>
  );
}

export function Tip({ children, variant = "info" }: { children: React.ReactNode; variant?: "info" | "warn" }) {
  return (
    <div className={cn(
      "flex gap-2 items-start p-3 rounded-lg border text-xs leading-relaxed",
      variant === "info"
        ? "bg-brand-500/5 border-brand-500/20 text-brand-300"
        : "bg-amber-500/5 border-amber-500/20 text-amber-300"
    )}>
      {variant === "info"
        ? <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        : <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
      <div>{children}</div>
    </div>
  );
}

export function ScreenMock({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden my-4 shadow-sm">
      <div className="flex items-center gap-1.5 px-3 py-2 bg-secondary/30 border-b border-border">
        <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
        <span className="h-2 w-2 rounded-full bg-[#ffbd2e]" />
        <span className="h-2 w-2 rounded-full bg-[#28c840]" />
        <span className="text-[10px] text-muted-foreground ml-2 font-mono">BizPilot — {label}</span>
      </div>
      <div className="bg-[#0a0a0c] h-32 flex flex-col items-center justify-center gap-3 relative">
        <Monitor className="h-6 w-6 text-[#252525]" />
        {hint && <p className="text-[10px] text-[#2d2d2d] font-mono text-center px-6">{hint}</p>}
        <span className="absolute bottom-2 right-3 text-[9px] text-[#252525] font-mono">screenshot em breve</span>
      </div>
    </div>
  );
}

export function VideoCard({
  title,
  description,
  duration,
}: {
  title: string;
  description: string;
  duration?: string;
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden group hover:border-brand-500/30 transition-all cursor-default">
      <div className="bg-[#0a0a0c] aspect-video flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-transparent" />
        <div className="h-12 w-12 rounded-full border border-[#1e1e20] flex items-center justify-center group-hover:border-brand-500/20 transition-all relative z-10">
          <Play className="h-4 w-4 text-[#333] ml-0.5 group-hover:text-brand-500/40 transition-colors" />
        </div>
        {duration && (
          <span className="absolute bottom-2 right-2 text-[10px] bg-black/80 text-[#555] px-1.5 py-0.5 rounded font-mono">
            {duration}
          </span>
        )}
        <span className="absolute top-2 left-2 text-[10px] bg-amber-500/10 text-amber-500/60 border border-amber-500/15 px-1.5 py-0.5 rounded">
          Em breve
        </span>
      </div>
      <div className="p-3 bg-card">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export function QuickStep({
  n,
  icon: Icon,
  title,
  description,
  href,
}: {
  n: number;
  icon: React.ElementType;
  title: string;
  description: string;
  href?: string;
}) {
  const inner = (
    <div className={cn(
      "flex-1 p-4 rounded-xl border border-border bg-card transition-all",
      href && "hover:border-brand-500/40 hover:bg-secondary/30 cursor-pointer"
    )}>
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-muted-foreground">PASSO {n}</span>
          </div>
          <p className="text-sm font-medium leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
  return href ? <a href={href}>{inner}</a> : inner;
}

export function FeatureTag({ children, color = "brand" }: { children: React.ReactNode; color?: "brand" | "emerald" | "amber" | "rose" }) {
  const colors = {
    brand: "bg-brand-500/10 text-brand-400 border-brand-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    rose: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", colors[color])}>
      <CheckCircle2 className="h-2.5 w-2.5" /> {children}
    </span>
  );
}
