import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizePlan, PLAN_LIMITS } from '@/lib/plans';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase não configurado.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 });

  const supabase = getSupabase();

  try {
    const [
      { data: profile },
      { data: agents },
      { count: convCount },
      { data: agentIds },
    ] = await Promise.all([
      supabase.from('profiles').select('plan').eq('id', userId).single(),
      supabase.from('agents').select('id').eq('user_id', userId),
      supabase.from('conversations').select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase.from('agents').select('id').eq('user_id', userId),
    ]);

    const plan = normalizePlan(profile?.plan);
    const limits = PLAN_LIMITS[plan];

    // Count KB docs across all agents
    let kbCount = 0;
    if (agentIds && agentIds.length > 0) {
      const { count } = await supabase.from('knowledge_base')
        .select('*', { count: 'exact', head: true })
        .in('agent_id', agentIds.map((a: any) => a.id));
      kbCount = count ?? 0;
    }

    return NextResponse.json({
      plan,
      usage: {
        bots:          { used: agents?.length ?? 0,  limit: limits.bots },
        conversations: { used: convCount ?? 0,        limit: limits.conversations },
        kbDocs:        { used: kbCount,               limit: limits.kbDocs },
        historyDays:   { limit: limits.historyDays },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
