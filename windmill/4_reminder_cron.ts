// Windmill Script 4: Reminder Cron
// Runtime: Bun
// Agendar para rodar a cada 15-30 minutos (Schedules → New Schedule).
// Chama /api/calendar/reminders, que envia confirmações de agendamento
// dentro da janela configurada (padrão 2h antes do horário).

export async function main(APP_BASE_URL?: string, CRON_SECRET?: string) {
  let appBaseUrl = APP_BASE_URL || process.env.APP_BASE_URL || '';
  let cronSecret = CRON_SECRET || process.env.CRON_SECRET || '';

  if (!appBaseUrl || !cronSecret) {
    try {
      const { getVariable } = await import('windmill-client');
      const tryGet = async (...paths: string[]) => {
        for (const p of paths) { try { const v = await getVariable(p); if (v) return v; } catch {} }
        return '';
      };
      if (!appBaseUrl) appBaseUrl = await tryGet('u/bevervansomarcio/synapseai/APP_BASE_URL');
      if (!cronSecret) cronSecret = await tryGet('u/bevervansomarcio/synapseai/CRON_SECRET');
    } catch (e: any) {
      console.warn('windmill-client:', e.message);
    }
  }

  if (!appBaseUrl) return { ok: false, reason: 'APP_BASE_URL ausente.' };

  const res = await fetch(`${appBaseUrl}/api/calendar/reminders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, status: res.status, data };
  return { ok: true, ...data };
}
