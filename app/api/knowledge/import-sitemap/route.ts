import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, fetchUrlContent, fetchSitemapUrls, titleFromUrl, ingestKnowledgeEntry } from '@/lib/knowledge';
import { requireUser, assertPublicHttpUrl, SsrfError } from '@/lib/api-auth';

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
  urls = urls.slice(0, limit);

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
