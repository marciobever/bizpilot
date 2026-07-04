import { NextRequest, NextResponse } from "next/server";
import { requireInternalSecret } from "@/lib/api-auth";

const SERPER_SHOPPING_URL = "https://google.serper.dev/shopping";
const SERPER_SEARCH_URL = "https://google.serper.dev/search";

function extractPrice(text: string): string | null {
  const m = text?.match(/R\$\s*[\d.,]+/);
  return m ? m[0].trim() : null;
}

// Deeplink de afiliado via Awin (rede oficial do Mercado Livre no Brasil).
// Formato: awin1.com/cread.php?awinmid=<anunciante ML>&awinaffid=<publisher>&ued=<url produto>
// Este link ATRIBUI comissão (diferente de appendar ?tag=, que não credita).
// `clickref` é um sub-id opcional para rastrear a origem (ex: id do agente).
function buildAwinDeeplink(productUrl: string, awinMid: string, awinAffid: string, clickref?: string): string {
  const params = new URLSearchParams({ awinmid: awinMid, awinaffid: awinAffid, ued: productUrl });
  if (clickref) params.set("clickref", clickref);
  return `https://www.awin1.com/cread.php?${params.toString()}`;
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

  // Afiliado ML roda pela rede Awin. Enquanto a conta Awin não estiver
  // configurada (AWIN_ADVERTISER_ID_ML + AWIN_PUBLISHER_ID), o recurso fica
  // "em breve": não buscamos nem geramos links que não creditam comissão.
  const awinMid = process.env.AWIN_ADVERTISER_ID_ML;
  const awinAffid = process.env.AWIN_PUBLISHER_ID;
  if (!awinMid || !awinAffid) {
    return NextResponse.json({ comingSoon: true, products: [] });
  }

  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) {
    return NextResponse.json({ error: "SERPER_API_KEY não configurada." }, { status: 500 });
  }

  // `tag` (legado) vira o clickref/sub-id do deeplink Awin.
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
            url: buildAwinDeeplink(link, awinMid, awinAffid, tag),
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
        url: buildAwinDeeplink(r.link, awinMid, awinAffid, tag),
        snippet: r.snippet || "",
        price,
        imageUrl: r.imageUrl || null,
      };
    });

  return NextResponse.json({ products });
}
