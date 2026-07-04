import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getServiceSupabase } from '@/lib/api-auth';
import { normalizePlan, addonCountsFromRows, computeEffectiveLimits } from '@/lib/plans';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

  const supabase = getServiceSupabase();

  try {
    const [
      { data: profile },
      { data: agents },
      { count: convCount },
      { data: agentIds },
      { data: addonRows },
    ] = await Promise.all([
      supabase.from('profiles').select('plan').eq('id', userId).single(),
      supabase.from('agents').select('id').eq('user_id', userId),
      supabase.from('conversations').select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase.from('agents').select('id').eq('user_id', userId),
      supabase.from('user_addons').select('addon_id, status').eq('user_id', userId),
    ]);

    const plan = normalizePlan(profile?.plan);
    const addonCounts = addonCountsFromRows(addonRows as any);
    const limits = computeEffectiveLimits(profile?.plan, addonCounts);

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
      addons: addonCounts,
      usage: {
        bots:          { used: agents?.length ?? 0,  limit: limits.bots },
        conversations: { used: convCount ?? 0,        limit: limits.conversations },
        kbDocs:        { used: kbCount,               limit: limits.kbDocs },
        historyDays:   { limit: limits.historyDays },
        extraCampaigns:      limits.extraCampaigns,
        extraWhatsappNumbers: limits.extraWhatsappNumbers,
        voice:               limits.voice,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
