import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 100;

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end).trim());
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter(c => c.length > 50);
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
  });
  if (!res.ok) throw new Error(`Embeddings error: ${await res.text()}`);
  const { data } = await res.json();
  return data.map((d: any) => d.embedding);
}

async function fetchUrlContent(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': 'SynapseAI-Bot/1.0' } });
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
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50000);
}

// GET /api/knowledge?agentId=xxx
export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId');
  if (!agentId) return NextResponse.json({ error: 'agentId obrigatório' }, { status: 400 });

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('knowledge_base')
    .select('id, title, source_type, source_url, chunk_count, created_at')
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ entries: data });
}

// POST /api/knowledge
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { agentId, title, content, sourceType = 'text', sourceUrl } = body;

  if (!agentId || !title) return NextResponse.json({ error: 'agentId e title são obrigatórios' }, { status: 400 });

  const supabase = getServiceSupabase();

  // Resolve user_id from the agent record
  const { data: agent, error: agentErr } = await supabase
    .from('agents').select('user_id').eq('id', agentId).single();
  if (agentErr || !agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 });
  const userId = agent.user_id;

  let finalContent = content || '';
  if (sourceType === 'url' && sourceUrl) {
    try { finalContent = await fetchUrlContent(sourceUrl); }
    catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
  }
  if (!finalContent.trim()) return NextResponse.json({ error: 'Conteúdo vazio' }, { status: 400 });

  const { data: entry, error: entryError } = await supabase
    .from('knowledge_base')
    .insert({ user_id: userId, agent_id: agentId, title, content: finalContent, source_type: sourceType, source_url: sourceUrl || null })
    .select().single();
  if (entryError) return NextResponse.json({ error: entryError.message }, { status: 500 });

  const chunks = chunkText(finalContent);
  let embeddedCount = 0;
  try {
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
  } catch (e: any) {
    console.error('Embedding error:', e.message);
  }

  return NextResponse.json({ entry, chunks: embeddedCount });
}
