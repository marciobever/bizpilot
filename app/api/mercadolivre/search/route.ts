import { NextRequest, NextResponse } from "next/server";
import { requireInternalSecret } from "@/lib/api-auth";

const SERPER_SHOPPING_URL = "https://google.serper.dev/shopping";
const SERPER_SEARCH_URL = "https://google.serper.dev/search";

function extractPrice(text: string): string | null {
  const m = text?.match(/R\$\s*[\d.,]+/);
  return m ? m[0].trim() : null;
}

function buildAffiliateUrl(url: string, tag: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("tag", tag);
    return u.toString();
  } catch {
    return url + (url.includes("?") ? "&" : "?") + `tag=${encodeURIComponent(tag)}`;
  }
}

function isMercadoLivreProductUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    // Aceita www, lista, produto — rejeita login, loja, vendedores, ajuda, blog
    if (/^(loja|vendedores|ajuda|publicidade|blog|envios)\./.test(host)) return false;
    if (!host.endsWith("mercadolivre.com.br")) return false;
    // Rejeita paths de suporte/conta/login
    if (/^\/(ajuda|minha-conta|politicas|institucional|seguranca|login|faq|cupons)/i.test(u.pathname)) return false;
    return true;
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  const auth = requireInternalSecret(req);
  if (!auth.ok) return auth.response;

  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) {
    return NextResponse.json({ error: "SERPER_API_KEY não configurada." }, { status: 500 });
  }

  const { q, tag } = await req.json();
  if (!q?.trim()) {
    return NextResponse.json({ error: "Parâmetro 'q' obrigatório." }, { status: 400 });
  }

  const headers = { "Content-Type": "application/json", "X-API-KEY": serperKey };
  const base = { gl: "br", hl: "pt-br" };

  // ── 1. Tenta Google Shopping (preço + imagem + relevância garantida) ────────
  try {
    const shopRes = await fetch(SERPER_SHOPPING_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ ...base, q: `${q.trim()} mercadolivre`, num: 10 }),
    });

    if (shopRes.ok) {
      const shopData = await shopRes.json();
      const items: any[] = shopData.shopping || [];

      const products = items
        .filter((r) => {
          const link = r.link || r.productLink || "";
          return link && isMercadoLivreProductUrl(link);
        })
        .slice(0, 5)
        .map((r) => {
          const link = r.link || r.productLink || "";
          return {
            title: r.title?.trim() || "",
            url: tag ? buildAffiliateUrl(link, tag) : link,
            snippet: r.rating ? `⭐ ${r.rating} (${r.ratingCount ?? 0} avaliações)` : "",
            price: r.price || null,
            imageUrl: r.imageUrl || null,
          };
        });

      if (products.length >= 2) {
        return NextResponse.json({ products });
      }
    }
  } catch (_) {}

  // ── 2. Fallback: busca orgânica com site: ──────────────────────────────────
  const searchRes = await fetch(SERPER_SEARCH_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...base, q: `${q.trim()} site:mercadolivre.com.br`, num: 10 }),
  });

  if (!searchRes.ok) {
    const text = await searchRes.text();
    return NextResponse.json({ error: `Serper error ${searchRes.status}: ${text.slice(0, 200)}` }, { status: 502 });
  }

  const searchData = await searchRes.json();
  const organic: any[] = searchData.organic || [];

  const products = organic
    .filter((r) => r.link && isMercadoLivreProductUrl(r.link))
    .slice(0, 5)
    .map((r) => {
      const price = extractPrice(r.snippet || "");
      return {
        title: r.title?.replace(/\s*-\s*Mercado Livre$/, "").trim() || "",
        url: tag ? buildAffiliateUrl(r.link, tag) : r.link,
        snippet: r.snippet || "",
        price,
        imageUrl: r.imageUrl || null,
      };
    });

  return NextResponse.json({ products });
}
