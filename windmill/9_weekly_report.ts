// Windmill Script 9: Weekly Report
// Runtime: Bun
// Agendar para rodar 1x/semana (ex.: segunda 9h) — Schedules → New Schedule.
// Chama /api/reports/weekly: e-mail de resumo semanal (leads, conversas,
// respostas da IA, agendamentos) pra cada conta ativa com atividade.

export async function main(APP_BASE_URL?: string, INTERNAL_API_SECRET?: string) {
  let appBaseUrl = APP_BASE_URL || process.env.APP_BASE_URL || '';
  let internalSecret = INTERNAL_API_SECRET || process.env.INTERNAL_API_SECRET || '';

  if (!appBaseUrl || !internalSecret) {
    try {
      const { getVariable } = await import('windmill-client');
      const tryGet = async (...paths: string[]) => {
        for (const p of paths) { try { const v = await getVariable(p); if (v) return v; } catch {} }
        return '';
      };
      if (!appBaseUrl) appBaseUrl = await tryGet('u/bevervansomarcio/bizpilot/APP_BASE_URL');
      if (!internalSecret) internalSecret = await tryGet('u/bevervansomarcio/bizpilot/INTERNAL_API_SECRET');
    } catch (e: any) {
      console.warn('windmill-client:', e.message);
    }
  }

  if (!appBaseUrl) return { ok: false, reason: 'APP_BASE_URL ausente.' };
  if (!internalSecret) return { ok: false, reason: 'INTERNAL_API_SECRET ausente.' };

  const res = await fetch(`${appBaseUrl}/api/reports/weekly`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': internalSecret,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, data };
  return { ok: true, ...data };
}
