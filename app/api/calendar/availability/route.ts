import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function getGoogleAccessToken(clientId: string, clientSecret: string, refreshToken: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Não foi possível renovar o acesso ao Google Calendar.');
  return data.access_token as string;
}

const BUSINESS_HOURS = { start: 9, end: 18 }; // 09h às 18h

async function calcomSlots(apiKey: string, eventTypeId: string, date: string) {
  const start = `${date}T00:00:00.000Z`;
  const end = `${date}T23:59:59.999Z`;
  const res = await fetch(`https://api.cal.com/v2/slots?eventTypeId=${eventTypeId}&start=${start}&end=${end}&timeZone=America/Sao_Paulo`, {
    headers: { Authorization: `Bearer ${apiKey}`, 'cal-api-version': '2024-09-04' },
  });
  const data = await res.json();
  if (!res.ok || data?.status === 'error') throw new Error(data?.error?.message || 'Erro ao consultar disponibilidade no Cal.com.');
  const slotsByDate = data.data ?? data;
  const raw = (slotsByDate?.[date] || []) as any[];
  return raw.map((s) => (typeof s === 'string' ? s : s.start));
}

async function googleSlots(config: any, date: string) {
  const accessToken = await getGoogleAccessToken(config.clientId, config.clientSecret, config.refreshToken);
  const calendarId = config.calendarId || 'primary';
  const timeMin = `${date}T00:00:00-03:00`;
  const timeMax = `${date}T23:59:59-03:00`;

  const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeMin, timeMax, items: [{ id: calendarId }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Erro ao consultar disponibilidade no Google Calendar.');
  const busy: { start: string; end: string }[] = data.calendars?.[calendarId]?.busy || [];

  const slots: string[] = [];
  for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
    const slotStart = new Date(`${date}T${String(hour).padStart(2, '0')}:00:00-03:00`);
    const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
    const overlaps = busy.some((b) => new Date(b.start) < slotEnd && new Date(b.end) > slotStart);
    if (!overlaps) slots.push(slotStart.toISOString());
  }
  return slots;
}

async function calendlySlots(apiToken: string, eventTypeUri: string, date: string) {
  const startTime = `${date}T00:00:00.000000Z`;
  const endDate = new Date(`${date}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const endTime = endDate.toISOString().replace(/\.\d{3}Z$/, '.000000Z');

  const res = await fetch(`https://api.calendly.com/event_type_available_times?event_type=${encodeURIComponent(eventTypeUri)}&start_time=${startTime}&end_time=${endTime}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Erro ao consultar disponibilidade no Calendly.');
  return (data.collection || []).filter((s: any) => s.status === 'available').map((s: any) => s.start_time as string);
}

// POST /api/calendar/availability { agentId, date: 'YYYY-MM-DD' }
// Chamado pelo Windmill (tool `verificar_disponibilidade`).
export async function POST(req: NextRequest) {
  const { agentId, date } = await req.json();
  if (!agentId || !date) return NextResponse.json({ error: 'agentId e date são obrigatórios' }, { status: 400 });

  const supabase = getServiceSupabase();

  const { data: agent, error: agentErr } = await supabase.from('agents').select('user_id').eq('id', agentId).single();
  if (agentErr || !agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 });

  const { data: integration, error: intErr } = await supabase
    .from('integrations').select('status, config')
    .eq('user_id', agent.user_id).eq('provider', 'calendar').maybeSingle();

  if (intErr || !integration || integration.status !== 'connected') {
    return NextResponse.json({ error: 'Calendário não conectado para este usuário.' }, { status: 400 });
  }

  const config = integration.config as any;

  try {
    let slots: string[] = [];
    if (config.provider === 'calcom') slots = await calcomSlots(config.apiKey, config.eventTypeId, date);
    else if (config.provider === 'google') slots = await googleSlots(config, date);
    else if (config.provider === 'calendly') slots = await calendlySlots(config.apiToken, config.eventTypeUri, date);
    else return NextResponse.json({ error: 'Provedor de calendário não suportado.' }, { status: 400 });

    return NextResponse.json({ slots });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
