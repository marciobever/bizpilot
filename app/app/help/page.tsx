"use client";
import React, { useState } from "react";
import { HelpCircle, ChevronDown, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { SECTIONS, FAQ_ITEMS, CATEGORIES } from "./_data/helpData";

export default function HelpPage() {
  const [activeCategory, setActiveCategory] = useState("inicio");
  const [open, setOpen] = useState<string | null>("overview");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  const category = CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0];
  const visibleSections = SECTIONS.filter((s) => category.sectionIds.includes(s.id));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-brand-500" /> Central de Ajuda
        </h2>
        <p className="text-muted-foreground">Guia completo para configurar seus agentes, conectar o WhatsApp e ativar a inteligência do bot.</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-px">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors",
              isActive ? "border-brand-500 text-foreground bg-secondary/40" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/20"
            )}>
              <Icon className="h-4 w-4" /> {cat.label}
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
                      <CardDescription>{section.subtitle}</CardDescription>
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
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Respostas rápidas para as perguntas mais comuns sobre o BizPilot.</p>
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

      <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center pt-2">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        Ainda com dúvidas? Revise a configuração do agente passo a passo seguindo a ordem desta página, ou confira o FAQ.
      </div>
    </div>
  );
}
