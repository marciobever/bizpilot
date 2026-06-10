// Windmill Script 1: Webhook Receiver (Evolution API + Meta)
// Runtime: Bun
// Recebe webhook, transcreve áudio (OpenAI Whisper) e enfileira texto (debounce 8s anti-encavalamento).

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
    incomingMessage = msg.imageMessage.caption || "[Cliente enviou uma imagem]";
    messageType = "image";

  } else if (msg.videoMessage) {
    incomingMessage = msg.videoMessage.caption || "[Cliente enviou um vídeo]";
    messageType = "video";

  } else if (msg.documentMessage) {
    incomingMessage = msg.documentMessage.caption || `[Cliente enviou um documento: ${msg.documentMessage.fileName || "arquivo"}]`;
    messageType = "document";

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
