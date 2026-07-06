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

async function cancelCalcom(config: any, bookingUid: string) {
  const res = await fetch(`https://api.cal.com/v2/bookings/${bookingUid}/cancel`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', 'cal-api-version': '2026-02-25' },
    body: JSON.stringify({ cancellationReason: 'Cancelado pelo cliente via WhatsApp' }),
  });
  if (res.status === 404) return; // já cancelado/não existe mais
  const data = await res.json();
  if (!res.ok || data?.status === 'error') throw new Error(data?.error?.message || 'Erro ao cancelar agendamento no Cal.com.');
}

async function cancelGoogle(config: any, eventId: string) {
  const accessToken = await getGoogleAccessToken(config.clientId, config.clientSecret, config.refreshToken);
  const calendarId = config.calendarId || 'primary';

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || 'Erro ao cancelar evento no Google Calendar.');
  }
}

// POST /api/calendar/cancel { agentId, leadId }
// Chamado pelo Windmill (tool `cancelar_agendamento`).
export async function POST(req: NextRequest) {
  const auth = requireInternalSecret(req);
  if (!auth.ok) return auth.response;

  const { agentId, leadId } = await req.json();
  if (!agentId || !leadId) return NextResponse.json({ error: 'agentId e leadId são obrigatórios' }, { status: 400 });

  const supabase = getServiceSupabase();

  const resolved = await resolveCalendarConfig(supabase, agentId);
  if (!resolved) return NextResponse.json({ error: 'Calendário não conectado para este agente.' }, { status: 400 });
  const config = resolved.config;
  if (config.provider !== 'calcom' && config.provider !== 'google') {
    return NextResponse.json({ error: 'Cancelamento não suportado para este provedor.' }, { status: 400 });
  }

  const { data: booking, error: bookingErr } = await supabase
    .from('bookings').select('*')
    .eq('lead_id', leadId).eq('agent_id', agentId)
    .in('status', ['scheduled', 'reminded'])
    .gt('datetime', new Date().toISOString())
    .order('datetime', { ascending: true }).limit(1).maybeSingle();

  if (bookingErr || !booking || !booking.provider_booking_id) {
    return NextResponse.json({ error: 'Nenhum agendamento ativo encontrado para cancelar.' }, { status: 404 });
  }

  try {
    if (config.provider === 'calcom') {
      await cancelCalcom(config, booking.provider_booking_id);
    } else {
      await cancelGoogle(config, booking.provider_booking_id);
    }

    await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);

    return NextResponse.json({ confirmed: true, message: 'Agendamento cancelado com sucesso.' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
