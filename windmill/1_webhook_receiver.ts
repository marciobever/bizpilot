// Windmill Script 1: Webhook Receiver (Evolution API + Meta)
// Runtime: Bun
// Recebe webhook, transcreve áudio (OpenAI Whisper), faz OCR de imagens/documentos
// (OpenAI Vision/Responses) e enfileira texto (debounce anti-encavalamento).

// Janela de debounce (ms): tempo de espera por mensagens encavaladas do mesmo
// contato antes de processar. Menor = resposta mais rápida e workers liberados
// antes; maior = agrupa melhor quem digita em blocos. Ajuste aqui.
const DEBOUNCE_MS = 5000;

// ─── Helpers de mídia (OCR / leitura de imagens e documentos) ────────────────

// evolution-go: quando WEBHOOK_FILES=true (padrão), o base64 já vem no payload.
// Caso contrário, usa /message/downloadimage com os metadados de criptografia da mensagem.
// msgObj = o objeto de tipo (ex: audioMessage, imageMessage, documentMessage).
async function downloadMedia(
  msgObj: any, EVOLUTION_API_URL: string, instanceToken: string
): Promise<string | null> {
  // Caminho rápido: base64 já está no payload (WEBHOOK_FILES=true)
  if (msgObj?.base64) return msgObj.base64;

  // Sem metadados suficientes para download
  if (!msgObj?.url && !msgObj?.directPath) return null;

  try {
    const res = await fetch(`${EVOLUTION_API_URL}/message/downloadimage`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: instanceToken },
      body: JSON.stringify({
        url: msgObj.url,
        directPath: msgObj.directPath,
        mediaKey: msgObj.mediaKey,
        fileEncSHA256: msgObj.fileEncSHA256,
        fileSHA256: msgObj.fileSHA256,
        fileLength: msgObj.fileLength,
        mimetype: msgObj.mimetype,
      }),
    });
    if (!res.ok) {
      console.error(`downloadMedia: ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return null;
    }
    const data = await res.json();
    return data?.image || data?.base64 || data?.data?.base64 || null;
  } catch (e: any) {
    console.error(`downloadMedia: ${e.message}`);
    return null;
  }
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
    if (!res.ok) {
      console.error(`analyzeImage: OpenAI ${res.status}: ${await res.text()}`);
      return "";
    }
    const { choices } = await res.json();
    return choices?.[0]?.message?.content?.trim() || "";
  } catch (e: any) {
    console.error(`analyzeImage: erro: ${e.message}`);
    return "";
  }
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
    if (!upRes.ok) {
      console.error(`analyzePdf: OpenAI files ${upRes.status}: ${await upRes.text()}`);
      return "";
    }
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
    if (!res.ok) {
      console.error(`analyzePdf: OpenAI responses ${res.status}: ${await res.text()}`);
      return "";
    }
    const result = await res.json();
    if (typeof result.output_text === "string") return result.output_text.trim();
    const textPart = result.output?.flatMap((o: any) => o.content || []).find((c: any) => c.type === "output_text");
    return (textPart?.text || "").trim();
  } catch (e: any) {
    console.error(`analyzePdf: erro: ${e.message}`);
    return "";
  }
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
  // evolution-go envia "MESSAGE"; Baileys enviava "messages.upsert"
  if (eventName !== "messages.upsert" && eventName !== "message") {
    return { process: false, reason: `Evento ignorado (recebido: ${payload.event}).` };
  }

  // evolution-go usa instanceName; Baileys usava instance
  const instanceName = payload.instanceName || payload.instance || "";
  const instanceToken: string = payload.instanceToken || "";

  // evolution-go (whatsmeow): metadados em data.Info (PascalCase), corpo em data.Message
  // Baileys (Node.js):        metadados em data.key (camelCase), corpo em data.message
  const info = payload.data?.Info || payload.data?.key || {};

  // Chat pode ser string "55119@s.whatsapp.net" ou objeto whatsmeow {User, Server, ...}
  const chatJid = info.Chat ?? info.remoteJid ?? "";
  const remoteJid: string = typeof chatJid === "string"
    ? chatJid
    : (chatJid?.User && chatJid?.Server ? `${chatJid.User}@${chatJid.Server}` : "");
  const fromMe: boolean = info.IsFromMe ?? info.fromMe ?? false;
  const messageId: string = info.ID || info.id || "";
  const senderName: string = info.PushName || payload.data?.pushName || "Usuário";

  if (fromMe) return { process: false, reason: "Mensagem ignorada (fromMe: true)." };
  if (!remoteJid) return { process: false, reason: `remoteJid não encontrado. info keys: ${JSON.stringify(Object.keys(info))}` };

  // Documentos enviados com legenda chegam encapsulados em documentWithCaptionMessage.
  // evolution-go: corpo em data.Message; Baileys: data.message
  const rawMsg = payload.data?.Message || payload.data?.message || {};
  const msg = rawMsg?.documentWithCaptionMessage?.message || rawMsg || {};
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
    // Áudio: transcreve imediatamente via Whisper (sem fila).
    // Evolution: baixa via getBase64FromMediaMessage. Meta: o webhook da Cloud API
    // já entrega o áudio em base64 (msg.audioMessage.base64).
    wasAudio = true;
    try {
      const audioObj = msg.audioMessage || msg.pttMessage || {};
      let b64: string | null = await downloadMedia(audioObj, EVOLUTION_API_URL, instanceToken || EVOLUTION_API_KEY);
      let mimetype = audioObj.mimetype || "audio/ogg";
      if (b64) {
        const buf = Buffer.from(b64, "base64");
        const blob = new Blob([buf], { type: mimetype });
        const form = new FormData();
        form.append("file", blob, mimetype.includes("ogg") ? "audio.ogg" : "audio.mp4");
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
    } catch (e) { console.error("Transcrição falhou:", e); }
    if (!incomingMessage) {
      incomingMessage = "[Áudio recebido — transcrição indisponível. Peça para digitar.]";
      messageType = "audio";
    }

  } else if (msg.imageMessage) {
    const caption = msg.imageMessage.caption || "";
    incomingMessage = caption || "[Cliente enviou uma imagem]";
    messageType = "image";
    if (OPENAI_API_KEY) {
      // Meta: base64 já vem no payload. Evolution-go: base64 no payload (WEBHOOK_FILES=true) ou download.
      const base64 = await downloadMedia(msg.imageMessage, EVOLUTION_API_URL, instanceToken || EVOLUTION_API_KEY);
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
    if (OPENAI_API_KEY) {
      // Meta: base64 já vem no payload. Evolution-go: base64 no payload (WEBHOOK_FILES=true) ou download.
      const base64 = await downloadMedia(msg.documentMessage, EVOLUTION_API_URL, instanceToken || EVOLUTION_API_KEY);
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

  // ─── Fila de mensagens: apenas texto (debounce, anti-encavalamento) ────────
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

      // Janela de debounce: aguarda mensagens subsequentes do mesmo contato.
      await new Promise((r) => setTimeout(r, DEBOUNCE_MS));

      // Escopo da fila: (remote_jid + instance_name). O mesmo número pode falar
      // com vários agentes (instâncias) ao mesmo tempo; cada par tem sua própria
      // janela de debounce, senão as mensagens de agentes diferentes se misturam.
      const scope = `remote_jid=eq.${encodeURIComponent(remoteJid)}&instance_name=eq.${encodeURIComponent(instanceName)}`;

      const qRes = await fetch(
        `${SUPABASE_URL}/rest/v1/message_queue?${scope}&order=id.asc&select=message_id,message`,
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
        `${SUPABASE_URL}/rest/v1/message_queue?${scope}`,
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
    instanceToken,
    remoteJid,
    senderName,
    incomingMessage,
    messageType,
    wasAudio,
    messageId,
    provider: payload.provider || "evolution",
    metaPhoneNumberId: payload.metaPhoneNumberId || null,
  };
}
