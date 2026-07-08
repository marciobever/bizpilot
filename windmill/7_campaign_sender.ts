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
  APP_BASE_URL: string,
  INTERNAL_API_SECRET: string,
  EVOLUTION_API_URL: string
) {
  const runRes = await fetch(`${APP_BASE_URL}/api/campaigns/${campaignId}/run`, {
    headers: { "x-internal-secret": INTERNAL_API_SECRET },
  });
  if (!runRes.ok) {
    console.error("[campaign_sender] erro ao buscar campanha:", await runRes.text());
    return { success: false };
  }
  const { message, instanceToken, recipients } = await runRes.json();

  if (!instanceToken || !Array.isArray(recipients) || recipients.length === 0) {
    console.warn("[campaign_sender] nada para enviar (sem instância ou sem destinatários).");
    await reportProgress(APP_BASE_URL, INTERNAL_API_SECRET, campaignId, { finished: true });
    return { success: true, sent: 0 };
  }

  const headers = { "Content-Type": "application/json", apikey: instanceToken };
  let sent = 0, failed = 0;

  for (const r of recipients) {
    const number = `${r.phone}@s.whatsapp.net`;
    try {
      const res = await fetch(`${EVOLUTION_API_URL}/send/text`, {
        method: "POST", headers,
        body: JSON.stringify({ number, text: message, linkPreview: false }),
      });
      if (!res.ok) throw new Error(await res.text());
      sent++;
      await reportProgress(APP_BASE_URL, INTERNAL_API_SECRET, campaignId, { recipientId: r.id, status: "sent" });
    } catch (e: any) {
      failed++;
      await reportProgress(APP_BASE_URL, INTERNAL_API_SECRET, campaignId, {
        recipientId: r.id, status: "failed", error: String(e?.message || e).slice(0, 300),
      });
    }
    // Espaçamento entre mensagens — evita rajada que derrube a instância.
    await sleep(randomDelay(4000, 9000));
  }

  await reportProgress(APP_BASE_URL, INTERNAL_API_SECRET, campaignId, { finished: true });
  return { success: true, sent, failed };
}
