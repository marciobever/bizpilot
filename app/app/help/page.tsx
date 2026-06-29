"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search, Bot, Smartphone, Brain, ChevronDown, PlayCircle,
  Zap, Wrench, HelpCircle, BookOpen, ArrowRight, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { SECTIONS, FAQ_ITEMS, CATEGORIES, VIDEO_ITEMS } from "./_data/helpData";
import { VideoCard, QuickStep } from "./_components/HelpComponents";

const QUICK_STEPS = [
  { n: 1, icon: Bot, title: "Criar o Agente", description: "Use o Assistente de Criação para configurar personalidade, tom e funções em minutos.", href: "/app/agents/new" },
  { n: 2, icon: Smartphone, title: "Conectar o WhatsApp", description: "Escaneie o QR Code na aba Canais e veja o agente ficar online em segundos.", href: undefined },
  { n: 3, icon: Brain, title: "Ensinar o Agente", description: "Adicione preços, FAQs e políticas na Base de Conhecimento — o agente passa a responder com precisão.", href: undefined },
  { n: 4, icon: Zap, title: "Testar e Publicar", description: "Mande uma mensagem de teste e ajuste o que precisar antes de divulgar o número.", href: undefined },
];

export default function HelpPage() {
  const [activeCategory, setActiveCategory] = useState("inicio");
  const [open, setOpen] = useState<string | null>("overview");
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const category = CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0];
  const visibleSections = SECTIONS.filter((s) => category.sectionIds.includes(s.id));

  const searchResults = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return null;
    const sections = SECTIONS.filter(
      (s) => s.title.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q)
    );
    const faqs = FAQ_ITEMS.filter((f) => f.question.toLowerCase().includes(q));
    return { sections, faqs };
  }, [searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Hero */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-brand-400" /> Central de Ajuda
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Guias passo a passo, vídeos e respostas para tudo sobre o BizPilot.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar em todos os artigos e perguntas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-border bg-secondary/30 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Search results */}
      {isSearching && searchResults && (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            {searchResults.sections.length + searchResults.faqs.length} resultado(s) para "{searchQuery}"
          </p>
          {searchResults.sections.length === 0 && searchResults.faqs.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">Nenhum resultado encontrado. Tente termos diferentes.</p>
          )}
          {searchResults.sections.map((section) => {
            const Icon = section.icon;
            const isOpen = open === section.id;
            return (
              <Card key={section.id} className="overflow-hidden">
                <button className="w-full text-left" onClick={() => setOpen(isOpen ? null : section.id)}>
                  <CardHeader className="flex-row items-center gap-4 cursor-pointer hover:bg-secondary/20 transition-colors py-4">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", section.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{section.title}</CardTitle>
                      <CardDescription>{section.subtitle}</CardDescription>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
                  </CardHeader>
                </button>
                {isOpen && <CardContent className="pt-0 border-t border-border"><div className="pt-4">{section.content}</div></CardContent>}
              </Card>
            );
          })}
          {searchResults.faqs.map((item) => {
            const isOpen = openFaq === item.id;
            return (
              <Card key={item.id} className="overflow-hidden">
                <button className="w-full text-left" onClick={() => setOpenFaq(isOpen ? null : item.id)}>
                  <CardHeader className="flex-row items-center gap-3 cursor-pointer hover:bg-secondary/20 transition-colors py-3.5">
                    <HelpCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    <CardTitle className="text-sm font-medium flex-1">{item.question}</CardTitle>
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
                  </CardHeader>
                </button>
                {isOpen && <CardContent className="pt-0 border-t border-border"><div className="pt-3 text-sm text-muted-foreground leading-relaxed">{item.answer}</div></CardContent>}
              </Card>
            );
          })}
        </div>
      )}

      {/* Normal layout when not searching */}
      {!isSearching && (
        <>
          {/* Quick start */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Começando do zero</h3>
              <Link href="/app/agents/new" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
                Criar agente agora <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {QUICK_STEPS.map((step) => (
                <QuickStep key={step.n} {...step} />
              ))}
            </div>
          </div>

          {/* Category tabs + content */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5 border-b border-border pb-px">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors",
                      isActive
                        ? "border-brand-500 text-foreground bg-secondary/30"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/10"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" /> {cat.label}
                  </button>
                );
              })}
            </div>

            {activeCategory !== "faq" && (
              <div className="space-y-3">
                {visibleSections.map((section) => {
                  const Icon = section.icon;
                  const isOpen = open === section.id;
                  return (
                    <Card key={section.id} className="overflow-hidden">
                      <button className="w-full text-left" onClick={() => setOpen(isOpen ? null : section.id)}>
                        <CardHeader className="flex-row items-center gap-4 cursor-pointer hover:bg-secondary/20 transition-colors py-4">
                          <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", section.color)}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base">{section.title}</CardTitle>
                            <CardDescription className="flex items-center gap-3">
                              {section.subtitle}
                              <span className="text-[10px] text-muted-foreground/60 shrink-0">· {section.readTime} de leitura</span>
                            </CardDescription>
                          </div>
                          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
                        </CardHeader>
                      </button>
                      {isOpen && (
                        <CardContent className="pt-0 border-t border-border">
                          <div className="pt-4">{section.content}</div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {activeCategory === "faq" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground pb-1">
                  {FAQ_ITEMS.length} perguntas frequentes · use a busca acima para filtrar
                </p>
                {FAQ_ITEMS.map((item) => {
                  const isOpen = openFaq === item.id;
                  return (
                    <Card key={item.id} className="overflow-hidden">
                      <button className="w-full text-left" onClick={() => setOpenFaq(isOpen ? null : item.id)}>
                        <CardHeader className="flex-row items-center gap-3 cursor-pointer hover:bg-secondary/20 transition-colors py-3.5">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm font-medium">{item.question}</CardTitle>
                          </div>
                          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isOpen && "rotate-180")} />
                        </CardHeader>
                      </button>
                      {isOpen && (
                        <CardContent className="pt-0 border-t border-border">
                          <div className="pt-3 text-sm text-muted-foreground leading-relaxed">{item.answer}</div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Video library */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-brand-400" />
              <h3 className="text-sm font-semibold">Aprenda com vídeos</h3>
              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded ml-1">
                Em breve
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Vídeos curtos e objetivos para cada funcionalidade. Estamos gravando — serão publicados em breve.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {VIDEO_ITEMS.map((v) => (
                <VideoCard key={v.id} title={v.title} description={v.description} duration={v.duration} />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center pt-2 pb-4">
            <Wrench className="h-3.5 w-3.5" />
            Ainda com dúvidas? Acesse o chatbot de suporte no canto inferior direito da tela.
          </div>
        </>
      )}
    </div>
  );
}
