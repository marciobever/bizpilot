// Windmill Script 7: Campaign Sender
// Runtime: Bun
// Disparo em massa (addon_campaigns) via WhatsApp Evolution. Só Evolution:
// Meta Cloud API exige template pré-aprovado pra iniciar conversa fora da
// janela de 24h, então texto livre em massa não é permitido lá.
// Espaça os envios (4-9s aleatório) para reduzir risco de bloqueio da instância.

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(minMs: number, maxMs: number) {
  return minMs + Math.random() * (maxMs - minMs);
}

async function reportProgress(
  APP_BASE_URL: string, INTERNAL_API_SECRET: string, campaignId: string,
  body: Record<string, unknown>
) {
  try {
    await fetch(`${APP_BASE_URL}/api/campaigns/${campaignId}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-secret": INTERNAL_API_SECRET },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("[campaign_sender] falha ao reportar progresso:", e);
  }
}

export async function main(
  campaignId: string,
  APP_BASE_URL?: string,
  INTERNAL_API_SECRET?: string,
  EVOLUTION_API_URL?: string
) {
  // Mesmo padrão do reminder_cron: resolve pelas Windmill Variables se não
  // vier no payload do webhook (o trigger só manda { campaignId }).
  let appBaseUrl = APP_BASE_URL || process.env.APP_BASE_URL || '';
  let internalSecret = INTERNAL_API_SECRET || process.env.INTERNAL_API_SECRET || '';
  let evolutionApiUrl = EVOLUTION_API_URL || process.env.EVOLUTION_API_URL || '';
  if (!appBaseUrl || !internalSecret || !evolutionApiUrl) {
    try {
      const { getVariable } = await import('windmill-client');
      const tryGet = async (p: string) => { try { return (await getVariable(p)) || ''; } catch { return ''; } };
      if (!appBaseUrl) appBaseUrl = await tryGet('u/bevervansomarcio/bizpilot/APP_BASE_URL');
      if (!internalSecret) internalSecret = await tryGet('u/bevervansomarcio/bizpilot/INTERNAL_API_SECRET');
      if (!evolutionApiUrl) evolutionApiUrl = await tryGet('u/bevervansomarcio/bizpilot/EVOLUTION_API_URL');
    } catch (e: any) {
      console.warn('windmill-client:', e.message);
    }
  }
  if (!appBaseUrl || !internalSecret || !evolutionApiUrl) {
    return { success: false, reason: 'Variáveis APP_BASE_URL/INTERNAL_API_SECRET/EVOLUTION_API_URL ausentes.' };
  }

  const runRes = await fetch(`${appBaseUrl}/api/campaigns/${campaignId}/run`, {
    headers: { "x-internal-secret": internalSecret },
  });
  if (!runRes.ok) {
    console.error("[campaign_sender] erro ao buscar campanha:", await runRes.text());
    return { success: false };
  }
  const { message, imageUrl, instanceToken, recipients } = await runRes.json();

  if (!instanceToken || !Array.isArray(recipients) || recipients.length === 0) {
    console.warn("[campaign_sender] nada para enviar (sem instância ou sem destinatários).");
    await reportProgress(appBaseUrl, internalSecret, campaignId, { finished: true });
    return { success: true, sent: 0 };
  }

  const headers = { "Content-Type": "application/json", apikey: instanceToken };
  let sent = 0, failed = 0;

  for (const r of recipients) {
    const number = `${r.phone}@s.whatsapp.net`;
    try {
      let res: Response;
      if (imageUrl) {
        // Imagem com legenda; se a instância recusar mídia, cai pro texto simples.
        res = await fetch(`${evolutionApiUrl}/send/media`, {
          method: "POST", headers,
          body: JSON.stringify({ number, type: "image", url: imageUrl, caption: message }),
        });
        if (!res.ok) {
          console.error(`Evolution media error (fallback to text): ${await res.text()}`);
          res = await fetch(`${evolutionApiUrl}/send/text`, {
            method: "POST", headers,
            body: JSON.stringify({ number, text: message, linkPreview: false }),
          });
        }
      } else {
        res = await fetch(`${evolutionApiUrl}/send/text`, {
          method: "POST", headers,
          body: JSON.stringify({ number, text: message, linkPreview: false }),
        });
      }
      if (!res.ok) throw new Error(await res.text());
      sent++;
      await reportProgress(appBaseUrl, internalSecret, campaignId, { recipientId: r.id, status: "sent" });
    } catch (e: any) {
      failed++;
      await reportProgress(appBaseUrl, internalSecret, campaignId, {
        recipientId: r.id, status: "failed", error: String(e?.message || e).slice(0, 300),
      });
    }
    // Espaçamento entre mensagens — evita rajada que derrube a instância.
    await sleep(randomDelay(4000, 9000));
  }

  await reportProgress(appBaseUrl, internalSecret, campaignId, { finished: true });
  return { success: true, sent, failed };
}
