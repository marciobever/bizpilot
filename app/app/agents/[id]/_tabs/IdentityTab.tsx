"use client";
import { Bot } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

interface Props {
  agentName: string;
  setAgentName: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  niche: string;
  setNiche: (v: string) => void;
}

export function IdentityTab({ agentName, setAgentName, role, setRole, niche, setNiche }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Identidade do Agente</CardTitle>
        <CardDescription>Como o agente vai se apresentar para os seus clientes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Agente</Label>
            <Input id="name" placeholder="Ex: Lucas" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Cargo ou Função</Label>
            <Input id="role" placeholder="Ex: Especialista em Vendas" value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="niche">Nicho de Atuação</Label>
          <Input id="niche" placeholder="Ex: Imobiliária, Clínica Odontológica, SaaS" value={niche} onChange={(e) => setNiche(e.target.value)} />
          <p className="text-xs text-muted-foreground">O agente usará conhecimento específico deste nicho ao falar.</p>
        </div>
        <div className="space-y-2 pb-4">
          <Label>Foto de Perfil (Opcional para canal Web)</Label>
          <div className="flex items-center gap-4 mt-2">
            <div className="h-16 w-16 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground">
              <Bot className="h-8 w-8" />
            </div>
            <Button variant="outline" size="sm">Fazer Upload</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
