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

  // Verifica limite de documentos do plano
  const { data: profile } = await supabase.from('profiles').select('plan').eq('id', userId).single();
  const rawPlan = profile?.plan || 'starter';
  const planNorm = (rawPlan === 'basico' ? 'starter' : rawPlan === 'profissional' ? 'pro' : rawPlan === 'avancado' ? 'business' : rawPlan) as 'starter' | 'pro' | 'business';
  const LIMITS: Record<string, number> = { starter: 50, pro: 200, business: -1 };
  const kbLimit = LIMITS[planNorm] ?? 50;
  if (kbLimit !== -1) {
    const { data: agentIds } = await supabase.from('agents').select('id').eq('user_id', userId);
    if (agentIds && agentIds.length > 0) {
      const { count } = await supabase.from('knowledge_base')
        .select('*', { count: 'exact', head: true })
        .in('agent_id', agentIds.map((a: any) => a.id));
      if ((count ?? 0) >= kbLimit) {
        return NextResponse.json({ error: `Limite de ${kbLimit} documentos atingido no plano ${planNorm}. Faça upgrade em Configurações → Plano.` }, { status: 403 });
      }
    }
  }

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
