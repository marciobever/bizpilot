import { NextResponse } from 'next/server';

// Valida as credenciais do provedor de calendário escolhido.
// Usado pelo botão "Salvar Conexão" da integração "Calendário / Agenda".
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider } = body;

    if (provider === 'calcom') {
      const { apiKey, eventTypeId } = body;
      if (!apiKey || !eventTypeId) {
        return NextResponse.json({ success: false, error: 'Informe a API Key e o Event Type ID.' }, { status: 400 });
      }
      const res = await fetch(`https://api.cal.com/v2/event-types/${eventTypeId}`, {
        headers: { Authorization: `Bearer ${apiKey}`, 'cal-api-version': '2024-06-14' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.status !== 'success') {
        return NextResponse.json({ success: false, error: data?.error?.message || 'API Key ou Event Type ID inválidos.' }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (provider === 'calendly') {
      const { apiToken, schedulingUrl } = body;
      if (!apiToken || !schedulingUrl) {
        return NextResponse.json({ success: false, error: 'Informe o token de acesso e o link de agendamento.' }, { status: 400 });
      }

      const meRes = await fetch('https://api.calendly.com/users/me', { headers: { Authorization: `Bearer ${apiToken}` } });
      const me = await meRes.json();
      if (!meRes.ok) return NextResponse.json({ success: false, error: me?.message || 'Personal Access Token inválido.' }, { status: 400 });

      const slug = schedulingUrl.trim().replace(/\/$/, '').split('/').pop();
      const typesRes = await fetch(`https://api.calendly.com/event_types?user=${encodeURIComponent(me.resource.uri)}`, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      const types = await typesRes.json();
      if (!typesRes.ok) return NextResponse.json({ success: false, error: 'Não foi possível listar seus tipos de evento.' }, { status: 400 });

      const match = types.collection?.find((t: any) => t.scheduling_url?.endsWith(`/${slug}`));
      if (!match) return NextResponse.json({ success: false, error: 'Não encontramos esse evento na sua conta Calendly. Confira o link colado.' }, { status: 400 });

      return NextResponse.json({ success: true, eventTypeUri: match.uri, userUri: me.resource.uri });
    }

    if (provider === 'google') {
      const { clientId, clientSecret } = body;
      if (!clientId || !clientSecret) {
        return NextResponse.json({ success: false, error: 'Informe o Client ID e o Client Secret.' }, { status: 400 });
      }
      // A validação real acontece na tela de consentimento do Google (próximo passo).
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Provedor não suportado.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
