"use client";
import { useState, useEffect } from "react";
import { Users, RefreshCw, Search, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface Group { id: string; name: string; participants: number; }

interface Props {
  agentId: string;
  affiliateGroups: { id: string; name: string }[];
  setAffiliateGroups: (groups: { id: string; name: string }[]) => void;
}

export function AfiliadosTab({ agentId, affiliateGroups, setAffiliateGroups }: Props) {
  const [available, setAvailable] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchGroups = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/evolution/groups?agentId=${agentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao buscar grupos");
      setAvailable(data.groups || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, [agentId]);

  const isSelected = (id: string) => affiliateGroups.some((g) => g.id === id);

  const toggle = (group: Group) => {
    if (isSelected(group.id)) {
      setAffiliateGroups(affiliateGroups.filter((g) => g.id !== group.id));
    } else {
      if (affiliateGroups.length >= 3) return;
      setAffiliateGroups([...affiliateGroups, { id: group.id, name: group.name }]);
    }
  };

  const filtered = available.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-500" />
            Grupos de Oferta WhatsApp
          </CardTitle>
          <CardDescription>
            Selecione até 3 grupos onde o bot poderá publicar ofertas de afiliados. O botão "📢 Publicar em Grupos" aparece em cada produto encontrado na busca.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Selecionados */}
          {affiliateGroups.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Grupos selecionados ({affiliateGroups.length}/3)</p>
              <div className="flex flex-wrap gap-2">
                {affiliateGroups.map((g) => (
                  <Badge key={g.id} variant="secondary" className="gap-1.5 pr-1.5 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => setAffiliateGroups(affiliateGroups.filter((x) => x.id !== g.id))}>
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {g.name}
                    <span className="ml-1 text-muted-foreground">×</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Aviso limite */}
          {affiliateGroups.length >= 3 && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Limite de 3 grupos atingido. Remova um para adicionar outro.
            </div>
          )}

          {/* Busca + refresh */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filtrar grupos..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="icon" onClick={fetchGroups} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Lista de grupos disponíveis */}
          {error ? (
            <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</div>
          ) : loading ? (
            <div className="text-sm text-muted-foreground text-center py-8">Buscando grupos...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              {available.length === 0
                ? "Nenhum grupo encontrado. O WhatsApp precisa estar conectado e o número deve estar em algum grupo."
                : "Nenhum grupo corresponde à busca."}
            </div>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
              {filtered.map((g) => {
                const sel = isSelected(g.id);
                const disabled = !sel && affiliateGroups.length >= 3;
                return (
                  <button
                    key={g.id}
                    onClick={() => !disabled && toggle(g)}
                    disabled={disabled}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left
                      ${sel ? "bg-brand-500/10 text-brand-600 dark:text-brand-400" : "hover:bg-secondary"}
                      ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {sel
                      ? <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-500" />
                      : <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="flex-1 truncate font-medium">{g.name}</span>
                    {g.participants > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">{g.participants} membros</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            O bot só publica nos grupos quando o usuário tocar em "📢 Publicar em Grupos" após uma busca de produto.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
