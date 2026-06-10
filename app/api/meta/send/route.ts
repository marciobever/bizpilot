import { NextResponse } from 'next/server';
import { graphUrl, getServiceSupabase, getMetaConfig } from '../utils';

// Envia uma mensagem de texto via WhatsApp Cloud API (Meta Oficial).
//
// Aceita duas formas:
//  1) Passando phoneNumberId + accessToken diretamente.
//  2) Passando agentId — busca as credenciais salvas na config do agente
//     (usado pela tela de Conversas no atendimento humano).
//
// Observação importante: a Meta só permite mensagens de texto livre dentro
// da janela de atendimento de 24h após a última mensagem do cliente. Fora
// disso, é obrigatório usar um template aprovado.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, text } = body;
    let { phoneNumberId, accessToken } = body;

    if (!to || !text) {
      return NextResponse.json(
        { success: false, error: 'Campos "to" e "text" são obrigatórios.' },
        { status: 400 }
      );
    }

    // Resolve credenciais a partir do agente, se necessário.
    if ((!phoneNumberId || !accessToken) && body.agentId) {
      const supabase = getServiceSupabase();
      const { data: agent } = await supabase
        .from('agents')
        .select('config')
        .eq('id', body.agentId)
        .maybeSingle();
      const meta = getMetaConfig(agent?.config);
      phoneNumberId = phoneNumberId || meta.phoneNumberId;
      accessToken = accessToken || meta.accessToken;
    }

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { success: false, error: 'Credenciais da Meta não encontradas para este agente.' },
        { status: 400 }
      );
    }

    // A Meta espera o número apenas com dígitos (sem @s.whatsapp.net).
    const recipient = String(to).replace('@s.whatsapp.net', '').replace(/\D/g, '');

    const res = await fetch(graphUrl(`${phoneNumberId}/messages`), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'text',
        text: { body: text },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data?.error?.message || 'Erro ao enviar pela Meta.', details: data },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, result: data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
