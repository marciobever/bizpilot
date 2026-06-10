import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, fetchUrlContent, ingestKnowledgeEntry } from '@/lib/knowledge';

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

  try {
    const { entry, chunks } = await ingestKnowledgeEntry({
      agentId, userId, title, content: finalContent, sourceType, sourceUrl,
    });
    return NextResponse.json({ entry, chunks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
