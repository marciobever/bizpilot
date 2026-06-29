"use client";
import { Volume2, Webhook, FileText, ChevronRight, Loader2, X, Plus, Puzzle } from "lucide-react";
import { HelpTooltip } from "@/components/ui/HelpTooltip";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { AgentTool, MediaFile } from "../_types";

interface Props {
  userPlan: "starter" | "pro" | "business";
  voiceEnabled: boolean;
  setVoiceEnabled: (v: boolean) => void;
  voiceVoice: string;
  setVoiceVoice: (v: string) => void;
  onPlayVoicePreview: () => void;
  // Tools
  tools: AgentTool[];
  showToolsManager: boolean;
  setShowToolsManager: (v: boolean) => void;
  showToolForm: boolean;
  setShowToolForm: (v: boolean) => void;
  toolForm: Partial<AgentTool>;
  setToolForm: (v: Partial<AgentTool>) => void;
  toolParamKey: string;
  setToolParamKey: (v: string) => void;
  toolParamDesc: string;
  setToolParamDesc: (v: string) => void;
  toolHeaderKey: string;
  setToolHeaderKey: (v: string) => void;
  toolHeaderVal: string;
  setToolHeaderVal: (v: string) => void;
  onAddTool: () => void;
  onDeleteTool: (id: string) => void;
  // Media files
  mediaFiles: MediaFile[];
  showMediaManager: boolean;
  setShowMediaManager: (v: boolean) => void;
  showMediaFileForm: boolean;
  setShowMediaFileForm: (v: boolean) => void;
  mediaFileForm: Partial<MediaFile>;
  setMediaFileForm: (v: Partial<MediaFile>) => void;
  uploadingMediaFile: boolean;
  mediaUploadError: string;
  onAddMediaFile: () => void;
  onDeleteMediaFile: (id: string) => void;
  onUploadMediaFile: (file: File) => void;
}

export function AddonsTab({
  userPlan, voiceEnabled, setVoiceEnabled, voiceVoice, setVoiceVoice, onPlayVoicePreview,
  tools, showToolsManager, setShowToolsManager, showToolForm, setShowToolForm,
  toolForm, setToolForm, toolParamKey, setToolParamKey, toolParamDesc, setToolParamDesc,
  toolHeaderKey, setToolHeaderKey, toolHeaderVal, setToolHeaderVal, onAddTool, onDeleteTool,
  mediaFiles, showMediaManager, setShowMediaManager, showMediaFileForm, setShowMediaFileForm,
  mediaFileForm, setMediaFileForm, uploadingMediaFile, mediaUploadError,
  onAddMediaFile, onDeleteMediaFile, onUploadMediaFile,
}: Props) {
  const navigate = useRouter();

  if (userPlan === "starter") {
    return (
      <Card className="border-brand-500/30 bg-brand-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Puzzle className="h-5 w-5 text-brand-500" />
            Funcionalidades — Disponível no plano Pro
          </CardTitle>
          <CardDescription>
            Resposta em áudio, memória de dados e ações externas fazem parte do plano Pro (R$ 79,90/mês) e do plano Business (R$ 149,00/mês).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li>• Respostas em áudio com voz natural</li>
            <li>• Memória de dados — o bot guarda e consulta informações do cliente</li>
            <li>• Ações externas — o bot conecta com outros sistemas para agendar, buscar dados, etc.</li>
          </ul>
          <Button className="bg-brand-600 hover:bg-brand-700 text-white" onClick={() => navigate.push("/app/settings")}>
            Fazer upgrade de plano
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recursos do Agente</CardTitle>
          <CardDescription>Ative o que este agente pode fazer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className={`rounded-lg border p-3 transition-colors ${voiceEnabled ? "border-brand-500/50 bg-brand-500/5" : "border-border bg-card"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <Volume2 className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      Voz e Áudio
                      <HelpTooltip text="O bot responde com mensagens de áudio além de texto. Ideal para clientes que preferem ouvir a ler." />
                    </p>
                    <p className="text-xs text-muted-foreground">Responde com mensagens de voz.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" className="sr-only peer" checked={voiceEnabled} onChange={(e) => setVoiceEnabled(e.target.checked)} />
                  <div className="w-11 h-6 bg-secondary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500" />
                </label>
              </div>
            </div>

            <button type="button" onClick={() => setShowToolsManager(!showToolsManager)} className={`text-left rounded-lg border p-3 transition-colors ${showToolsManager ? "border-brand-500/50 bg-brand-500/5" : "border-border bg-card hover:border-brand-500/40"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <Webhook className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      Ações Externas
                      <HelpTooltip text="Conecte o bot a outros sistemas: agendar no Google Calendar, consultar estoque, criar pedido no ERP. O bot decide sozinho quando chamar cada ação." />
                    </p>
                    <p className="text-xs text-muted-foreground">{tools.length > 0 ? `${tools.length} ação(ões) configurada(s)` : "Conecte o bot com outros sistemas…"}</p>
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${showToolsManager ? "rotate-90" : ""}`} />
              </div>
            </button>

            <button type="button" onClick={() => setShowMediaManager(!showMediaManager)} className={`text-left rounded-lg border p-3 transition-colors ${showMediaManager ? "border-brand-500/50 bg-brand-500/5" : "border-border bg-card hover:border-brand-500/40"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <FileText className="h-5 w-5 text-brand-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">Arquivos para Envio</p>
                    <p className="text-xs text-muted-foreground">{mediaFiles.length > 0 ? `${mediaFiles.length} arquivo(s)` : "Catálogos, tabelas, contratos…"}</p>
                  </div>
                </div>
                <ChevronRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${showMediaManager ? "rotate-90" : ""}`} />
              </div>
            </button>
          </div>

          {voiceEnabled && (
            <div className="space-y-2 bg-secondary/10 p-4 rounded-md border border-border">
              <Label>Escolha a voz</Label>
              <div className="flex items-center gap-2">
                <select value={voiceVoice} onChange={(e) => setVoiceVoice(e.target.value)} className="flex-1 bg-background border border-border rounded-md h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="alloy">Alloy (Neutra / Masculina)</option>
                  <option value="echo">Echo (Masculina)</option>
                  <option value="fable">Fable (Expressiva / Neutra)</option>
                  <option value="onyx">Onyx (Masculina Profunda)</option>
                  <option value="nova">Nova (Feminina Dinâmica)</option>
                  <option value="shimmer">Shimmer (Feminina Calma)</option>
                </select>
                <Button variant="outline" size="icon" onClick={onPlayVoicePreview} title="Ouvir exemplo">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">A voz lê em PT-BR automaticamente conforme a resposta gerada.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {showToolsManager && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Ações Externas</CardTitle>
                <CardDescription>O bot chama automaticamente essas ações quando precisar — para agendar, buscar dados, enviar e-mails e muito mais.</CardDescription>
              </div>
              <Button size="sm" className="gap-2 shrink-0" onClick={() => setShowToolForm(!showToolForm)}>
                <Plus className="h-4 w-4" /> Nova Ferramenta
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showToolForm && (
              <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/10">
                <h4 className="font-medium text-sm">Nova Ferramenta</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Nome (sem espaços)</label>
                    <Input placeholder="agendar_consulta" value={toolForm.name || ""} onChange={(e) => setToolForm({ ...toolForm, name: e.target.value.replace(/\s+/g, "_").toLowerCase() })} />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Método</label>
                    <select value={toolForm.method || "POST"} onChange={(e) => setToolForm({ ...toolForm, method: e.target.value })} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                      <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Descrição (diz à IA quando usar)</label>
                  <Input placeholder="Agenda uma consulta. Use quando o cliente quiser marcar um horário." value={toolForm.description || ""} onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Endereço do serviço (URL)</label>
                  <Input placeholder="https://meuservidor.com/api/agendar" value={toolForm.url || ""} onChange={(e) => setToolForm({ ...toolForm, url: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Autenticação (opcional)</label>
                  <div className="space-y-1 mb-2">
                    {Object.entries(toolForm.headers || {}).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 text-xs">
                        <span className="font-mono bg-secondary px-2 py-1 rounded">{k}: {v}</span>
                        <button className="text-muted-foreground hover:text-destructive" onClick={() => { const h = { ...toolForm.headers }; delete h[k]; setToolForm({ ...toolForm, headers: h }); }}><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Nome do campo" value={toolHeaderKey} className="h-8 text-xs" onChange={(e) => setToolHeaderKey(e.target.value)} />
                    <Input placeholder="Sua chave de acesso..." value={toolHeaderVal} className="h-8 text-xs" onChange={(e) => setToolHeaderVal(e.target.value)} />
                    <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={() => { if (toolHeaderKey.trim()) { setToolForm({ ...toolForm, headers: { ...toolForm.headers, [toolHeaderKey.trim()]: toolHeaderVal.trim() } }); setToolHeaderKey(""); setToolHeaderVal(""); } }}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Parâmetros que a IA enviará</label>
                  <div className="space-y-1 mb-2">
                    {Object.entries(toolForm.parameters || {}).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2 text-xs">
                        <span className="font-mono bg-secondary px-2 py-1 rounded flex-1 truncate"><strong>{k}</strong>: {v}{(toolForm.required_params || []).includes(k) && <span className="text-red-400 ml-1">*</span>}</span>
                        <button className="text-muted-foreground hover:text-destructive shrink-0" onClick={() => { const params = { ...toolForm.parameters }; delete params[k]; setToolForm({ ...toolForm, parameters: params, required_params: (toolForm.required_params || []).filter((r) => r !== k) }); }}><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="nome_param" value={toolParamKey} className="h-8 text-xs" onChange={(e) => setToolParamKey(e.target.value)} />
                    <Input placeholder="descrição do parâmetro" value={toolParamDesc} className="h-8 text-xs" onChange={(e) => setToolParamDesc(e.target.value)} />
                    <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={() => { if (toolParamKey.trim()) { setToolForm({ ...toolForm, parameters: { ...toolForm.parameters, [toolParamKey.trim()]: toolParamDesc.trim() || toolParamKey.trim() }, required_params: [...(toolForm.required_params || []), toolParamKey.trim()] }); setToolParamKey(""); setToolParamDesc(""); } }}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">* Parâmetros adicionados são obrigatórios por padrão.</p>
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <Button size="sm" variant="outline" onClick={() => { setShowToolForm(false); setToolForm({ method: "POST", headers: {}, parameters: {}, required_params: [] }); }}>Cancelar</Button>
                  <Button size="sm" onClick={onAddTool}>Adicionar Ferramenta</Button>
                </div>
              </div>
            )}
            {tools.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm"><Webhook className="h-8 w-8 mx-auto mb-3 opacity-30" />Nenhuma ação configurada. O bot responderá apenas com texto.</div>
            ) : (
              <div className="space-y-2">
                {tools.map((tool) => (
                  <div key={tool.id} className="flex items-start gap-3 p-3 border border-border bg-card rounded-lg">
                    <Webhook className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold font-mono text-sm">{tool.name}</span>
                        <Badge variant="outline" className="text-[10px] h-4">{tool.method} {tool.url.replace(/^https?:\/\/[^/]+/, "")}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tool.description}</p>
                      {Object.keys(tool.parameters || {}).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">Params: {Object.keys(tool.parameters).join(", ")}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => onDeleteTool(tool.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 p-3 bg-secondary/20 rounded-lg text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Como funciona</p>
              <p>A IA decide quando chamar cada ferramenta com base na conversa. O resultado é incorporado na resposta automaticamente.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {showMediaManager && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Arquivos para Envio</CardTitle>
                <CardDescription>Cadastre arquivos (catálogos, tabelas de preço, contratos, cardápios, etc.) hospedados em uma URL pública. A IA envia o arquivo certo pelo WhatsApp quando o cliente pedir.</CardDescription>
              </div>
              <Button size="sm" className="gap-2 shrink-0" onClick={() => setShowMediaFileForm(!showMediaFileForm)}>
                <Plus className="h-4 w-4" /> Novo Arquivo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {showMediaFileForm && (
              <div className="border border-border rounded-lg p-4 space-y-3 bg-secondary/10">
                <h4 className="font-medium text-sm">Novo Arquivo</h4>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nome do arquivo</label>
                  <Input placeholder="Catálogo de Produtos" value={mediaFileForm.name || ""} onChange={(e) => setMediaFileForm({ ...mediaFileForm, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Descrição (ajuda a IA a saber quando enviar)</label>
                  <Input placeholder="Tabela com preços e fotos dos produtos" value={mediaFileForm.description || ""} onChange={(e) => setMediaFileForm({ ...mediaFileForm, description: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Arquivo</label>
                  <div className="flex items-center gap-2">
                    <Input type="file" className="text-xs" disabled={uploadingMediaFile} onChange={(e) => { const file = e.target.files?.[0]; if (file) onUploadMediaFile(file); }} />
                    {uploadingMediaFile && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                  </div>
                  {mediaUploadError && <p className="text-xs text-destructive mt-1">{mediaUploadError}</p>}
                  {mediaFileForm.url && !uploadingMediaFile && (
                    <p className="text-xs text-emerald-500 mt-1 truncate">Arquivo enviado: {mediaFileForm.url}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">Ou, se preferir, cole o link direto de um arquivo já hospedado:</p>
                  <Input className="mt-1" placeholder="https://meusite.com/catalogo.pdf" value={mediaFileForm.url || ""} onChange={(e) => setMediaFileForm({ ...mediaFileForm, url: e.target.value })} />
                </div>
                <div className="flex gap-2 justify-end pt-1">
                  <Button size="sm" variant="outline" onClick={() => { setShowMediaFileForm(false); setMediaFileForm({}); }}>Cancelar</Button>
                  <Button size="sm" onClick={onAddMediaFile}>Adicionar Arquivo</Button>
                </div>
              </div>
            )}
            {mediaFiles.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm"><FileText className="h-8 w-8 mx-auto mb-3 opacity-30" />Nenhum arquivo configurado.</div>
            ) : (
              <div className="space-y-2">
                {mediaFiles.map((file) => (
                  <div key={file.id} className="flex items-start gap-3 p-3 border border-border bg-card rounded-lg">
                    <FileText className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm">{file.name}</span>
                      {file.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{file.description}</p>}
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{file.url}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => onDeleteMediaFile(file.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
