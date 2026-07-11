import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, fetchUrlContent, ingestKnowledgeEntry, remainingKbSlots } from '@/lib/knowledge';
import { requireUser, userOwnsAgent, assertPublicHttpUrl, SsrfError } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';

// GET /api/knowledge?agentId=xxx
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const agentId = req.nextUrl.searchParams.get('agentId');
  if (!agentId) return NextResponse.json({ error: 'agentId obrigatório' }, { status: 400 });
  if (!(await userOwnsAgent(agentId, auth.user.id))) {
    return NextResponse.json({ error: 'Agente não pertence à sua conta.' }, { status: 403 });
  }

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
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json();
  const { agentId, title, content, sourceType = 'text', sourceUrl } = body;

  if (!agentId || !title) return NextResponse.json({ error: 'agentId e title são obrigatórios' }, { status: 400 });

  const supabase = getServiceSupabase();

  // Resolve user_id from the agent record e garante que é do usuário logado
  const { data: agent, error: agentErr } = await supabase
    .from('agents').select('user_id').eq('id', agentId).single();
  if (agentErr || !agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 });
  if (agent.user_id !== auth.user.id) {
    return NextResponse.json({ error: 'Agente não pertence à sua conta.' }, { status: 403 });
  }
  const userId = agent.user_id;

  // 20 ingestões/min — cada documento gera embeddings pagos na OpenAI.
  const rl = await checkRateLimit(supabase, userId, 'knowledge-ingest', 20, 60);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Muitos documentos em pouco tempo. Aguarde um instante e tente de novo.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    );
  }

  // Verifica limite de documentos do plano
  if ((await remainingKbSlots(supabase, userId)) === 0) {
    return NextResponse.json({ error: 'Limite de documentos do seu plano atingido. Faça upgrade em Configurações → Plano.' }, { status: 403 });
  }

  let finalContent = content || '';
  if (sourceType === 'url' && sourceUrl) {
    try {
      await assertPublicHttpUrl(String(sourceUrl));
      finalContent = await fetchUrlContent(sourceUrl);
    }
    catch (e: any) {
      const msg = e instanceof SsrfError ? `URL não permitida: ${e.message}` : e.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }
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
