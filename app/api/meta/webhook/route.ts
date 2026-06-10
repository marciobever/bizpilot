import { NextResponse } from 'next/server';
import { getServiceSupabase } from '../utils';

// ============================================================================
// Webhook do WhatsApp Cloud API (Meta Oficial)
//
// O cliente cadastra esta URL no painel de Webhooks do app dele na Meta,
// junto com o "Verify Token" que ele definiu no Synapse.
//
//   GET  -> verificação do webhook (Meta envia hub.challenge na configuração).
//   POST -> recebimento das mensagens. Normalizamos o payload para o mesmo
//           formato que a Evolution entrega e repassamos para o fluxo do
//           Windmill, reaproveitando todo o pipeline de IA já existente.
// ============================================================================

// GET: a Meta valida a URL enviando hub.mode/hub.verify_token/hub.challenge.
// Conferimos se o verify_token bate com o de algum agente cadastrado.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode !== 'subscribe' || !token) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  try {
    const supabase = getServiceSupabase();
    const { data: agent } = await supabase
      .from('agents')
      .select('id')
      .eq('config->whatsapp->meta->>verifyToken', token)
      .limit(1)
      .maybeSingle();

    if (agent) {
      // A Meta espera o challenge cru (texto puro) com status 200.
      return new NextResponse(challenge || '', { status: 200 });
    }
  } catch (e) {
    console.error('[META WEBHOOK] Erro na verificação:', e);
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// POST: mensagens recebidas. Extraímos o essencial e repassamos ao Windmill.
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const WINDMILL_WEBHOOK_URL = process.env.WINDMILL_WEBHOOK_URL;

    const entries = payload?.entry || [];
    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const value = change?.value;
        const messages = value?.messages || [];
        if (messages.length === 0) continue; // ignora status de entrega/leitura

        const phoneNumberId = value?.metadata?.phone_number_id;
        const contactName = value?.contacts?.[0]?.profile?.name || 'Usuário';

        for (const msg of messages) {
          // Só tratamos texto por enquanto (texto livre e respostas).
          const incomingMessage =
            msg?.text?.body || msg?.button?.text || msg?.interactive?.list_reply?.title || '';
          const from = msg?.from; // número do remetente, só dígitos
          if (!incomingMessage || !from) continue;

          // Normaliza para o formato que o 1_webhook_receiver (Evolution) espera,
          // adicionando os campos extras que identificam o canal Meta.
          const normalized = {
            event: 'messages.upsert',
            instance: `meta_${phoneNumberId}`,
            provider: 'meta',
            metaPhoneNumberId: phoneNumberId,
            data: {
              key: { remoteJid: `${from}@s.whatsapp.net`, fromMe: false },
              pushName: contactName,
              message: { conversation: incomingMessage },
            },
          };

          if (WINDMILL_WEBHOOK_URL) {
            // Dispara sem travar a resposta para a Meta (que exige 200 rápido).
            fetch(WINDMILL_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(normalized),
            }).catch((e) => console.error('[META WEBHOOK] Falha ao repassar ao Windmill:', e));
          } else {
            console.warn('[META WEBHOOK] WINDMILL_WEBHOOK_URL não configurada.');
          }
        }
      }
    }

    // A Meta exige resposta 200 rápida, senão reenvia o evento.
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[META WEBHOOK] Erro:', error);
    // Ainda retornamos 200 para evitar retries em loop da Meta.
    return NextResponse.json({ received: true });
  }
}
