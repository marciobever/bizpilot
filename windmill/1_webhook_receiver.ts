// Windmill Script 1: Webhook Receiver (Evolution API + Meta)
// Runtime: Bun
// Recebe webhook, transcreve áudio (OpenAI Whisper), faz OCR de imagens/documentos
// (OpenAI Vision/Responses) e enfileira texto (debounce 8s anti-encavalamento).

// ─── Helpers de mídia (OCR / leitura de imagens e documentos) ────────────────

async function downloadMedia(
  messageId: string, EVOLUTION_API_URL: string, EVOLUTION_API_KEY: string, instanceName: string
): Promise<string | null> {
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({ message: { key: { id: messageId } } }),
    });
    if (!res.ok) return null;
    const media = await res.json();
    return media?.base64 || media?.data?.base64 || null;
  } catch { return null; }
}

// Lê o conteúdo de uma imagem (comprovantes, documentos fotografados, prints, fotos, etc).
async function analyzeImage(base64: string, mimetype: string, caption: string, OPENAI_API_KEY: string): Promise<string> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Você analisa imagens enviadas por clientes via WhatsApp (comprovantes de pagamento, documentos fotografados, prints de tela, fotos de imóveis/produtos, etc). Transcreva todo texto visível (OCR) e descreva objetivamente as informações relevantes (valores, datas, nomes, itens, condições). Seja conciso e direto.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: caption ? `Legenda enviada pelo cliente: "${caption}"` : "Analise esta imagem e transcreva as informações relevantes." },
              { type: "image_url", image_url: { url: `data:${mimetype || "image/jpeg"};base64,${base64}` } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return "";
    const { choices } = await res.json();
    return choices?.[0]?.message?.content?.trim() || "";
  } catch { return ""; }
}

// Lê o conteúdo de um PDF (contratos, extratos, comprovantes em PDF, etc).
async function analyzePdf(base64: string, fileName: string, OPENAI_API_KEY: string): Promise<string> {
  try {
    const buf = Buffer.from(base64, "base64");
    const form = new FormData();
    form.append("file", new Blob([buf], { type: "application/pdf" }), fileName || "documento.pdf");
    form.append("purpose", "user_data");
    const upRes = await fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: form,
    });
    if (!upRes.ok) return "";
    const file = await upRes.json();

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: "Transcreva o conteúdo relevante deste documento (texto, tabelas, valores, datas) de forma resumida e organizada." },
            { type: "input_file", file_id: file.id },
          ],
        }],
      }),
    });
    if (!res.ok) return "";
    const result = await res.json();
    if (typeof result.output_text === "string") return result.output_text.trim();
    const textPart = result.output?.flatMap((o: any) => o.content || []).find((c: any) => c.type === "output_text");
    return (textPart?.text || "").trim();
  } catch { return ""; }
}

export async function main(payload: any) {
  // Busca variáveis do Windmill internamente — sem parâmetros novos no flow.
  let EVOLUTION_API_URL = "";
  let EVOLUTION_API_KEY = "";
  let OPENAI_API_KEY = "";
  let SUPABASE_URL = "";
  let SUPABASE_SERVICE_KEY = "";
  try {
    const { getVariable } = await import("windmill-client");
    const tryGet = async (...paths: string[]) => {
      for (const p of paths) { try { const v = await getVariable(p); if (v) return v; } catch {} }
      return "";
    };
    EVOLUTION_API_URL   = await tryGet("u/bevervansomarcio/synapseai/EVOLUTION_API_URL",   "u/bevervansomarcio/EVOLUTION_API_URL");
    EVOLUTION_API_KEY   = await tryGet("u/bevervansomarcio/synapseai/EVOLUTION_API_KEY",   "u/bevervansomarcio/EVOLUTION_API_KEY");
    OPENAI_API_KEY      = await tryGet("u/bevervansomarcio/OPENAI_API_KEY",                "u/bevervansomarcio/synapseai/OPENAI_API_KEY");
    SUPABASE_URL        = await tryGet("u/bevervansomarcio/synapseai/SUPABASE_URL",        "u/bevervansomarcio/SUPABASE_URL");
    SUPABASE_SERVICE_KEY= await tryGet("u/bevervansomarcio/synapseai/SUPABASE_SERVICE_ROLE_KEY", "u/bevervansomarcio/SUPABASE_SERVICE_ROLE_KEY");
  } catch (e) { console.warn("windmill-client indisponível:", e); }

  const eventName = (payload.event || "").toLowerCase();
  if (eventName !== "messages.upsert") {
    return { process: false, reason: `Evento ignorado (recebido: ${payload.event}).` };
  }

  const instanceName = payload.instance;
  const remoteJid = payload.data?.key?.remoteJid;
  const fromMe = payload.data?.key?.fromMe;
  const messageId = payload.data?.key?.id;
  const senderName = payload.data?.pushName || "Usuário";

  if (fromMe) return { process: false, reason: "Mensagem ignorada (fromMe: true)." };
  if (!remoteJid) return { process: false, reason: "remoteJid não encontrado no payload." };

  const msg = payload.data?.message || {};
  let incomingMessage = "";
  let messageType = "text";
  let wasAudio = false;

  // ─── Extração de mensagem por tipo ──────────────────────────────────────────

  if (msg.conversation) {
    incomingMessage = msg.conversation;

  } else if (msg.extendedTextMessage?.text) {
    incomingMessage = msg.extendedTextMessage.text;

  } else if (msg.buttonsResponseMessage) {
    incomingMessage = msg.buttonsResponseMessage.selectedDisplayText || msg.buttonsResponseMessage.selectedButtonId || "";
    messageType = "button_reply";

  } else if (msg.listResponseMessage) {
    incomingMessage = msg.listResponseMessage.title || msg.listResponseMessage.singleSelectReply?.selectedRowId || "";
    messageType = "list_reply";

  } else if (msg.templateButtonReplyMessage) {
    incomingMessage = msg.templateButtonReplyMessage.selectedDisplayText || msg.templateButtonReplyMessage.selectedId || "";
    messageType = "template_reply";

  } else if (msg.interactiveResponseMessage) {
    const body = msg.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
    if (body) {
      try { const p = JSON.parse(body); incomingMessage = p.display_text || p.id || ""; } catch { incomingMessage = body; }
    }
    messageType = "interactive_reply";

  } else if (msg.audioMessage || msg.pttMessage) {
    // Áudio: transcreve imediatamente via Evolution API + Whisper (sem fila)
    wasAudio = true;
    if (messageId) {
      try {
        const mediaRes = await fetch(
          `${EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${instanceName}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
            body: JSON.stringify({ message: { key: { id: messageId } }, convertToMp4: true }),
          }
        );
        if (mediaRes.ok) {
          const media = await mediaRes.json();
          const b64 = media?.base64 || media?.data?.base64;
          if (b64) {
            const buf = Buffer.from(b64, "base64");
            const blob = new Blob([buf], { type: "audio/mp4" });
            const form = new FormData();
            form.append("file", blob, "audio.mp4");
            form.append("model", "whisper-1");
            form.append("language", "pt");
            const wRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
              method: "POST",
              headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
              body: form,
            });
            if (wRes.ok) {
              const { text } = await wRes.json();
              if (text?.trim()) { incomingMessage = text.trim(); messageType = "audio_transcribed"; }
            }
          }
        }
      } catch (e) { console.error("Transcrição falhou:", e); }
    }
    if (!incomingMessage) {
      incomingMessage = "[Áudio recebido — transcrição indisponível. Peça para digitar.]";
      messageType = "audio";
    }

  } else if (msg.imageMessage) {
    const caption = msg.imageMessage.caption || "";
    incomingMessage = caption || "[Cliente enviou uma imagem]";
    messageType = "image";
    if (messageId && OPENAI_API_KEY) {
      const base64 = await downloadMedia(messageId, EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName);
      if (base64) {
        const analysis = await analyzeImage(base64, msg.imageMessage.mimetype, caption, OPENAI_API_KEY);
        if (analysis) {
          incomingMessage = `[Cliente enviou uma imagem${caption ? ` com a legenda: "${caption}"` : ""}]\nConteúdo identificado na imagem:\n${analysis}`;
        }
      }
    }

  } else if (msg.videoMessage) {
    incomingMessage = msg.videoMessage.caption || "[Cliente enviou um vídeo]";
    messageType = "video";

  } else if (msg.documentMessage) {
    const caption = msg.documentMessage.caption || "";
    const fileName = msg.documentMessage.fileName || "arquivo";
    const mimetype = msg.documentMessage.mimetype || "";
    incomingMessage = caption || `[Cliente enviou um documento: ${fileName}]`;
    messageType = "document";
    if (messageId && OPENAI_API_KEY) {
      const base64 = await downloadMedia(messageId, EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName);
      if (base64) {
        let analysis = "";
        if (mimetype.startsWith("image/")) analysis = await analyzeImage(base64, mimetype, caption, OPENAI_API_KEY);
        else if (mimetype === "application/pdf") analysis = await analyzePdf(base64, fileName, OPENAI_API_KEY);
        if (analysis) {
          incomingMessage = `[Cliente enviou o documento "${fileName}"${caption ? ` com a legenda: "${caption}"` : ""}]\nConteúdo identificado no documento:\n${analysis}`;
        }
      }
    }

  } else if (msg.stickerMessage) {
    incomingMessage = "[Cliente enviou um sticker]"; messageType = "sticker";

  } else if (msg.locationMessage) {
    incomingMessage = `[Cliente compartilhou localização: ${msg.locationMessage.degreesLatitude}, ${msg.locationMessage.degreesLongitude}]`;
    messageType = "location";

  } else if (msg.contactMessage) {
    incomingMessage = `[Cliente enviou um contato: ${msg.contactMessage.displayName || "desconhecido"}]`;
    messageType = "contact";
  }

  if (!incomingMessage) {
    return { process: false, reason: `Tipo não suportado (campos: ${Object.keys(msg).join(", ") || "nenhum"}).` };
  }

  // ─── Fila de mensagens: apenas texto (debounce 8s, anti-encavalamento) ────────
  // Áudio vai direto: já tem latência de transcrição e usuários raramente encavalham áudios.

  if (!wasAudio && messageId && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    const h = {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    };
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/message_queue`, {
        method: "POST",
        headers: { ...h, Prefer: "return=minimal" },
        body: JSON.stringify({
          remote_jid: remoteJid,
          instance_name: instanceName,
          message_id: messageId,
          message: incomingMessage,
        }),
      });

      // Janela de debounce: aguarda mensagens subsequentes do mesmo contato
      await new Promise((r) => setTimeout(r, 8000));

      const qRes = await fetch(
        `${SUPABASE_URL}/rest/v1/message_queue?remote_jid=eq.${encodeURIComponent(remoteJid)}&order=id.asc&select=message_id,message`,
        { headers: h }
      );
      const queue: { message_id: string; message: string }[] = await qRes.json().catch(() => []);

      // Anti-encavalamento: se não somos a última mensagem, para
      if (!queue.length || queue[queue.length - 1].message_id !== messageId) {
        return { process: false, reason: "Mensagem encavalada — a mais recente está sendo processada." };
      }

      // Concatena todas as mensagens pendentes e limpa a fila
      incomingMessage = queue.map((q) => q.message).join("\n");
      await fetch(
        `${SUPABASE_URL}/rest/v1/message_queue?remote_jid=eq.${encodeURIComponent(remoteJid)}`,
        { method: "DELETE", headers: h }
      );
    } catch (e) {
      // Fila indisponível: processa sem debounce (graceful degradation)
      console.error("Fila de mensagens indisponível, processando sem debounce:", e);
    }
  }

  return {
    process: true,
    instanceName,
    remoteJid,
    senderName,
    incomingMessage,
    messageType,
    wasAudio,
    provider: payload.provider || "evolution",
    metaPhoneNumberId: payload.metaPhoneNumberId || null,
  };
}
