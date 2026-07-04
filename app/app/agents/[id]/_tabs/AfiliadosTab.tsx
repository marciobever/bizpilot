"use client";
import { useState, useEffect } from "react";
import { authFetch } from "@/lib/api-client";
import { Users, RefreshCw, Search, CheckCircle2, Circle, AlertCircle, ShoppingBag, ArrowRight, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

interface Group { id: string; name: string; participants: number; }

interface Props {
  agentId: string;
  affiliateGroups: { id: string; name: string }[];
  setAffiliateGroups: (groups: { id: string; name: string }[]) => void;
}

export function AfiliadosTab({ agentId, affiliateGroups, setAffiliateGroups }: Props) {
  const { user } = useAuth();
  const [available, setAvailable] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [shopeeConnected, setShopeeConnected] = useState<boolean | null>(null);
  const [mlConnected, setMlConnected] = useState<boolean | null>(null);

  useEffect(() => {
    if (user) { checkShopeeConnection(); checkMLConnection(); }
  }, [user]);

  useEffect(() => { fetchGroups(); }, [agentId]);

  const checkMLConnection = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("integrations")
      .select("status")
      .eq("user_id", user.id)
      .eq("provider", "mercadolivre")
      .maybeSingle();
    setMlConnected(data?.status === "connected");
  };

  const checkShopeeConnection = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("integrations")
      .select("status")
      .eq("user_id", user.id)
      .eq("provider", "affiliate")
      .maybeSingle();
    setShopeeConnected(data?.status === "connected");
  };

  const fetchGroups = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`/api/evolution/groups?agentId=${agentId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao buscar grupos");
      setAvailable(data.groups || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

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
      {/* Status da integração Shopee */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-orange-500" />
            Conta de Afiliados
          </CardTitle>
          <CardDescription>
            Credenciais Shopee usadas para buscar produtos e gerar links com sua comissão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {shopeeConnected === null ? (
            <div className="text-sm text-muted-foreground">Verificando conexão...</div>
          ) : shopeeConnected ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-emerald-500">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Shopee Afiliados conectado
              </div>
              <Link href="/app/automations">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  Gerenciar <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-amber-500">
                <XCircle className="h-4 w-4 shrink-0" />
                Shopee não conectado
              </div>
              <Link href="/app/automations">
                <Button size="sm" className="gap-1.5 text-xs bg-brand-500 hover:bg-brand-600 text-white">
                  Conectar agora <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mercado Livre */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-yellow-500" />
            Mercado Livre Afiliados
          </CardTitle>
          <CardDescription>
            Tag de afiliado para gerar links rastreados. Configure em Integrações → Afiliados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mlConnected === null ? (
            <div className="text-sm text-muted-foreground">Verificando conexão...</div>
          ) : mlConnected ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-emerald-500">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Mercado Livre Afiliados conectado
              </div>
              <Link href="/app/automations">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  Gerenciar <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-amber-500">
                <XCircle className="h-4 w-4 shrink-0" />
                Mercado Livre não conectado
              </div>
              <Link href="/app/automations">
                <Button size="sm" className="gap-1.5 text-xs bg-brand-500 hover:bg-brand-600 text-white">
                  Conectar agora <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grupos de publicação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-500" />
            Grupos de Publicação
          </CardTitle>
          <CardDescription>
            Selecione até 3 grupos onde o bot poderá publicar ofertas. O botão "📢 Publicar em Grupos" aparece em cada produto encontrado.
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

          {affiliateGroups.length >= 3 && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 rounded-md">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Limite de 3 grupos atingido. Remova um para adicionar outro.
            </div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filtrar grupos..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button variant="outline" size="icon" onClick={fetchGroups} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>

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
            O bot só publica quando o usuário tocar em "📢 Publicar em Grupos" após uma busca de produto.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
