"use client";

import {
  Bot,
  MessageSquare,
  Users,
  Workflow,
  BarChart,
  Settings,
  LogOut,
  Sparkles,
  HelpCircle,
  Sun,
  Moon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { supabase } from "@/lib/supabase";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";

const SIDEBAR_ITEMS = [
  { icon: BarChart, label: "Visão Geral", path: "/app" },
  { icon: Bot, label: "Agentes", path: "/app/agents" },
  { icon: MessageSquare, label: "Conversas", path: "/app/conversations" },
  { icon: Users, label: "Leads", path: "/app/leads" },
  { icon: Workflow, label: "Automações", path: "/app/automations" },
  { icon: Settings, label: "Configurações", path: "/app/settings" },
  { icon: HelpCircle, label: "Ajuda", path: "/app/help" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = usePathname();
  const navigate = useRouter();
  const { user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!loading && !user) {
      navigate.push("/auth/login");
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate.push("/auth/login");
  };

  if (loading || !user) {
    return <div className="h-screen w-full flex items-center justify-center bg-background"><span className="text-muted-foreground">Carregando...</span></div>;
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <Sparkles className="h-5 w-5 text-indigo-500" />
            <span>Synapse<span className="text-muted-foreground font-normal">AI</span></span>
          </Link>
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

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white uppercase shrink-0">
              {user?.user_metadata?.full_name?.substring(0, 2) || "AD"}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium leading-none truncate">
                {user?.user_metadata?.full_name || "Usuário"}
              </span>
              <span className="text-xs text-muted-foreground mt-1 truncate">
                {user?.email}
              </span>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary mb-1" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
            {theme === "dark" ? "Modo Claro" : "Modo Escuro"}
          </Button>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-red-400 hover:bg-red-500/10" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col">
        <header className="h-16 border-b border-border flex items-center px-8 bg-card/50 backdrop-blur-sm sticky top-0 z-10 shrink-0">
          <div className="flex-1" />
          <div className="text-sm text-muted-foreground mr-4">Status: <span className="text-emerald-500 font-medium">Sistemas Operacionais</span></div>
        </header>
        <div className="p-8 max-w-7xl mx-auto w-full flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
