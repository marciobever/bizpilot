import { Outlet, Link, useLocation } from "react-router-dom";
import { Sparkles, ArrowRight, Twitter, Linkedin, Instagram } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";

export default function LandingLayout() {
  const location = useLocation();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-indigo-500/30">
      <nav className="border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-10">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
                <Sparkles className="h-4 w-4 text-indigo-400" />
              </div>
              <span className="font-bold tracking-tight text-xl">Synapse AI</span>
            </Link>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium">
              <Link 
                to="/" 
                className={`relative py-2 transition-colors hover:text-foreground ${location.pathname === '/' ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                Início
                {location.pathname === '/' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-full" />
                )}
              </Link>
              <Link 
                to="/funcionalidades" 
                className={`relative py-2 transition-colors hover:text-foreground ${location.pathname === '/funcionalidades' ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                Funcionalidades
                {location.pathname === '/funcionalidades' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-full" />
                )}
              </Link>
              <Link 
                to="/setores" 
                className={`relative py-2 transition-colors hover:text-foreground ${location.pathname === '/setores' ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                Setores
                {location.pathname === '/setores' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-full" />
                )}
              </Link>
              <Link 
                to="/precos" 
                className={`relative py-2 transition-colors hover:text-foreground ${location.pathname === '/precos' ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                Preços
                {location.pathname === '/precos' && (
                  <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-full" />
                )}
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {!user ? (
              <>
                <Link to="/auth/login" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Entrar
                </Link>
                <Button asChild className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6 shadow-lg shadow-white/5">
                  <Link to="/auth/registro">Criar Conta</Link>
                </Button>
              </>
            ) : (
              <Button asChild className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-full px-6 shadow-lg shadow-indigo-500/20">
                <Link to="/app">Ir para Painel <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      <footer className="border-t border-border/40 bg-secondary/20 pt-16 pb-8 mt-auto shrink-0">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
            <div className="col-span-2 lg:col-span-2 space-y-6">
              <Link to="/" className="flex items-center gap-2">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                </div>
                <span className="font-bold tracking-tight text-xl">Synapse AI</span>
              </Link>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                Transformando a forma como empresas se comunicam, vendem e escalam suas operações através de Inteligência Artificial nativa.
              </p>
              <div className="flex gap-4">
                <a href="#" className="h-9 w-9 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors">
                  <Twitter className="h-4 w-4" />
                </a>
                <a href="#" className="h-9 w-9 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors">
                  <Linkedin className="h-4 w-4" />
                </a>
                <a href="#" className="h-9 w-9 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-foreground">Produto</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/funcionalidades" className="hover:text-indigo-400 transition-colors">Funcionalidades</Link></li>
                <li><Link to="/precos" className="hover:text-indigo-400 transition-colors">Preços</Link></li>
                <li><Link to="/setores" className="hover:text-indigo-400 transition-colors">Setores</Link></li>
                <li><Link to="/integracoes" className="hover:text-indigo-400 transition-colors">Integrações</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-foreground">Recursos</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/blog" className="hover:text-indigo-400 transition-colors">Blog</Link></li>
                <li><Link to="/api-docs" className="hover:text-indigo-400 transition-colors">Documentação da API</Link></li>
                <li><Link to="/ajuda" className="hover:text-indigo-400 transition-colors">Central de Ajuda</Link></li>
                <li><Link to="/cases" className="hover:text-indigo-400 transition-colors">Casos de Sucesso</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-foreground">Empresa</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/sobre" className="hover:text-indigo-400 transition-colors">Sobre Nós</Link></li>
                <li><Link to="/contato" className="hover:text-indigo-400 transition-colors">Contato</Link></li>
                <li><Link to="/termos" className="hover:text-indigo-400 transition-colors">Termos de Uso</Link></li>
                <li><Link to="/privacidade" className="hover:text-indigo-400 transition-colors">Política de Privacidade</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <div>
              © {new Date().getFullYear()} Synapse AI. Todos os direitos reservados.
            </div>
            <div className="flex gap-4 font-medium">
              <span>Feito com intenção para automação inteligente.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
