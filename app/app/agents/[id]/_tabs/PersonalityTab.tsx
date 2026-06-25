"use client";
import { Wand2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

interface Props {
  tone: string;
  setTone: (v: string) => void;
  greeting: string;
  setGreeting: (v: string) => void;
  typingSpeed: string;
  setTypingSpeed: (v: string) => void;
  showGreetingAI: boolean;
  setShowGreetingAI: (v: boolean) => void;
  greetingAIDescription: string;
  setGreetingAIDescription: (v: string) => void;
  greetingAILoading: boolean;
  onGenerateGreeting: () => void;
}

export function PersonalityTab({
  tone, setTone, greeting, setGreeting, typingSpeed, setTypingSpeed,
  showGreetingAI, setShowGreetingAI, greetingAIDescription, setGreetingAIDescription,
  greetingAILoading, onGenerateGreeting,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personalidade</CardTitle>
        <CardDescription>Defina o tom de voz, a saudação e o ritmo de resposta do agente.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Tom de Voz Principal</Label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
            {["Profissional e Direto", "Amigável e Empático", "Descontraído (Usa Emojis)", "Técnico e Especialista"].map((t) => (
              <div
                key={t}
                onClick={() => setTone(t)}
                className={`p-3 rounded-lg border text-sm cursor-pointer transition-colors ${
                  tone === t
                    ? "border-brand-500 bg-brand-500/10 text-brand-200"
                    : "border-border bg-card hover:border-muted-foreground/50 text-muted-foreground"
                }`}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="greeting">Mensagem de Saudação (Opcional)</Label>
            <Button variant="ghost" size="sm" className="text-xs h-7 text-brand-400 hover:text-brand-300" onClick={() => setShowGreetingAI(!showGreetingAI)}>
              <Wand2 className="mr-1.5 h-3.5 w-3.5" />Gerar com IA
            </Button>
          </div>
          {showGreetingAI && (
            <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-lg bg-secondary/30 border border-border">
              <Input
                placeholder="Descreva como você quer que o bot se apresente..."
                value={greetingAIDescription}
                onChange={(e) => setGreetingAIDescription(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onGenerateGreeting(); } }}
                disabled={greetingAILoading}
              />
              <Button size="sm" className="shrink-0" onClick={onGenerateGreeting} disabled={greetingAILoading || !greetingAIDescription.trim()}>
                {greetingAILoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar"}
              </Button>
            </div>
          )}
          <Textarea
            id="greeting"
            placeholder="Ex: Olá! Sou o Lucas, da empresa X. Como posso ajudar você hoje?"
            value={greeting}
            onChange={(e) => setGreeting(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Deixe em branco para permitir que a IA decida a melhor saudação com base no contexto.</p>
        </div>
        <div className="space-y-2">
          <Label>Tempo de Digitação (Humanização)</Label>
          <div className="flex items-center gap-4 border border-border rounded-md p-4 bg-secondary/20">
            <div className="flex-1">
              <input type="range" className="w-full accent-brand-500" min="0" max="100" value={typingSpeed} onChange={(e) => setTypingSpeed(e.target.value)} />
            </div>
            <span className="text-sm font-medium w-16 text-right">Médio</span>
          </div>
          <p className="text-xs text-muted-foreground">Simula o tempo de digitação de um ser humano antes de enviar a resposta.</p>
        </div>
      </CardContent>
    </Card>
  );
}
