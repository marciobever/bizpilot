"use client";

import {
  Bot,
  MessageSquare,
  Users,
  Workflow,
  BarChart,
  Settings,
  LogOut,
  HelpCircle,
  LifeBuoy,
  Sun,
  Moon,
  Menu,
  X,
  ChevronDown,
  User as UserIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo, LogoWordmark } from "@/components/ui/Logo";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const SIDEBAR_ITEMS = [
  { icon: BarChart, label: "Visão Geral", path: "/app" },
  { icon: Bot, label: "Agentes", path: "/app/agents" },
  { icon: MessageSquare, label: "Conversas", path: "/app/conversations" },
  { icon: Users, label: "Leads", path: "/app/leads" },
  { icon: Workflow, label: "Automações", path: "/app/automations" },
  { icon: Settings, label: "Configurações", path: "/app/settings" },
  { icon: HelpCircle, label: "Ajuda", path: "/app/help" },
  { icon: LifeBuoy, label: "Suporte", path: "/app/suporte" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = usePathname();
  const navigate = useRouter();
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate.push("/auth/login");
    }
  }, [user, loading, navigate]);

  // Fecha a sidebar mobile e o menu do usuário ao navegar para outra página.
  useEffect(() => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
  }, [location]);

  // Fecha o menu do usuário ao clicar fora dele.
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

  if (loading || !user) {
    return <div className="h-screen w-full flex items-center justify-center bg-background"><span className="text-muted-foreground">Carregando...</span></div>;
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "w-64 border-r border-border bg-card flex flex-col shrink-0",
        "fixed inset-y-0 left-0 z-40 transition-transform duration-200 md:static md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2 text-lg">
            <Logo className="h-7 w-7" />
            <LogoWordmark />
          </Link>
          <button className="md:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto py-4 px-3 flex flex-col gap-1">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = item.path === "/app"
              ? location === "/app"
              : location === item.path || location.startsWith(item.path + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        <header className="h-16 border-b border-border flex items-center px-4 md:px-8 bg-card/50 backdrop-blur-sm sticky top-0 z-10 shrink-0 gap-3">
          <button className="md:hidden text-muted-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground mr-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Sistemas Operacionais
          </div>

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors"
            >
              <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
                {user?.user_metadata?.full_name?.substring(0, 2) || <UserIcon className="h-4 w-4" />}
              </div>
              <div className="hidden md:flex flex-col items-start leading-tight">
                <span className="text-sm font-medium text-foreground truncate max-w-[140px]">
                  {user?.user_metadata?.full_name || "Usuário"}
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                  {user?.email}
                </span>
              </div>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform hidden md:block", userMenuOpen && "rotate-180")} />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card shadow-xl py-1.5 z-20">
                <div className="px-3 py-2 border-b border-border md:hidden">
                  <div className="text-sm font-medium text-foreground truncate">{user?.user_metadata?.full_name || "Usuário"}</div>
                  <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                </div>
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
        </header>
        <div className="bento-grid-bg p-4 md:p-8 max-w-7xl mx-auto w-full flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
