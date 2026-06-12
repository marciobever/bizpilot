import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * BizPilot mark: a paper plane on a steady ascending course, leaving a
 * three-step "growth trail" behind it. Reads as "autopilot + growth",
 * not a generic AI sparkle or a cartoon travel-agency airplane.
 *
 * Single navy tile so it holds up on both light and dark surfaces and
 * doubles as the favicon / app icon.
 */
function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center rounded-lg bg-[#0B1F3A] shrink-0", className)}>
      <svg viewBox="0 0 48 48" className="h-[68%] w-[68%]" xmlns="http://www.w3.org/2000/svg">
        {/* growth trail */}
        <circle cx="8" cy="40" r="2" fill="#22C55E" />
        <circle cx="14.5" cy="34.5" r="2.6" fill="#22C55E" />
        <circle cx="21" cy="29" r="3.2" fill="#22C55E" />
        {/* paper plane, top facet */}
        <path d="M40 8 L10 22 L26 26 Z" fill="#1E88FF" />
        {/* paper plane, folded underside */}
        <path d="M40 8 L26 26 L20 40 Z" fill="#FFFFFF" fillOpacity="0.92" />
      </svg>
    </div>
  );
}

/** Two-tone "BizPilot" wordmark. "Biz" follows the theme, "Pilot" stays electric blue. */
function LogoWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("font-bold tracking-tight text-foreground", className)}>
      Biz<span style={{ color: "#1E88FF" }}>Pilot</span>
    </span>
  );
}

/** Horizontal lockup: icon + wordmark (+ optional tagline). */
function LogoFull({ className, iconClassName, textClassName, tagline }: { className?: string; iconClassName?: string; textClassName?: string; tagline?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Logo className={cn("h-8 w-8", iconClassName)} />
      <span className="flex flex-col leading-tight">
        <LogoWordmark className={cn("text-xl", textClassName)} />
        {tagline && <span className="text-xs text-muted-foreground font-normal">{tagline}</span>}
      </span>
    </span>
  );
}

export const BIZPILOT_TAGLINE = "Seu negócio no piloto automático";

export { Logo, LogoWordmark, LogoFull };
