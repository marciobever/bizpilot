import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { graphUrl, getMetaConfig } from '../../meta/utils';
import { resolveInstanceToken } from '../../evolution/utils';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const DEFAULT_REMINDER_HOURS = 2;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

async function sendReminder(agentConfig: any, agentId: string, phone: string, text: string) {
  const waConfig = agentConfig?.whatsapp || {};

  if (waConfig.provider === 'meta') {
    const meta = getMetaConfig(agentConfig);
    if (!meta.phoneNumberId || !meta.accessToken) throw new Error('Credenciais da Meta ausentes.');
    const recipient = phone.replace('@s.whatsapp.net', '').replace(/\D/g, '');
    const res = await fetch(graphUrl(`${meta.phoneNumberId}/messages`), {
      method: 'POST',
      headers: { Authorization: `Bearer ${meta.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: recipient, type: 'text', text: { body: text } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error?.message || 'Erro ao enviar pela Meta.');
    return;
  }

  const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
  if (!EVOLUTION_API_URL) throw new Error('Evolution API não configurada.');

  const creds = await resolveInstanceToken(`agent_${agentId}`);
  if (!creds) throw new Error('Instância Evolution não encontrada para este agente.');

  const number = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
  const res = await fetch(`${EVOLUTION_API_URL}/send/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: creds.token },
    body: JSON.stringify({ number, text, delay: 0 }),
  });
  if (!res.ok) throw new Error(`Erro ao enviar pela Evolution: ${await res.text()}`);
}

// POST /api/calendar/reminders
// Chamado por um cron (Windmill) a cada poucos minutos. Envia lembretes de
// confirmação de agendamento dentro da janela configurada (padrão 2h antes).
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const supabase = getServiceSupabase();

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, user_id, agent_id, datetime, customer_name, agents(name, config), leads(phone, name)')
    .eq('status', 'scheduled')
    .is('reminder_sent_at', null)
    .gt('datetime', new Date().toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: integrations } = await supabase
    .from('integrations').select('user_id, config').eq('provider', 'calendar');
  const reminderHoursByUser = new Map<string, number>(
    (integrations || []).map((i: any) => [i.user_id, Number(i.config?.reminderHours) || DEFAULT_REMINDER_HOURS])
  );

  const now = Date.now();
  let sent = 0;
  const errors: string[] = [];

  for (const booking of bookings || []) {
    const reminderHours = reminderHoursByUser.get(booking.user_id) ?? DEFAULT_REMINDER_HOURS;
    const hoursUntil = (new Date(booking.datetime).getTime() - now) / 3_600_000;
    if (hoursUntil > reminderHours) continue;

    const lead = (booking as any).leads;
    const agent = (booking as any).agents;
    if (!lead?.phone || !agent) continue;

    const name = booking.customer_name || lead.name || '';
    const text = `Olá${name ? ` ${name}` : ''}! 👋 Passando para confirmar seu compromisso *${formatDateTime(booking.datetime)}*. Podemos manter o horário?`;

    try {
      await sendReminder(agent.config, booking.agent_id, lead.phone, text);
      await supabase.from('bookings').update({ reminder_sent_at: new Date().toISOString(), status: 'reminded' }).eq('id', booking.id);
      sent++;
    } catch (e: any) {
      errors.push(`${booking.id}: ${e.message}`);
    }
  }

  return NextResponse.json({ sent, errors });
}
