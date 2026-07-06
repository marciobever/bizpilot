import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireInternalSecret } from '@/lib/api-auth';
import { resolveCalendarConfig } from '@/lib/calendarConfig';

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

async function rescheduleCalcom(config: any, bookingUid: string, datetime: string) {
  const res = await fetch(`https://api.cal.com/v2/bookings/${bookingUid}/reschedule`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', 'cal-api-version': '2026-02-25' },
    body: JSON.stringify({ start: new Date(datetime).toISOString(), reschedulingReason: 'Reagendado pelo cliente via WhatsApp' }),
  });
  const data = await res.json();
  if (!res.ok || data?.status === 'error') throw new Error(data?.error?.message || 'Erro ao reagendar no Cal.com.');
  return { providerBookingId: (data?.data?.uid as string | undefined) || bookingUid };
}

async function rescheduleGoogle(config: any, eventId: string, datetime: string) {
  const accessToken = await getGoogleAccessToken(config.clientId, config.clientSecret, config.refreshToken);
  const calendarId = config.calendarId || 'primary';
  const start = new Date(datetime);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      start: { dateTime: start.toISOString(), timeZone: 'America/Sao_Paulo' },
      end: { dateTime: end.toISOString(), timeZone: 'America/Sao_Paulo' },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Erro ao reagendar no Google Calendar.');
  return { providerBookingId: eventId };
}

// POST /api/calendar/reschedule { agentId, leadId, datetime }
// Chamado pelo Windmill (tool `reagendar_horario`).
export async function POST(req: NextRequest) {
  const auth = requireInternalSecret(req);
  if (!auth.ok) return auth.response;

  const { agentId, leadId, datetime } = await req.json();
  if (!agentId || !leadId || !datetime) return NextResponse.json({ error: 'agentId, leadId e datetime são obrigatórios' }, { status: 400 });

  const supabase = getServiceSupabase();

  const resolved = await resolveCalendarConfig(supabase, agentId);
  if (!resolved) return NextResponse.json({ error: 'Calendário não conectado para este agente.' }, { status: 400 });
  const config = resolved.config;
  if (config.provider !== 'calcom' && config.provider !== 'google') {
    return NextResponse.json({ error: 'Reagendamento não suportado para este provedor.' }, { status: 400 });
  }

  const { data: booking, error: bookingErr } = await supabase
    .from('bookings').select('*')
    .eq('lead_id', leadId).eq('agent_id', agentId)
    .in('status', ['scheduled', 'reminded'])
    .gt('datetime', new Date().toISOString())
    .order('datetime', { ascending: true }).limit(1).maybeSingle();

  if (bookingErr || !booking || !booking.provider_booking_id) {
    return NextResponse.json({ error: 'Nenhum agendamento ativo encontrado para reagendar.' }, { status: 404 });
  }

  try {
    let result: { providerBookingId: string };
    if (config.provider === 'calcom') {
      result = await rescheduleCalcom(config, booking.provider_booking_id, datetime);
    } else {
      result = await rescheduleGoogle(config, booking.provider_booking_id, datetime);
    }

    await supabase.from('bookings').update({
      datetime: new Date(datetime).toISOString(),
      provider_booking_id: result.providerBookingId,
      status: 'scheduled',
      reminder_sent_at: null,
    }).eq('id', booking.id);

    return NextResponse.json({ confirmed: true, message: `Agendamento reagendado para ${datetime}.` });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
