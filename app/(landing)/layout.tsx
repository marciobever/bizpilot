"use client";
import { ArrowRight, Twitter, Linkedin, Instagram, ChevronDown, LogOut, Settings, Sun, Moon, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo, LogoWordmark } from "@/components/ui/Logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { usePathname as useLocation, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useRouter();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate.push("/auth/login");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-brand-500/30">
      <nav className="border-b border-white/5 bg-background/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 grid grid-cols-[auto_1fr_auto] items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo className="h-8 w-8 group-hover:opacity-90 transition-opacity" />
            <LogoWordmark className="text-xl" />
          </Link>

          <div className="hidden md:flex items-center justify-center gap-8 text-sm font-medium">
            <Link
              href="/"
              className={`relative py-2 transition-colors hover:text-foreground ${location === '/' ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              Início
              {location === '/' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500 rounded-full" />
              )}
            </Link>
            <Link
              href="/funcionalidades"
              className={`relative py-2 transition-colors hover:text-foreground ${location === '/funcionalidades' ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              Funcionalidades
              {location === '/funcionalidades' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500 rounded-full" />
              )}
            </Link>
            <Link
              href="/setores"
              className={`relative py-2 transition-colors hover:text-foreground ${location === '/setores' ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              Setores
              {location === '/setores' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500 rounded-full" />
              )}
            </Link>
            <Link
              href="/precos"
              className={`relative py-2 transition-colors hover:text-foreground ${location === '/precos' ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              Preços
              {location === '/precos' && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-500 rounded-full" />
              )}
            </Link>
          </div>

          <div className="flex items-center justify-end gap-6">
            {!user ? (
              <>
                <Link href="/auth/login" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Entrar
                </Link>
                <Button asChild className="bg-foreground text-background hover:bg-foreground/90 rounded-full px-6 shadow-lg shadow-white/5">
                  <Link href="/auth/registro">Criar Conta</Link>
                </Button>
              </>
            ) : (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors"
                >
                  <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                    {user?.user_metadata?.full_name?.substring(0, 2) || <UserIcon className="h-4 w-4" />}
                  </div>
                  <span className="hidden lg:block text-sm font-medium text-foreground truncate max-w-[140px]">
                    {user?.user_metadata?.full_name || "Usuário"}
                  </span>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform hidden lg:block", userMenuOpen && "rotate-180")} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-xl py-1.5 z-20">
                    <div className="px-3 py-2 border-b border-border">
                      <div className="text-sm font-medium text-foreground truncate">{user?.user_metadata?.full_name || "Usuário"}</div>
                      <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                    </div>
                    <Link
                      href="/app"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-400 hover:bg-brand-500/10 transition-colors"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Acessar Painel
                    </Link>
                    <button
                      onClick={toggleTheme}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                    </button>
                    <Link
                      href="/app/settings"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Configurações
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border/40 bg-secondary/20 pt-16 pb-8 mt-auto shrink-0">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
            <div className="col-span-2 lg:col-span-2 space-y-6">
              <Link href="/" className="flex items-center gap-2">
                <Logo className="h-8 w-8" />
                <LogoWordmark className="text-xl" />
              </Link>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
                Transformando a forma como empresas se comunicam, vendem e escalam suas operações através de Inteligência Artificial nativa.
              </p>
              <div className="flex gap-4">
                <a href="#" className="h-9 w-9 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-brand-500/10 hover:text-brand-400 transition-colors">
                  <Twitter className="h-4 w-4" />
                </a>
                <a href="#" className="h-9 w-9 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-brand-500/10 hover:text-brand-400 transition-colors">
                  <Linkedin className="h-4 w-4" />
                </a>
                <a href="#" className="h-9 w-9 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground hover:bg-brand-500/10 hover:text-brand-400 transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-foreground">Produto</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/funcionalidades" className="hover:text-brand-400 transition-colors">Funcionalidades</Link></li>
                <li><Link href="/precos" className="hover:text-brand-400 transition-colors">Preços</Link></li>
                <li><Link href="/setores" className="hover:text-brand-400 transition-colors">Setores</Link></li>
                <li><Link href="/integracoes" className="hover:text-brand-400 transition-colors">Integrações</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-foreground">Recursos</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/blog" className="hover:text-brand-400 transition-colors">Blog</Link></li>
                <li><Link href="/api-docs" className="hover:text-brand-400 transition-colors">Documentação da API</Link></li>
                <li><Link href="/ajuda" className="hover:text-brand-400 transition-colors">Central de Ajuda</Link></li>
                <li><Link href="/cases" className="hover:text-brand-400 transition-colors">Casos de Sucesso</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-foreground">Empresa</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="/sobre" className="hover:text-brand-400 transition-colors">Sobre Nós</Link></li>
                <li><Link href="/contato" className="hover:text-brand-400 transition-colors">Contato</Link></li>
                <li><Link href="/termos" className="hover:text-brand-400 transition-colors">Termos de Uso</Link></li>
                <li><Link href="/privacidade" className="hover:text-brand-400 transition-colors">Política de Privacidade</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border/40 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <div>
              © {new Date().getFullYear()} BizPilot. Todos os direitos reservados.
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
