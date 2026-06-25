"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface Props {
  tags: string[];
  setTags: (v: string[]) => void;
  newTag: string;
  setNewTag: (v: string) => void;
  variables: { key: string; value: string }[];
  setVariables: (v: { key: string; value: string }[]) => void;
  newVarKey: string;
  setNewVarKey: (v: string) => void;
  newVarValue: string;
  setNewVarValue: (v: string) => void;
}

export function TagsTab({
  tags, setTags, newTag, setNewTag,
  variables, setVariables, newVarKey, setNewVarKey, newVarValue, setNewVarValue,
}: Props) {
  const addTag = () => {
    if (!newTag.trim() || tags.includes(newTag.trim())) return;
    setTags([...tags, newTag.trim()]);
    setNewTag("");
  };

  const addVariable = () => {
    if (!newVarKey.trim() || !newVarValue.trim()) return;
    const exists = variables.some((v) => v.key === newVarKey.trim());
    if (exists) {
      setVariables(variables.map((v) => v.key === newVarKey.trim() ? { ...v, value: newVarValue.trim() } : v));
    } else {
      setVariables([...variables, { key: newVarKey.trim(), value: newVarValue.trim() }]);
    }
    setNewVarKey("");
    setNewVarValue("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tags e Variáveis</CardTitle>
        <CardDescription>Defina parâmetros e marcadores dinâmicos que serão enviados no payload JSON do WhatsApp à sua automação externa.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-1 text-foreground">Tags do Agente</h3>
            <p className="text-xs text-muted-foreground">As tags servem para categorizar o fluxo de atendimento, segmentar clientes no CRM ou ativar regras condicionais de envio.</p>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: lead_quente"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
              className="max-w-md font-mono text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
            />
            <Button variant="secondary" onClick={addTag}>Adicionar Tag</Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {tags.map((tag, idx) => (
              <Badge key={idx} variant="secondary" className="flex items-center gap-1.5 px-3 py-1 bg-brand-500/10 text-brand-500 border border-brand-500/20 font-mono text-xs rounded-full">
                {tag}
                <button type="button" className="hover:text-brand-300 font-bold ml-1 text-xs" onClick={() => setTags(tags.filter((_, i) => i !== idx))}>×</button>
              </Badge>
            ))}
            {tags.length === 0 && <div className="text-xs text-muted-foreground italic py-2">Nenhuma tag cadastrada para este agente.</div>}
          </div>
        </div>

        <hr className="border-border" />

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-1 text-foreground">Variáveis de Integração do Agente</h3>
            <p className="text-xs text-muted-foreground">Adicione pares de chave/valor que contêm informações personalizadas desta automação (links de agendamento, contatos extras, ids de pixel, etc).</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
            <div className="space-y-1">
              <Label htmlFor="var-key" className="text-xs text-muted-foreground">Chave (Key)</Label>
              <Input id="var-key" placeholder="Ex: link_calendly" value={newVarKey} onChange={(e) => setNewVarKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} className="font-mono text-xs" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="var-val" className="text-xs text-muted-foreground">Valor (Value)</Label>
              <div className="flex gap-2">
                <Input
                  id="var-val"
                  placeholder="Ex: https://calendly.com/sua-agenda"
                  value={newVarValue}
                  onChange={(e) => setNewVarValue(e.target.value)}
                  className="text-xs"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addVariable(); } }}
                />
                <Button type="button" variant="secondary" onClick={addVariable}>Definir</Button>
              </div>
            </div>
          </div>
          <div className="space-y-2 mt-4 font-mono">
            {variables.map((v, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border border-border bg-secondary/20 rounded-lg text-xs max-w-2xl font-mono">
                <div className="flex items-center gap-3 truncate mr-4">
                  <span className="text-brand-400 font-semibold">{v.key}:</span>
                  <span className="text-muted-foreground truncate max-w-md">{v.value}</span>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-7 text-destructive hover:text-destructive/80 font-semibold" onClick={() => setVariables(variables.filter((_, i) => i !== idx))}>
                  Remover
                </Button>
              </div>
            ))}
            {variables.length === 0 && <div className="text-xs text-muted-foreground italic py-2">Nenhuma variável de contexto configurada neste agente.</div>}
          </div>
        </div>

        <div className="p-4 bg-muted/60 border rounded-lg text-xs leading-relaxed text-muted-foreground">
          <div className="font-semibold text-foreground mb-1">Como esses dados são enviados:</div>
          Estes valores são exportados no formato JSON sob o campo <code className="bg-secondary px-1 py-0.5 rounded text-brand-400 font-mono">config.tags</code> e <code className="bg-secondary px-1 py-0.5 rounded text-brand-400 font-mono">config.variables</code> junto com os demais dados do agente.
        </div>
      </CardContent>
    </Card>
  );
}
