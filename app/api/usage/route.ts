import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getServiceSupabase } from '@/lib/api-auth';
import { normalizePlan, addonCountsFromRows, computeEffectiveLimits, AI_COST_LIMIT_USD } from '@/lib/plans';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

  const supabase = getServiceSupabase();

  try {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [
      { data: profile },
      { data: agents },
      { count: convCount },
      { data: agentIds },
      { data: addonRows },
      { data: usageRows },
    ] = await Promise.all([
      supabase.from('profiles').select('plan').eq('id', userId).single(),
      supabase.from('agents').select('id').eq('user_id', userId),
      supabase.from('conversations').select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', monthStart),
      supabase.from('agents').select('id').eq('user_id', userId),
      supabase.from('user_addons').select('addon_id, status').eq('user_id', userId),
      supabase.from('usage_logs').select('cost_usd').eq('user_id', userId).gte('created_at', monthStart),
    ]);

    const plan = normalizePlan(profile?.plan);
    const addonCounts = addonCountsFromRows(addonRows as any);
    const limits = computeEffectiveLimits(profile?.plan, addonCounts);
    const aiCostUsed = (usageRows ?? []).reduce((sum: number, r: any) => sum + (Number(r.cost_usd) || 0), 0);

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
        aiCost:              { used_usd: aiCostUsed, limit_usd: AI_COST_LIMIT_USD[plan] },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
