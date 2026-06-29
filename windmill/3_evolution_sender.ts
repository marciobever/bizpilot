// Windmill Script 3: Evolution API Sender
// Runtime: Bun
// Envia a resposta gerada pela IA de volta ao cliente no WhatsApp.
// Suporta: texto simples, áudio (TTS), botões interativos e listas.

// ─── Formatação WhatsApp ──────────────────────────────────────────────────────
// Converte markdown padrão para a sintaxe do WhatsApp.
// WhatsApp: *negrito*, _itálico_ — NÃO suporta **negrito** nem # títulos.
function formatForWhatsApp(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/gs, '*$1*')    // ***x*** → *x*
    .replace(/\*\*(.+?)\*\*/gs, '*$1*')         // **x** → *x*
    .replace(/^#{1,6}\s+(.+)$/gm, '*$1*')       // # Título → *Título*
    .replace(/^[ \t]*[•●▪○]\s*/gm, '- ')        // bullets estranhos → "- "
    .replace(/\n{3,}/g, '\n\n')                 // colapsa 3+ quebras de linha em 2
    .trim();
}

// ─── Helpers de parsing ───────────────────────────────────────────────────────

// Detecta e extrai marcações [[BOTOES: ...]], [[LISTA: ...]] e [[IMAGEM: ...]] do texto do modelo.
// Retorna { textBody, buttons, list, imageUrl } onde textBody é o texto sem as marcações.
function parseInteractive(message: string): {
  textBody: string;
  buttons: string[] | null;
  list: { title: string; sections: { title: string; rows: string[] }[] } | null;
  imageUrl: string | null;
} {
  let textBody = message;
  let buttons: string[] | null = null;
  let list: { title: string; sections: { title: string; rows: string[] }[] } | null = null;
  let imageUrl: string | null = null;

  // [[IMAGEM: URL]] — foto de destaque a enviar junto com a mensagem.
  const imgMatch = message.match(/\[\[IMAGEM:\s*(\S+?)\s*\]\]/s);
  if (imgMatch) {
    imageUrl = imgMatch[1];
    textBody = textBody.replace(imgMatch[0], "").trim();
  }

  // [[BOTOES: Opção 1 | Opção 2 | Opção 3]]
  const btnMatch = textBody.match(/\[\[BOTOES:\s*(.+?)\]\]/s);
  if (btnMatch) {
    buttons = btnMatch[1].split("|").map((b) => b.trim()).filter(Boolean).slice(0, 3);
    textBody = textBody.replace(btnMatch[0], "").trim();
  }

  // [[LISTA: Título da lista || Seção | Opção 1 | Opção 2 || Seção 2 | Opção 3]]
  const listMatch = textBody.match(/\[\[LISTA:\s*(.+?)\]\]/s);
  if (listMatch) {
    const parts = listMatch[1].split("||").map((p) => p.trim());
    const listTitle = parts[0] || "Opções";
    const sections = parts.slice(1).map((section) => {
      const items = section.split("|").map((i) => i.trim()).filter(Boolean);
      return { title: items[0] || "Opções", rows: items.slice(1) };
    }).filter((s) => s.rows.length > 0);
    if (sections.length > 0) {
      list = { title: listTitle, sections };
      textBody = textBody.replace(listMatch[0], "").trim();
    }
  }

  return { textBody, buttons, list, imageUrl };
}

// ─── Envio Meta Oficial (WhatsApp Cloud API) ─────────────────────────────────

async function sendMeta(
  phoneNumberId: string,
  accessToken: string,
  recipient: string,
  textBody: string,
  buttons: string[] | null,
  list: { title: string; sections: { title: string; rows: string[] }[] } | null,
  imageUrl?: string | null,
  fileUrl?: string | null,
  fileName?: string | null
): Promise<any> {
  const base = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  let payload: any;

  if (fileUrl) {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "document",
      document: { link: fileUrl, filename: fileName || "arquivo", caption: textBody },
    };
  } else if (imageUrl) {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "image",
      image: { link: imageUrl, caption: textBody },
    };
  } else if (buttons && buttons.length > 0) {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: textBody },
        action: {
          buttons: buttons.map((b, i) => ({
            type: "reply",
            reply: { id: `btn_${i}`, title: b.substring(0, 20) },
          })),
        },
      },
    };
  } else if (list) {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: textBody },
        action: {
          button: list.title.substring(0, 20),
          sections: list.sections.map((s) => ({
            title: s.title.substring(0, 24),
            rows: s.rows.map((r, i) => ({
              id: `row_${i}_${r.substring(0, 10)}`,
              title: r.substring(0, 24),
            })),
          })),
        },
      },
    };
  } else {
    payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient,
      type: "text",
      text: { body: textBody },
    };
  }

  const res = await fetch(base, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (res.ok) return data;

  // Se o envio da imagem/arquivo falhar, cai no fallback de texto.
  if (imageUrl || fileUrl) {
    console.error(`Meta API media error: ${JSON.stringify(data)}`);
    const textRes = await fetch(base, {
      method: "POST",
      headers,
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "text",
        text: { body: textBody },
      }),
    });
    const textData = await textRes.json().catch(() => null);
    if (!textRes.ok) throw new Error(`Meta API error: ${JSON.stringify(textData)}`);
    return textData;
  }

  throw new Error(`Meta API error: ${JSON.stringify(data)}`);
}

// ─── Envio Evolution Go (whatsmeow / QR Code) ────────────────────────────────
// evolution-go: token por instância (não global); sem instanceName na URL;
// body sem wrapper "options: {}", campos delay/presence na raiz.

async function sendEvolution(
  EVOLUTION_API_URL: string,
  instanceToken: string,
  remoteJid: string,
  textBody: string,
  buttons: string[] | null,
  list: { title: string; sections: { title: string; rows: string[] }[] } | null,
  audioBase64: string | null,
  typingDelay: number,
  imageUrl?: string | null,
  fileUrl?: string | null,
  fileName?: string | null
): Promise<any> {
  const headers = { "Content-Type": "application/json", apikey: instanceToken };

  // Arquivo/documento (ex: catálogo, tabela de preços) tem prioridade máxima.
  // Se o envio falhar, cai no fallback de texto simples abaixo.
  if (fileUrl) {
    const res = await fetch(`${EVOLUTION_API_URL}/send/media`, {
      method: "POST", headers,
      body: JSON.stringify({
        number: remoteJid,
        type: "document",
        url: fileUrl,
        caption: textBody,
        fileName: fileName || "arquivo",
        delay: typingDelay,
      }),
    });
    if (res.ok) return res.json().catch(() => null);
    console.error(`Evolution document error: ${await res.text()}`);
  }

  // Imagem (ex: QR Code do Pix) tem prioridade sobre os demais formatos.
  // Se o envio da mídia falhar, cai no fallback de texto simples abaixo
  // para garantir que o cliente receba ao menos o código Pix.
  if (imageUrl) {
    const res = await fetch(`${EVOLUTION_API_URL}/send/media`, {
      method: "POST", headers,
      body: JSON.stringify({
        number: remoteJid,
        type: "image",
        url: imageUrl,
        caption: textBody,
        delay: typingDelay,
      }),
    });
    if (res.ok) return res.json().catch(() => null);
    console.error(`Evolution media error: ${await res.text()}`);
  }

  // Áudio tem prioridade sobre interativos.
  if (audioBase64) {
    const res = await fetch(`${EVOLUTION_API_URL}/send/audio`, {
      method: "POST", headers,
      body: JSON.stringify({
        number: remoteJid,
        audio: audioBase64,
        delay: typingDelay,
      }),
    });
    if (!res.ok) throw new Error(`Evolution audio error: ${await res.text()}`);
    return res.json().catch(() => null);
  }

  if (buttons && buttons.length > 0) {
    const res = await fetch(`${EVOLUTION_API_URL}/send/button`, {
      method: "POST", headers,
      body: JSON.stringify({
        number: remoteJid,
        title: "",
        description: textBody,
        footer: "",
        buttons: buttons.map((b, i) => ({ id: `${i}`, displayText: b.substring(0, 20), type: "reply" })),
        delay: typingDelay,
      }),
    });
    // Se a Evolution não suportar botões, cai no fallback de texto
    if (res.ok) return res.json().catch(() => null);
    console.error(`Evolution button error (fallback to text): ${await res.text()}`);
  }

  if (list) {
    const res = await fetch(`${EVOLUTION_API_URL}/send/list`, {
      method: "POST", headers,
      body: JSON.stringify({
        number: remoteJid,
        title: list.title,
        description: textBody,
        buttonText: "Ver opções",
        footer: "",
        sections: list.sections.map((s) => ({
          title: s.title,
          rows: s.rows.map((r, i) => ({ id: `row_${i}`, title: r, description: "" })),
        })),
        delay: typingDelay,
      }),
    });
    if (res.ok) return res.json().catch(() => null);
    console.error(`Evolution list error (fallback to text): ${await res.text()}`);
  }

  // Texto simples (fallback e caso padrão)
  // linkPreview: false evita o card grande de preview ocupando a tela,
  // especialmente quando a mensagem tem mais de um link (ex: vários imóveis).
  const res = await fetch(`${EVOLUTION_API_URL}/send/text`, {
    method: "POST", headers,
    body: JSON.stringify({
      number: remoteJid,
      text: textBody,
      linkPreview: false,
      delay: typingDelay,
    }),
  });
  if (!res.ok) throw new Error(`Evolution API error: ${await res.text()}`);
  return res.json().catch(() => null);
}

// ─── Reações (emoji em resposta à mensagem do cliente) ───────────────────────
// Best-effort: falha aqui nunca deve impedir o envio da mensagem principal.

async function sendReactionEvolution(
  EVOLUTION_API_URL: string, instanceToken: string,
  remoteJid: string, messageId: string, emoji: string
): Promise<void> {
  try {
    // evolution-go: POST /message/react com { id, number, reaction }
    await fetch(`${EVOLUTION_API_URL}/message/react`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: instanceToken },
      body: JSON.stringify({ id: messageId, number: remoteJid, reaction: emoji }),
    });
  } catch { /* reação é best-effort */ }
}

async function sendReactionMeta(
  phoneNumberId: string, accessToken: string, recipient: string, messageId: string, emoji: string
): Promise<void> {
  try {
    await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipient,
        type: "reaction",
        reaction: { message_id: messageId, emoji },
      }),
    });
  } catch { /* reação é best-effort */ }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function main(
  ai_data: any,
  EVOLUTION_API_URL: string,
  EVOLUTION_API_KEY: string
) {
  if (!ai_data || ai_data.send === false) {
    return { success: false, reason: ai_data?.reason || "Mensagem ignorada pelo fluxo." };
  }

  const { remoteJid, message, instanceName, audioBase64, imageUrl: dataImageUrl, fileUrl, fileName, messageId, reaction, typingSpeed } = ai_data;
  const channel = ai_data.channel || { provider: "evolution" };

  if (!message || typeof message !== "string") {
    return { success: false, reason: "Mensagem vazia ou inválida." };
  }

  const { textBody: rawBody, buttons, list, imageUrl: messageImageUrl } = parseInteractive(message);
  const textBody = formatForWhatsApp(rawBody);
  // imageUrl do ai_data (ex: QR Code do Pix) tem prioridade sobre [[IMAGEM: ...]] do texto.
  const imageUrl = dataImageUrl || messageImageUrl;

  // "Tempo de Digitação" configurável (slider 0–100 na UI do agente).
  // 0 = envio instantâneo; 40 ≈ 60ms/caractere (comportamento padrão anterior); 100 = mais lento.
  const speed = Math.min(Math.max(Number(typingSpeed ?? 40) || 0, 0), 100);
  const msPerChar = speed * 1.5;
  const typingDelay = msPerChar === 0 ? 0 : Math.min(Math.max(textBody.length * msPerChar, 800), 10000);

  // ── Meta Oficial ────────────────────────────────────────────────────────────
  if (channel.provider === "meta") {
    const { phoneNumberId, accessToken } = channel.meta || {};
    if (!phoneNumberId || !accessToken) {
      return { success: false, reason: "Credenciais da Meta ausentes no canal do agente." };
    }
    const recipient = String(remoteJid).replace("@s.whatsapp.net", "").replace(/\D/g, "");
    if (reaction && messageId) await sendReactionMeta(phoneNumberId, accessToken, recipient, messageId, reaction);
    const result = await sendMeta(phoneNumberId, accessToken, recipient, textBody, buttons, list, imageUrl || null, fileUrl || null, fileName || null);
    return {
      success: true, deliveredTo: recipient, provider: "meta",
      interactive: !!(buttons || list), metaResponse: result,
      agent: ai_data.agent || null, lead: ai_data.lead || null,
      conversation: ai_data.conversation || null, message: textBody,
    };
  }

  // ── Evolution Go ─────────────────────────────────────────────────────────────
  if (!remoteJid || !instanceName) {
    return { success: false, reason: "remoteJid ou instanceName ausente." };
  }

  // Token por instância (evolution-go). Fallback para a chave global só em dev.
  const instanceToken: string = channel.instanceToken || EVOLUTION_API_KEY || "";

  if (reaction && messageId) await sendReactionEvolution(EVOLUTION_API_URL, instanceToken, remoteJid, messageId, reaction);

  const result = await sendEvolution(
    EVOLUTION_API_URL, instanceToken,
    remoteJid, textBody, buttons, list, audioBase64 || null, typingDelay, imageUrl || null, fileUrl || null, fileName || null
  );

  return {
    success: true, deliveredTo: remoteJid, provider: "evolution",
    interactive: !!(buttons || list), delayApplied: typingDelay,
    evolutionResponse: result,
    agent: ai_data.agent || null, lead: ai_data.lead || null,
    conversation: ai_data.conversation || null, message: textBody,
  };
}
