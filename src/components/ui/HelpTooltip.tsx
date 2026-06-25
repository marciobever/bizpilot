"use client";
import { useState } from "react";
import { HelpCircle } from "lucide-react";

interface Props {
  text: string;
}

export function HelpTooltip({ text }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="text-muted-foreground hover:text-foreground transition-colors align-middle"
        aria-label="Ajuda"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>

      {open && (
        <span className="absolute left-5 top-1/2 -translate-y-1/2 z-50 w-56 rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md leading-relaxed pointer-events-none">
          {text}
          <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-border" />
        </span>
      )}
    </span>
  );
}
