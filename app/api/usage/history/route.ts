import { NextRequest, NextResponse } from 'next/server';
import { requireUser, getServiceSupabase } from '@/lib/api-auth';

const LOGS_PAGE_SIZE = 50;

// Consumo de IA detalhado (por bot, por dia, log com data/hora) — usage_logs já
// tem tudo isso; este endpoint só agrega e devolve pro cliente ver o que gerou
// o custo, em vez de só um número derivado.
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

  const supabase = getServiceSupabase();
  const { searchParams } = new URL(req.url);
  const agentFilter = searchParams.get('agentId'); // "all" ou um agent_id
  const days = Math.min(Math.max(Number(searchParams.get('days')) || 30, 1), 90);
  const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

  try {
    const since = new Date();
    since.setDate(since.getDate() - (days - 1));
    since.setHours(0, 0, 0, 0);

    const { data: agents } = await supabase.from('agents').select('id, name').eq('user_id', userId).is('deleted_at', null);
    const agentNameById = new Map((agents ?? []).map((a: any) => [a.id, a.name]));

    let logsQuery = supabase.from('usage_logs')
      .select('id, agent_id, conversation_id, model, endpoint, prompt_tokens, completion_tokens, total_tokens, cost_usd, created_at')
      .eq('user_id', userId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });
    if (agentFilter && agentFilter !== 'all') logsQuery = logsQuery.eq('agent_id', agentFilter);

    const { data: rows } = await logsQuery.limit(2000);
    const allRows = rows ?? [];

    const byAgentMap = new Map<string, { agent_id: string; agent_name: string; cost_usd: number; total_tokens: number; calls: number }>();
    const byDayMap = new Map<string, { date: string; cost_usd: number; calls: number }>();
    for (const r of allRows) {
      const agentId = r.agent_id || 'sem-agente';
      const agentName = agentNameById.get(r.agent_id) || 'Agente removido';
      const agentEntry = byAgentMap.get(agentId) || { agent_id: agentId, agent_name: agentName, cost_usd: 0, total_tokens: 0, calls: 0 };
      agentEntry.cost_usd += Number(r.cost_usd) || 0;
      agentEntry.total_tokens += Number(r.total_tokens) || 0;
      agentEntry.calls += 1;
      byAgentMap.set(agentId, agentEntry);

      const day = r.created_at.slice(0, 10);
      const dayEntry = byDayMap.get(day) || { date: day, cost_usd: 0, calls: 0 };
      dayEntry.cost_usd += Number(r.cost_usd) || 0;
      dayEntry.calls += 1;
      byDayMap.set(day, dayEntry);
    }

    const byAgent = Array.from(byAgentMap.values()).sort((a, b) => b.cost_usd - a.cost_usd);
    const byDay = Array.from(byDayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    const totalCostUsd = allRows.reduce((sum, r) => sum + (Number(r.cost_usd) || 0), 0);

    const logsPage = allRows.slice(offset, offset + LOGS_PAGE_SIZE).map((r) => ({
      id: r.id,
      created_at: r.created_at,
      agent_id: r.agent_id,
      agent_name: agentNameById.get(r.agent_id) || 'Agente removido',
      conversation_id: r.conversation_id,
      model: r.model,
      endpoint: r.endpoint,
      total_tokens: r.total_tokens,
      cost_usd: r.cost_usd,
    }));

    return NextResponse.json({
      agents: (agents ?? []).map((a: any) => ({ id: a.id, name: a.name })),
      totalCostUsd,
      byAgent,
      byDay,
      logs: logsPage,
      logsTotal: allRows.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
