import { NextRequest, NextResponse } from "next/server";

const SERPER_URL = "https://google.serper.dev/search";

function extractPrice(snippet: string): string | null {
  const m = snippet.match(/R\$\s*[\d.,]+/);
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

// Retorna true se a URL é uma página de produto individual (tem MLB no path)
function isIndividualProduct(url: string): boolean {
  return /\/p\/MLB|MLB\d{5,}|[/-]MLB\d/i.test(url);
}

// Retorna true se a URL é do ML mas exclui portais de suporte/vendedor
function isMercadoLivreUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    // Bloqueia subdomínios de suporte e vendedor
    if (/^(vendedores|ajuda|envios|publicidade|blog)\./.test(host)) return false;
    // Só aceita mercadolivre.com.br
    if (!host.endsWith("mercadolivre.com.br")) return false;
    // Bloqueia paths de suporte mesmo no www
    if (/^\/(ajuda|minha-conta|politicas|institucional|seguranca|nota|faq)/i.test(u.pathname)) return false;
    return true;
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) {
    return NextResponse.json({ error: "SERPER_API_KEY não configurada." }, { status: 500 });
  }

  const { q, tag } = await req.json();
  if (!q?.trim()) {
    return NextResponse.json({ error: "Parâmetro 'q' obrigatório." }, { status: 400 });
  }

  // Força busca de páginas de produto individual (MLB = código de produto ML)
  const query = `${q.trim()} site:mercadolivre.com.br inurl:MLB`;

  const res = await fetch(SERPER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": serperKey,
    },
    body: JSON.stringify({ q: query, gl: "br", hl: "pt-br", num: 10 }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Serper error ${res.status}: ${text.slice(0, 200)}` }, { status: 502 });
  }

  const data = await res.json();
  const organic: any[] = data.organic || [];

  const valid = organic.filter((r) => r.link && isMercadoLivreUrl(r.link));

  // Prefere páginas de produto individual; usa listagens como fallback
  const products = [
    ...valid.filter((r) => isIndividualProduct(r.link)),
    ...valid.filter((r) => !isIndividualProduct(r.link)),
  ]
    .slice(0, 5)
    .map((r) => {
      const url = tag ? buildAffiliateUrl(r.link, tag) : r.link;
      const price = extractPrice(r.snippet || "");
      return {
        title: r.title?.replace(/\s*-\s*Mercado Livre$/, "").trim() || "",
        url,
        snippet: r.snippet || "",
        price,
        imageUrl: r.imageUrl || null,
      };
    });

  return NextResponse.json({ products });
}
