import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Logo, LogoWordmark } from "@/components/ui/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-brand-500/30">
      <div className="flex-1 flex flex-col justify-center items-center p-6 relative">
        <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Home
        </Link>
        
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <Link href="/" className="flex items-center gap-2 group mb-6">
              <Logo className="h-10 w-10 group-hover:opacity-90 transition-opacity" />
              <LogoWordmark className="text-xl" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-center">Bem-vindo à BizPilot</h1>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Acesse sua conta para orquestrar seus agentes.
            </p>
          </div>
          
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/5">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
