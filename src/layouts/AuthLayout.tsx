import { Outlet, Link } from "react-router-dom";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-indigo-500/30">
      <div className="flex-1 flex flex-col justify-center items-center p-6 relative">
        <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Home
        </Link>
        
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <Link to="/" className="flex items-center gap-2 group mb-6">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
                <Sparkles className="h-5 w-5 text-indigo-400" />
              </div>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-center">Bem-vindo à Synapse</h1>
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Acesse sua conta para orquestrar seus agentes.
            </p>
          </div>
          
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xl shadow-black/5">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
