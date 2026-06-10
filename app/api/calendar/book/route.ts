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

async function bookCalcom(config: any, datetime: string, name: string, email: string, description: string) {
  if (!email) throw new Error('O Cal.com exige um e-mail do cliente para confirmar o agendamento. Peça o e-mail e tente novamente.');

  const res = await fetch('https://api.cal.com/v2/bookings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json', 'cal-api-version': '2026-02-25' },
    body: JSON.stringify({
      start: new Date(datetime).toISOString(),
      eventTypeId: Number(config.eventTypeId),
      attendee: { name, email, timeZone: 'America/Sao_Paulo', language: 'pt' },
      ...(description ? { bookingFieldsResponses: { notes: description } } : {}),
    }),
  });
  const data = await res.json();
  if (!res.ok || data?.status === 'error') throw new Error(data?.error?.message || 'Erro ao criar agendamento no Cal.com.');
  return { confirmed: true, message: `Agendamento confirmado para ${datetime}.`, providerBookingId: data?.data?.uid as string | undefined };
}

async function bookGoogle(config: any, datetime: string, name: string, email: string, description: string) {
  const accessToken = await getGoogleAccessToken(config.clientId, config.clientSecret, config.refreshToken);
  const calendarId = config.calendarId || 'primary';
  const start = new Date(datetime);
  const end = new Date(start.getTime() + 60 * 60 * 1000);

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: `Reunião com ${name}`,
      description: description || '',
      start: { dateTime: start.toISOString(), timeZone: 'America/Sao_Paulo' },
      end: { dateTime: end.toISOString(), timeZone: 'America/Sao_Paulo' },
      attendees: email ? [{ email }] : undefined,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Erro ao criar evento no Google Calendar.');
  return { confirmed: true, message: `Agendamento confirmado para ${datetime}.`, providerBookingId: data?.id as string | undefined };
}

async function bookCalendly(config: any) {
  const res = await fetch('https://api.calendly.com/scheduling_links', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ max_event_count: 1, owner: config.eventTypeUri, owner_type: 'EventType' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Erro ao gerar link de agendamento no Calendly.');
  return {
    confirmed: false,
    message: 'Envie este link para o cliente confirmar o melhor horário disponível.',
    url: data.resource?.booking_url as string,
  };
}

// POST /api/calendar/book { agentId, datetime, name, email, description, leadId, conversationId }
// Chamado pelo Windmill (tool `agendar_horario`).
export async function POST(req: NextRequest) {
  const { agentId, datetime, name, email, description, leadId, conversationId } = await req.json();
  if (!agentId || !name) return NextResponse.json({ error: 'agentId e name são obrigatórios' }, { status: 400 });

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
    let result: any;
    if (config.provider === 'calcom') {
      if (!datetime) return NextResponse.json({ error: 'datetime é obrigatório' }, { status: 400 });
      result = await bookCalcom(config, datetime, name, email || '', description || '');
    } else if (config.provider === 'google') {
      if (!datetime) return NextResponse.json({ error: 'datetime é obrigatório' }, { status: 400 });
      result = await bookGoogle(config, datetime, name, email || '', description || '');
    } else if (config.provider === 'calendly') {
      result = await bookCalendly(config);
    } else {
      return NextResponse.json({ error: 'Provedor de calendário não suportado.' }, { status: 400 });
    }

    // Salva o agendamento confirmado para permitir lembretes automáticos.
    if (result.confirmed && datetime) {
      await supabase.from('bookings').insert({
        user_id: agent.user_id,
        agent_id: agentId,
        lead_id: leadId || null,
        conversation_id: conversationId || null,
        provider: config.provider,
        datetime: new Date(datetime).toISOString(),
        customer_name: name,
        customer_email: email || null,
        description: description || null,
        provider_booking_id: result.providerBookingId || null,
      });
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
