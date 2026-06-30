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

export async function POST(req: NextRequest) {
  const serperKey = process.env.SERPER_API_KEY;
  if (!serperKey) {
    return NextResponse.json({ error: "SERPER_API_KEY não configurada." }, { status: 500 });
  }

  const { q, tag } = await req.json();
  if (!q?.trim()) {
    return NextResponse.json({ error: "Parâmetro 'q' obrigatório." }, { status: 400 });
  }

  const query = `${q.trim()} site:mercadolivre.com.br`;

  const res = await fetch(SERPER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": serperKey,
    },
    body: JSON.stringify({ q: query, gl: "br", hl: "pt-br", num: 6 }),
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: `Serper error ${res.status}: ${text.slice(0, 200)}` }, { status: 502 });
  }

  const data = await res.json();
  const organic: any[] = data.organic || [];

  // Exclui apenas homepage e páginas de ajuda/conta — tudo mais é produto ou lista válida
  const excludePattern = /mercadolivre\.com\.br\/(ajuda|minha-conta|politicas|institucional|seguranca)?\/?$/i;
  const products = organic
    .filter((r) => r.link && !excludePattern.test(r.link))
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
