import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getServiceSupabase, getMetaConfig, graphUrl } from '../utils';

// Valida a assinatura X-Hub-Signature-256 que a Meta envia em todo POST.
// Só é aplicada se META_APP_SECRET estiver configurado. Modelo BYO-app:
// guarde o app secret por agente e valide contra ele.
function verifyMetaSignature(rawBody: string, signatureHeader: string | null): boolean {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return true; // sem secret configurado, não há como validar
  if (!signatureHeader) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Busca o access token salvo na config do agente cujo canal Meta usa este phone_number_id.
async function resolveAccessToken(phoneNumberId: string | undefined): Promise<string | null> {
  if (!phoneNumberId) return null;
  try {
    const supabase = getServiceSupabase();
    const { data: agent } = await supabase
      .from('agents')
      .select('config')
      .eq('config->whatsapp->meta->>phoneNumberId', phoneNumberId)
      .limit(1)
      .maybeSingle();
    return getMetaConfig(agent?.config).accessToken || null;
  } catch (e) {
    console.error('[META WEBHOOK] Erro ao resolver access token:', e);
    return null;
  }
}

// Baixa uma mídia (imagem, áudio, documento) recebida via WhatsApp Cloud API.
// A Meta entrega apenas um "media id" — é preciso resolver a URL temporária
// e então baixar o conteúdo, ambos autenticados com o access token do agente.
async function downloadMetaMedia(mediaId: string, accessToken: string): Promise<{ base64: string; mimetype: string } | null> {
  try {
    const metaRes = await fetch(graphUrl(mediaId), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaRes.ok) {
      console.error(`[META WEBHOOK] Falha ao resolver mídia ${mediaId}: ${await metaRes.text()}`);
      return null;
    }
    const { url, mime_type } = await metaRes.json();
    if (!url) return null;

    const fileRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!fileRes.ok) {
      console.error(`[META WEBHOOK] Falha ao baixar mídia ${mediaId}: ${fileRes.status}`);
      return null;
    }
    const buf = Buffer.from(await fileRes.arrayBuffer());
    return { base64: buf.toString('base64'), mimetype: mime_type || 'application/octet-stream' };
  } catch (e: any) {
    console.error(`[META WEBHOOK] Erro ao baixar mídia ${mediaId}:`, e.message);
    return null;
  }
}

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
    const rawBody = await req.text();

    if (!verifyMetaSignature(rawBody, req.headers.get('x-hub-signature-256'))) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const payload = JSON.parse(rawBody);
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
          const from = msg?.from; // número do remetente, só dígitos
          if (!from) continue;

          const msgType = msg?.type;
          let message: any = null;

          if (msgType === 'text' || msg?.text?.body) {
            message = { conversation: msg.text.body };
          } else if (msg?.button?.text) {
            message = { conversation: msg.button.text };
          } else if (msg?.interactive?.list_reply?.title) {
            message = { conversation: msg.interactive.list_reply.title };
          } else if (msg?.interactive?.button_reply?.title) {
            message = { conversation: msg.interactive.button_reply.title };
          } else if (msgType === 'audio' && msg?.audio?.id) {
            const accessToken = await resolveAccessToken(phoneNumberId);
            const media = accessToken ? await downloadMetaMedia(msg.audio.id, accessToken) : null;
            message = media
              ? { audioMessage: { base64: media.base64, mimetype: media.mimetype } }
              : { conversation: '[Áudio recebido — transcrição indisponível. Peça para digitar.]' };
          } else if (msgType === 'image' && msg?.image?.id) {
            const accessToken = await resolveAccessToken(phoneNumberId);
            const media = accessToken ? await downloadMetaMedia(msg.image.id, accessToken) : null;
            message = media
              ? { imageMessage: { caption: msg.image.caption || '', mimetype: media.mimetype, base64: media.base64 } }
              : { conversation: '[Cliente enviou uma imagem]' };
          } else if (msgType === 'document' && msg?.document?.id) {
            const accessToken = await resolveAccessToken(phoneNumberId);
            const media = accessToken ? await downloadMetaMedia(msg.document.id, accessToken) : null;
            message = media
              ? { documentMessage: { caption: msg.document.caption || '', fileName: msg.document.filename || 'arquivo', mimetype: media.mimetype, base64: media.base64 } }
              : { conversation: `[Cliente enviou um documento: ${msg.document.filename || 'arquivo'}]` };
          } else if (msgType === 'video') {
            message = { conversation: msg.video?.caption || '[Cliente enviou um vídeo]' };
          } else if (msgType === 'sticker') {
            message = { conversation: '[Cliente enviou um sticker]' };
          } else if (msgType === 'location' && msg?.location) {
            message = { conversation: `[Cliente compartilhou localização: ${msg.location.latitude}, ${msg.location.longitude}]` };
          }

          if (!message) continue;

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
              message,
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
