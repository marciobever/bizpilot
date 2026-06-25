"use client";
import { Brain, Globe, FileText, Plus, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import type { KnowledgeEntry } from "../_types";

interface Props {
  isNew: boolean;
  knowledgeEntries: KnowledgeEntry[];
  loadingKnowledge: boolean;
  addingKnowledge: boolean;
  showKnowledgeForm: boolean;
  setShowKnowledgeForm: (v: boolean) => void;
  knowledgeForm: { title: string; content: string; sourceType: string; sourceUrl: string };
  setKnowledgeForm: (v: any) => void;
  sitemapForm: { sitemapUrl: string; urlFilter: string; maxItems: string };
  setSitemapForm: (v: any) => void;
  importingSitemap: boolean;
  sitemapResult: { imported: number; total: number; errors: { url: string; error: string }[] } | null;
  onAddKnowledge: () => void;
  onImportSitemap: () => void;
  onDeleteKnowledge: (id: string) => void;
}

export function KnowledgeTab({
  isNew, knowledgeEntries, loadingKnowledge, addingKnowledge,
  showKnowledgeForm, setShowKnowledgeForm, knowledgeForm, setKnowledgeForm,
  sitemapForm, setSitemapForm, importingSitemap, sitemapResult,
  onAddKnowledge, onImportSitemap, onDeleteKnowledge,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Base de Conhecimento (RAG)</CardTitle>
            <CardDescription>Adicione textos ou URLs. A IA busca automaticamente quando precisar responder sobre o seu negócio.</CardDescription>
          </div>
          {!isNew && (
            <Button size="sm" className="gap-2 shrink-0" onClick={() => setShowKnowledgeForm(!showKnowledgeForm)}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isNew && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-700 dark:text-amber-400">
            Salve o agente primeiro para adicionar conhecimento.
          </div>
        )}

        {showKnowledgeForm && (
          <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/10">
            <div className="flex gap-2">
              {["text", "url", "sitemap"].map((type) => (
                <Button key={type} size="sm" variant={knowledgeForm.sourceType === type ? "default" : "outline"} onClick={() => setKnowledgeForm({ ...knowledgeForm, sourceType: type })}>
                  {type === "text" ? <><FileText className="h-3 w-3 mr-1" />Texto</> : type === "url" ? <><Globe className="h-3 w-3 mr-1" />URL</> : <><Globe className="h-3 w-3 mr-1" />Catálogo (Sitemap)</>}
                </Button>
              ))}
            </div>

            {knowledgeForm.sourceType === "sitemap" ? (
              <>
                <p className="text-xs text-muted-foreground">Importa várias páginas de uma vez a partir de um sitemap.xml — cada página vira uma entrada separada na base.</p>
                <Input placeholder="https://meusite.com/sitemap.xml" value={sitemapForm.sitemapUrl} onChange={(e) => setSitemapForm({ ...sitemapForm, sitemapUrl: e.target.value })} />
                <Input placeholder="Filtro de URL (opcional, ex: /imovel/)" value={sitemapForm.urlFilter} onChange={(e) => setSitemapForm({ ...sitemapForm, urlFilter: e.target.value })} />
                <div className="flex items-center gap-2">
                  <Label htmlFor="sitemap-max" className="text-xs whitespace-nowrap">Máx. de páginas</Label>
                  <Input id="sitemap-max" type="number" min={1} max={50} className="w-24" value={sitemapForm.maxItems} onChange={(e) => setSitemapForm({ ...sitemapForm, maxItems: e.target.value })} />
                </div>
                {sitemapResult && (
                  <div className="text-xs p-2 rounded bg-secondary/40">
                    Importadas {sitemapResult.imported} de {sitemapResult.total} páginas.
                    {sitemapResult.errors.length > 0 && <span className="text-destructive"> {sitemapResult.errors.length} com erro.</span>}
                  </div>
                )}
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setShowKnowledgeForm(false)}>Cancelar</Button>
                  <Button size="sm" onClick={onImportSitemap} disabled={importingSitemap}>
                    {importingSitemap ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    {importingSitemap ? "Importando..." : "Importar Catálogo"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Input placeholder="Título (ex: Tabela de Preços, FAQ, Sobre a Empresa)" value={knowledgeForm.title} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, title: e.target.value })} />
                {knowledgeForm.sourceType === "text" ? (
                  <Textarea placeholder="Cole aqui o texto: descrição dos serviços, preços, políticas, FAQ..." rows={6} value={knowledgeForm.content} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, content: e.target.value })} />
                ) : (
                  <Input placeholder="https://meusite.com/sobre" value={knowledgeForm.sourceUrl} onChange={(e) => setKnowledgeForm({ ...knowledgeForm, sourceUrl: e.target.value })} />
                )}
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setShowKnowledgeForm(false)}>Cancelar</Button>
                  <Button size="sm" onClick={onAddKnowledge} disabled={addingKnowledge}>
                    {addingKnowledge ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    {addingKnowledge ? "Processando..." : "Salvar e Vetorizar"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {loadingKnowledge ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : knowledgeEntries.length === 0 && !isNew ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            <Brain className="h-8 w-8 mx-auto mb-3 opacity-30" />
            Nenhum conhecimento adicionado. A IA responderá com base no sistema de instruções.
          </div>
        ) : (
          <div className="space-y-2">
            {knowledgeEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  {entry.source_type === "url" ? <Globe className="h-4 w-4 text-brand-500 shrink-0" /> : <FileText className="h-4 w-4 text-emerald-500 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">{entry.chunk_count} chunks · {new Date(entry.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => onDeleteKnowledge(entry.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
