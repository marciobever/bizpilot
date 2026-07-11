import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, fetchUrlContent, fetchSitemapUrls, titleFromUrl, ingestKnowledgeEntry, remainingKbSlots } from '@/lib/knowledge';
import { requireUser, assertPublicHttpUrl, SsrfError } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const maxDuration = 300;

const MAX_ITEMS_LIMIT = 50;

// POST /api/knowledge/import-sitemap
// Importa páginas individuais (ex: fichas de imóveis) listadas em um sitemap.xml
// como entradas separadas na base de conhecimento.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { agentId, sitemapUrl, urlFilter, maxItems } = body;

  if (!agentId || !sitemapUrl) {
    return NextResponse.json({ error: 'agentId e sitemapUrl são obrigatórios' }, { status: 400 });
  }
  const limit = Math.min(Math.max(Number(maxItems) || 20, 1), MAX_ITEMS_LIMIT);

  const supabase = getServiceSupabase();

  const { data: agent, error: agentErr } = await supabase
    .from('agents').select('user_id').eq('id', agentId).single();
  if (agentErr || !agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 });
  if (agent.user_id !== auth.user.id) {
    return NextResponse.json({ error: 'Agente não pertence à sua conta.' }, { status: 403 });
  }
  const userId = agent.user_id;

  // 2 importações/min — cada uma pode buscar até 50 páginas e gerar embeddings
  // pagos de todas; sem trava, um loop de importações vira custo OpenAI em escala.
  const rl = await checkRateLimit(supabase, userId, 'knowledge-import-sitemap', 2, 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Aguarde a importação anterior terminar antes de iniciar outra.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  // Respeita o limite de documentos do plano — antes o import por sitemap
  // passava por cima da cota que o upload individual respeita.
  const slots = await remainingKbSlots(supabase, userId);
  if (slots === 0) {
    return NextResponse.json({ error: 'Limite de documentos do seu plano atingido. Faça upgrade em Configurações → Plano.' }, { status: 403 });
  }

  let urls: string[];
  try {
    await assertPublicHttpUrl(String(sitemapUrl));
    urls = await fetchSitemapUrls(sitemapUrl);
  } catch (e: any) {
    const msg = e instanceof SsrfError ? `URL não permitida: ${e.message}` : e.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  if (urlFilter && typeof urlFilter === 'string' && urlFilter.trim()) {
    urls = urls.filter(u => u.includes(urlFilter.trim()));
  }
  // Importa no máximo o que ainda cabe na cota do plano (-1 = ilimitado).
  urls = urls.slice(0, slots === -1 ? limit : Math.min(limit, slots));

  if (urls.length === 0) {
    return NextResponse.json({ error: 'Nenhuma URL encontrada no sitemap com esse filtro.' }, { status: 400 });
  }

  const imported: string[] = [];
  const errors: { url: string; error: string }[] = [];

  for (const url of urls) {
    try {
      await assertPublicHttpUrl(url);
      const content = await fetchUrlContent(url);
      if (!content.trim()) {
        errors.push({ url, error: 'Conteúdo vazio' });
        continue;
      }
      await ingestKnowledgeEntry({
        agentId, userId, title: titleFromUrl(url), content, sourceType: 'url', sourceUrl: url,
      });
      imported.push(url);
    } catch (e: any) {
      errors.push({ url, error: e.message });
    }
  }

  return NextResponse.json({ imported: imported.length, total: urls.length, errors });
}
