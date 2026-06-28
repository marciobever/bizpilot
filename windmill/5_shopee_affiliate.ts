// Windmill Script 5: Shopee Affiliate — Busca de produtos + link de afiliado
// Runtime: Bun
// Add-on de afiliados. Dado um termo de busca, encontra até N ofertas na Shopee
// Affiliate Open API (productOfferV2) e gera o link de afiliado curto de cada uma
// (generateShortLink). Retorna a listagem enriquecida pronta pro bot apresentar
// (padrão: 5 produtos por busca). A publicação nas redes é outro módulo (6).
//
// Autenticação da Affiliate Open API (igual nos dois passos):
//   Authorization: SHA256 Credential={appId}, Timestamp={ts}, Signature={sig}
//   sig = sha256(appId + timestamp + payload + secret)   [hex]
//   payload = corpo JSON EXATO da requisição — precisa ser byte-idêntico ao que
//   foi assinado, por isso enviamos a mesma string que entrou na assinatura.

import { createHash } from "crypto";

const GRAPHQL_ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";

// Campos pedidos de cada oferta. itemId/shopId são os comprovadamente usados;
// os demais são campos padrão do productOfferV2 — se a sua conta rejeitar algum,
// é só removê-lo daqui (um campo inexistente derruba a query inteira).
const OFFER_FIELDS = `
  itemId
  shopId
  productName
  priceMin
  priceMax
  imageUrl
  shopName
  ratingStar
  sales
  commissionRate
  productLink
  offerLink
`;

type Creds = { appId: string; secret: string };

export type AffiliateProduct = {
  itemId: string;
  shopId: string;
  productName: string;
  priceLabel: string;        // ex.: "R$ 39,90" ou "R$ 39,90 – R$ 59,90"
  priceMin: string | null;
  priceMax: string | null;
  imageUrl: string | null;
  shopName: string | null;
  ratingStar: string | null;
  sales: number | null;
  commissionRate: string | null;
  productUrl: string;        // link canônico do produto (origem do shortlink)
  affiliateLink: string | null; // link curto de afiliado (com subIds) — o que se compartilha
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeGql(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// Formata o preço da Shopee (strings tipo "39.90") em BRL legível.
function priceLabel(min: string | null, max: string | null): string {
  const fmt = (v: string | null) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0
      ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : null;
  };
  const a = fmt(min);
  const b = fmt(max);
  if (a && b && a !== b) return `${a} – ${b}`;
  return a || b || "Preço indisponível";
}

// Resolve credenciais: parâmetro explícito > variável do Windmill. Permite, no
// futuro, passar a chave do próprio usuário (add-on multi-conta) por parâmetro.
async function resolveCreds(appIdParam?: string, secretParam?: string): Promise<Creds> {
  let appId = appIdParam || "";
  let secret = secretParam || "";
  if (!appId || !secret) {
    try {
      const { getVariable } = await import("windmill-client");
      const tryGet = async (...paths: string[]) => {
        for (const p of paths) { try { const v = await getVariable(p); if (v) return v; } catch {} }
        return "";
      };
      if (!appId)  appId  = await tryGet("u/bevervansomarcio/synapseai/SHOPEE_AFFILIATE_APP_ID", "u/bevervansomarcio/SHOPEE_AFFILIATE_APP_ID");
      if (!secret) secret = await tryGet("u/bevervansomarcio/synapseai/SHOPEE_AFFILIATE_SECRET", "u/bevervansomarcio/SHOPEE_AFFILIATE_SECRET");
    } catch (e: any) {
      console.warn("windmill-client indisponível:", e.message);
    }
  }
  if (!appId || !secret) {
    throw new Error("Credenciais Shopee Affiliate ausentes (SHOPEE_AFFILIATE_APP_ID / SHOPEE_AFFILIATE_SECRET).");
  }
  return { appId, secret };
}

// Assina e dispara uma operação GraphQL. Envia a MESMA string que foi assinada.
async function signedRequest(body: object, creds: Creds): Promise<any> {
  const payload = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha256")
    .update(`${creds.appId}${timestamp}${payload}${creds.secret}`)
    .digest("hex");
  const auth = `SHA256 Credential=${creds.appId}, Timestamp=${timestamp}, Signature=${signature}`;

  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: payload,
  });

  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); }
  catch { throw new Error(`Resposta não-JSON da Shopee (HTTP ${res.status}): ${text.slice(0, 200)}`); }
  if (json.errors?.length) {
    throw new Error(`Shopee GraphQL: ${JSON.stringify(json.errors).slice(0, 300)}`);
  }
  return json.data || {};
}

// Passo 1 — busca: 1 query, até `limit` ofertas para o termo.
async function searchProducts(keyword: string, limit: number, creds: Creds): Promise<AffiliateProduct[]> {
  const query = `query { productOfferV2(keyword: "${escapeGql(keyword)}", limit: ${limit}) { nodes { ${OFFER_FIELDS} } } }`;
  const data = await signedRequest({ query }, creds);
  const nodes: any[] = data?.productOfferV2?.nodes || [];
  return nodes.map((n) => ({
    itemId: String(n.itemId),
    shopId: String(n.shopId),
    productName: n.productName || "",
    priceLabel: priceLabel(n.priceMin ?? null, n.priceMax ?? null),
    priceMin: n.priceMin ?? null,
    priceMax: n.priceMax ?? null,
    imageUrl: n.imageUrl ?? null,
    shopName: n.shopName ?? null,
    ratingStar: n.ratingStar ?? null,
    sales: typeof n.sales === "number" ? n.sales : (n.sales != null ? Number(n.sales) : null),
    commissionRate: n.commissionRate ?? null,
    productUrl: n.productLink || `https://shopee.com.br/product/${n.shopId}/${n.itemId}`,
    affiliateLink: null,
  }));
}

// Passo 2 — ponte de afiliado: 1 mutation em batch (m0, m1, ...) gera o shortlink
// de cada produto. subIds (rastreamento) vão no campo OFICIAL do input, não como
// query-params colados na URL — assim a Shopee atribui de verdade.
async function attachAffiliateLinks(products: AffiliateProduct[], subIds: string[], creds: Creds): Promise<void> {
  if (!products.length) return;
  // Shopee rejeita subId com hífen/caractere especial (erro 11001) — sanitiza
  // para alfanumérico antes de enviar.
  const subList = subIds.map((s) => String(s).replace(/[^a-zA-Z0-9_]/g, "")).filter(Boolean).slice(0, 5).map((s) => `"${s}"`).join(", ");
  const subArg = subList ? `, subIds: [${subList}]` : "";
  const parts = products.map((p, i) =>
    `m${i}: generateShortLink(input: { originUrl: "${escapeGql(p.productUrl)}"${subArg} }) { shortLink }`
  );
  const data = await signedRequest({ query: `mutation { ${parts.join("\n")} }` }, creds);
  products.forEach((p, i) => {
    p.affiliateLink = data?.[`m${i}`]?.shortLink || p.affiliateLink || null;
  });
}

// ─── Entrada ──────────────────────────────────────────────────────────────────
// keyword   : termo que o usuário pediu ao bot (ex.: "facas de cozinha")
// limit     : quantos produtos retornar (padrão 5)
// subIds    : até 5 rótulos de rastreamento (ex.: [agentId, "whatsapp", canal])
// appId/secret: override opcional (add-on com chave do próprio usuário)
export async function main(
  keyword: string,
  limit: number = 5,
  subIds: string[] = [],
  appId?: string,
  secret?: string,
) {
  if (!keyword || !keyword.trim()) {
    return { ok: false, error: "Informe um termo de busca.", products: [] as AffiliateProduct[] };
  }
  const lim = Math.min(Math.max(1, Math.floor(limit) || 5), 20);

  try {
    const creds = await resolveCreds(appId, secret);
    const products = await searchProducts(keyword.trim(), lim, creds);
    if (!products.length) {
      return { ok: true, count: 0, products: [], message: `Nenhum produto encontrado para "${keyword.trim()}".` };
    }
    await attachAffiliateLinks(products, Array.isArray(subIds) ? subIds : [], creds);
    return { ok: true, count: products.length, products };
  } catch (e: any) {
    console.error("shopee_affiliate:", e?.message);
    return { ok: false, error: e?.message || "Erro desconhecido na busca Shopee.", products: [] as AffiliateProduct[] };
  }
}
