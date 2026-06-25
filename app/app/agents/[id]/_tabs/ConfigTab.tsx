"use client";
import { Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface Props {
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  ignoreGroups: boolean;
  setIgnoreGroups: (v: boolean) => void;
  handoffContacts: { name: string; phone: string }[];
  setHandoffContacts: (v: { name: string; phone: string }[]) => void;
  blocklist: string[];
  setBlocklist: (v: string[]) => void;
  newBlock: string;
  setNewBlock: (v: string) => void;
}

export function ConfigTab({
  selectedModel, setSelectedModel,
  ignoreGroups, setIgnoreGroups,
  handoffContacts, setHandoffContacts,
  blocklist, setBlocklist,
  newBlock, setNewBlock,
}: Props) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Motor de Inteligência</CardTitle>
          <CardDescription>Escolha qual modelo de IA vai processar as respostas deste agente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: "gemini-2.5-flash", label: "Google Gemini", desc: "Extremamente rápido, ideal para grande volume. Padrão." },
              { id: "gpt-5.4-mini", label: "OpenAI", desc: "Avançado, balanceado em custo e inteligência geral." },
            ].map((m) => (
              <div
                key={m.id}
                className={`p-3 rounded-lg border cursor-pointer relative transition-colors ${
                  selectedModel === m.id
                    ? "border-brand-500 bg-brand-500/10"
                    : "border-border bg-card hover:border-muted-foreground/50"
                }`}
                onClick={() => setSelectedModel(m.id)}
              >
                {selectedModel === m.id && (
                  <div className="absolute top-3 right-3 flex items-center h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
                  </div>
                )}
                <div className={`font-medium text-sm ${selectedModel === m.id ? "text-brand-200" : "text-foreground"}`}>{m.label}</div>
                <div className={`text-[11px] mt-1 ${selectedModel === m.id ? "text-brand-400/80" : "text-muted-foreground"}`}>{m.desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regras de Atendimento</CardTitle>
          <CardDescription>Controle quando e para quem o agente responde.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Ignorar Grupos do WhatsApp</Label>
              <p className="text-xs text-muted-foreground mt-1">Se ativado, o bot não responderá a mensagens advindas de grupos.</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={ignoreGroups} onChange={(e) => setIgnoreGroups(e.target.checked)} />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500" />
            </label>
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <div>
              <Label>Contatos para Transferência (Atendimento Humano)</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Cadastre as pessoas da equipe (nome + WhatsApp). Quando o cliente pedir para falar com alguém, a IA encaminha para o contato correspondente <strong>pelo nome</strong> e o avisa por WhatsApp com o contexto. O <strong>primeiro da lista</strong> é usado quando o cliente não especifica.
              </p>
            </div>
            <div className="space-y-2">
              {handoffContacts.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Nome (ex: Corretor Centro)"
                    value={c.name}
                    onChange={(e) => setHandoffContacts(handoffContacts.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                    className="flex-1 min-w-0"
                  />
                  <Input
                    placeholder="WhatsApp (ex: 5541999999999)"
                    value={c.phone}
                    onChange={(e) => setHandoffContacts(handoffContacts.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))}
                    className="flex-1 min-w-0"
                  />
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="shrink-0 text-destructive hover:bg-destructive/10"
                    onClick={() => setHandoffContacts(handoffContacts.filter((_, j) => j !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {handoffContacts.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Nenhum contato cadastrado.</p>
              )}
            </div>
            <Button
              type="button" variant="outline" size="sm" className="gap-2"
              onClick={() => setHandoffContacts([...handoffContacts, { name: "", phone: "" }])}
            >
              <Plus className="h-4 w-4" /> Adicionar contato
            </Button>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div>
              <Label>Números Bloqueados (Exceções)</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-2">O bot ignorará atividades e conversas contendo estes números (apenas números, como 5511999999999).</p>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: 5511999999999"
                value={newBlock}
                onChange={(e) => setNewBlock(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newBlock.trim()) { setBlocklist([...blocklist, newBlock.trim()]); setNewBlock(""); }
                  }
                }}
              />
              <Button
                variant="secondary"
                onClick={() => { if (newBlock.trim()) { setBlocklist([...blocklist, newBlock.trim()]); setNewBlock(""); } }}
              >
                Bloquear
              </Button>
            </div>
            {blocklist.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {blocklist.map((num, idx) => (
                  <Badge key={idx} variant="secondary" className="pl-3 pr-2 py-1.5 flex items-center gap-2">
                    {num}
                    <button onClick={() => setBlocklist(blocklist.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-foreground">×</button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
