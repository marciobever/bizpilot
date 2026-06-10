import * as React from "react"
import { cn } from "@/lib/utils"

export function Avatar({ src, fallback, className }: { src?: string, fallback: string, className?: string }) {
  return (
    <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-secondary items-center justify-center text-sm font-medium", className)}>
      {src ? (
         <img src={src} alt="avatar" className="aspect-square h-full w-full" />
      ) : (
         <span className="text-secondary-foreground">{fallback}</span>
      )}
    </div>
  )
}
