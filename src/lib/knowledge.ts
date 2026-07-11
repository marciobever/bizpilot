import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { PLAN_LIMITS, normalizePlan } from '@/lib/plans';

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 100;

// Quantos documentos de KB o usuário ainda pode criar (-1 = ilimitado).
// Fonte única: PLAN_LIMITS — antes cada rota re-hardcodava os números.
export async function remainingKbSlots(supabase: SupabaseClient, userId: string): Promise<number> {
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', userId).single();
  const kbLimit = PLAN_LIMITS[normalizePlan(profile?.plan)].kbDocs;
  if (kbLimit === -1) return -1;
  const { data: agentIds } = await supabase.from('agents').select('id').eq('user_id', userId);
  if (!agentIds || agentIds.length === 0) return kbLimit;
  const { count } = await supabase.from('knowledge_base')
    .select('*', { count: 'exact', head: true })
    .in('agent_id', agentIds.map((a: { id: string }) => a.id));
  return Math.max(0, kbLimit - (count ?? 0));
}

export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end).trim());
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter(c => c.length > 50);
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
  });
  if (!res.ok) throw new Error(`Embeddings error: ${await res.text()}`);
  const { data } = await res.json();
  return data.map((d: any) => d.embedding);
}

export async function fetchUrlContent(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': 'BizPilotBot/1.0' } });
  if (!res.ok) throw new Error(`Não foi possível acessar a URL: ${res.status}`);
  const html = await res.text();
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Preserva links: <a href="URL">texto</a> -> "texto (URL)", para o agente poder repassá-los.
    .replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, (_m, href, text) => {
      const label = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return label ? `${label} (${href})` : href;
    })
    // Preserva imagens: <img src="URL"> -> "(foto: URL)", para o agente poder enviá-las.
    .replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi, (_m, src) => ` (foto: ${src}) `)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50000);
}

// Insere uma entrada na base de conhecimento, gera chunks e embeddings.
export async function ingestKnowledgeEntry(params: {
  agentId: string;
  userId: string;
  title: string;
  content: string;
  sourceType: string;
  sourceUrl?: string | null;
}) {
  const supabase = getServiceSupabase();
  const { agentId, userId, title, content, sourceType, sourceUrl } = params;

  const { data: entry, error: entryError } = await supabase
    .from('knowledge_base')
    .insert({ user_id: userId, agent_id: agentId, title, content, source_type: sourceType, source_url: sourceUrl || null })
    .select().single();
  if (entryError) throw new Error(entryError.message);

  const chunks = chunkText(content);
  let embeddedCount = 0;
  if (chunks.length > 0) {
    const embeddings = await generateEmbeddings(chunks);
    const rows = chunks.map((chunk, i) => ({
      knowledge_base_id: entry.id, agent_id: agentId, user_id: userId,
      chunk_text: chunk, embedding: embeddings[i], chunk_index: i,
    }));
    const { error: chunkError } = await supabase.from('knowledge_chunks').insert(rows);
    if (!chunkError) {
      embeddedCount = chunks.length;
      await supabase.from('knowledge_base').update({ chunk_count: embeddedCount }).eq('id', entry.id);
    }
  }

  return { entry, chunks: embeddedCount };
}

// Extrai as URLs <loc> de um sitemap.xml (suporta sitemap simples; não segue sitemap index recursivamente).
export async function fetchSitemapUrls(sitemapUrl: string): Promise<string[]> {
  const res = await fetch(sitemapUrl, { headers: { 'User-Agent': 'BizPilotBot/1.0' } });
  if (!res.ok) throw new Error(`Não foi possível acessar o sitemap: ${res.status}`);
  const xml = await res.text();
  const matches = Array.from(xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi));
  return matches.map(m => m[1].trim());
}

// Deriva um título legível a partir do slug da URL (ex: /imovel/apartamento-2-quartos-centro-code-2218 -> "Apartamento 2 Quartos Centro Code 2218")
export function titleFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const slug = path.split('/').filter(Boolean).pop() || path;
    return slug
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, c => c.toUpperCase());
  } catch {
    return url;
  }
}
