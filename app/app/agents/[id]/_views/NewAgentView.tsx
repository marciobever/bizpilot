"use client";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

interface Props {
  agentName: string;
  setAgentName: (v: string) => void;
  niche: string;
  setNiche: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  saving: boolean;
  onCreateAndContinue: () => void;
}

export function NewAgentView({ agentName, setAgentName, niche, setNiche, role, setRole, saving, onCreateAndContinue }: Props) {
  const navigate = useRouter();
  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 py-4">
        <Button variant="ghost" size="icon" onClick={() => navigate.push("/app/agents")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Criação de Agente (Passo 1 de 2)</h2>
          <p className="text-muted-foreground text-sm">Defina a identidade básica do seu novo robô.</p>
        </div>
      </div>

      <Card className="border border-border bg-card shadow-lg">
        <CardHeader>
          <CardTitle>Identidade do Agente</CardTitle>
          <CardDescription>Como a Inteligência Artificial vai se apresentar e se comportar inicialmente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="wiz-name">Nome do Agente</Label>
            <Input id="wiz-name" placeholder="Ex: Lucas, Sofia, Amanda..." value={agentName} onChange={(e) => setAgentName(e.target.value)} />
            <p className="text-xs text-muted-foreground">O nome que os clientes verão nas conversas.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wiz-niche">Nicho de Atuação / Segmento</Label>
            <Input id="wiz-niche" placeholder="Ex: Imobiliária, Clínica Odontológica, SaaS..." value={niche} onChange={(e) => setNiche(e.target.value)} />
            <p className="text-xs text-muted-foreground">O nicho de atuação ajuda a IA a compreender o contexto do seu negócio.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="wiz-role">Cargo ou Função (Opcional)</Label>
            <Input id="wiz-role" placeholder="Ex: Especialista em Vendas, Suporte ao Cliente..." value={role} onChange={(e) => setRole(e.target.value)} />
          </div>
          <div className="pt-4 border-t border-border flex justify-end">
            <Button className="gap-2 bg-brand-600 hover:bg-brand-700 text-white" onClick={onCreateAndContinue} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Criar Agente e Configurar WhatsApp ➔
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
