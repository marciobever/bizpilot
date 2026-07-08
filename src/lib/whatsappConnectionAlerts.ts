import { getServiceSupabase } from "@/lib/api-auth";
import { sendSystemEmail } from "@/lib/systemMail";

export type EvolutionConnState = "open" | "down";

// Confirmado empiricamente (testado em produção): uma sessão caída de
// verdade (após desvincular o dispositivo) reporta Connected:true,
// LoggedIn:false — que /api/evolution/instances/.../connectionState mapeia
// pra 'connecting', não 'close'. O hook useWhatsappChannel.ts (usado na tela
// do agente, com o usuário olhando) trata 'connecting' como transitório e dá
// alguns retries rápidos antes de decidir. Aqui NÃO fazemos esse retry — as
// checagens já são espaçadas (webhook pontual, ou 1x por login) — então
// qualquer coisa que não seja 'open' já é motivo suficiente pra alertar.
export function normalizeEvolutionState(raw: string): EvolutionConnState {
  return (raw || "").toLowerCase() === "open" ? "open" : "down";
}

async function resolveUserEmail(userId: string): Promise<string | null> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

async function sendWhatsappDisconnectedEmail(params: {
  userId: string; agentId: string; agentName: string; instanceName: string;
}): Promise<void> {
  const email = await resolveUserEmail(params.userId);
  if (!email) throw new Error(`E-mail do usuário ${params.userId} não encontrado.`);

  const appBaseUrl = process.env.APP_BASE_URL || "https://www.bizpilot.com.br";
  const reconnectUrl = `${appBaseUrl}/app/agents/${params.agentId}?setup=whatsapp`;
  const subject = `⚠️ O WhatsApp do agente "${params.agentName}" desconectou`;
  const text = `O WhatsApp do agente "${params.agentName}" caiu e ele parou de responder mensagens.\n\nReconecte escaneando o QR Code de novo:\n${reconnectUrl}\n\n— BizPilot`;
  const html = `
    <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #d97706;">⚠️ WhatsApp desconectado</h2>
      <p>O WhatsApp do agente <strong>${params.agentName}</strong> caiu e ele <strong>parou de responder mensagens</strong>.</p>
      <p>Reconecte escaneando o QR Code de novo:</p>
      <p><a href="${reconnectUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Reconectar agora</a></p>
      <p style="color:#888;font-size:12px;margin-top:24px;">BizPilot — automação de atendimento no WhatsApp</p>
    </div>`;

  await sendSystemEmail(email, subject, text, html);
}

// Única fonte de verdade sobre "mudou de estado? precisa avisar?" — chamada
// tanto pelo webhook em tempo real (Evolution avisa via evento CONNECTION)
// quanto pela checagem de segurança no login. Reivindicação atômica do envio
// de e-mail (UPDATE ... WHERE notified_email_at IS NULL) evita duplicar
// aviso se as duas camadas observarem a queda quase ao mesmo tempo.
//
// IMPORTANTE: o "já sabíamos disso?" é decidido pela PRÓPRIA linha em
// whatsapp_connection_alerts, não por agents.config.whatsapp.evolution.connected.
// Esse campo também é escrito por um sistema mais antigo e independente
// (useWhatsappChannel.ts / syncEvolutionStatuses, na tela do agente) — se
// usássemos ele como sinal de "mudou desde a última vez", uma corrida entre
// os dois sistemas (o antigo grava connected:false primeiro) faria a gente
// achar que "nada mudou" e nunca alertar.
export async function recordConnectionObservation(params: {
  agentId: string; instanceName: string; normalizedState: EvolutionConnState;
}): Promise<{ changed: boolean; notified: boolean }> {
  const supabase = getServiceSupabase();
  const { data: agent } = await supabase.from("agents")
    .select("id, user_id, name, config").eq("id", params.agentId).maybeSingle();
  if (!agent) return { changed: false, notified: false };

  const cfg = (typeof agent.config === "string" ? JSON.parse(agent.config) : agent.config) || {};
  if (cfg.whatsapp?.provider !== "evolution") return { changed: false, notified: false };
  const wasConnected = cfg.whatsapp?.evolution?.connected === true;

  const { data: existingAlert } = await supabase.from("whatsapp_connection_alerts")
    .select("id, status").eq("agent_id", agent.id).maybeSingle();

  if (params.normalizedState === "open") {
    let changed = false;
    if (!wasConnected) {
      cfg.whatsapp.evolution.connected = true;
      await supabase.from("agents").update({ config: cfg, status: "online" }).eq("id", agent.id);
      changed = true;
    }
    if (existingAlert?.status === "down") {
      await supabase.from("whatsapp_connection_alerts")
        .update({ status: "resolved", resolved_at: new Date().toISOString() })
        .eq("agent_id", agent.id);
      changed = true;
    }
    return { changed, notified: false };
  }

  // down
  if (wasConnected) {
    cfg.whatsapp.evolution.connected = false;
    await supabase.from("agents").update({ config: cfg, status: "offline" }).eq("id", agent.id);
  }

  // Só alerta se o agente já esteve conectado de verdade em algum momento
  // (wasConnected agora, OU já existe uma linha de alerta anterior — prova
  // de que já conectou antes, mesmo que outro processo já tenha zerado o
  // agents.config nesse meio-tempo). Evita alertar instância que nunca
  // terminou de conectar (ainda esperando o QR ser escaneado).
  if (!wasConnected && !existingAlert) return { changed: false, notified: false };

  if (existingAlert?.status === "down") {
    // Já sabíamos — só atualiza o timestamp, não duplica e-mail.
    await supabase.from("whatsapp_connection_alerts")
      .update({ last_checked_at: new Date().toISOString() }).eq("agent_id", agent.id);
    return { changed: false, notified: false };
  }

  // Queda nova (primeira vez, ou reconectou e caiu de novo).
  await supabase.from("whatsapp_connection_alerts").upsert({
    agent_id: agent.id, user_id: agent.user_id, provider: "evolution",
    instance_name: params.instanceName, status: "down",
    dropped_at: new Date().toISOString(), last_checked_at: new Date().toISOString(),
    notified_email_at: null, resolved_at: null,
  }, { onConflict: "agent_id" });

  const { data: claimed } = await supabase.from("whatsapp_connection_alerts")
    .update({ notified_email_at: new Date().toISOString() })
    .eq("agent_id", agent.id).is("notified_email_at", null)
    .select("id").maybeSingle();

  let notified = false;
  if (claimed) {
    try {
      await sendWhatsappDisconnectedEmail({
        userId: agent.user_id, agentId: agent.id, agentName: agent.name, instanceName: params.instanceName,
      });
      notified = true;
    } catch (e) {
      console.error("Falha ao enviar e-mail de desconexão:", e);
    }
  }
  return { changed: true, notified };
}

// Exportado à parte pra permitir teste isolado via /api/system/notify-whatsapp-disconnected.
export { sendWhatsappDisconnectedEmail };
