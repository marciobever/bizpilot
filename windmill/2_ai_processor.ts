// Windmill Script 2: AI Processor
// Runtime: Bun
// Suporta: agentic loop (function calling), memória longa, RAG (base de conhecimento).
import { createClient } from '@supabase/supabase-js';

// ─── Helpers de formatação ────────────────────────────────────────────────────

const stripInteractiveMarkers = (t: string) =>
  t.replace(/\[\[BOTOES:[^\]]*\]\]/g, '').replace(/\[\[LISTA:[^\]]*\]\]/g, '').replace(/\[\[IMAGEM:[^\]]*\]\]/g, '').trim();

const buildTtsText = (t: string) =>
  stripInteractiveMarkers(t).replace(/[*_~`#]/g, '').trim();

// ─── Tools: construção e execução ─────────────────────────────────────────────

function buildOpenAITools(config: any, hasKnowledge: boolean, hasPayments: boolean, hasCalendar: boolean, hasDataRecords: boolean): any[] {
  const tools: any[] = [];

  tools.push({
    type: 'function',
    function: {
      name: 'transferir_atendimento',
      description: 'Transfere a conversa para um atendente humano e pausa as respostas automáticas. Use quando o cliente pedir explicitamente para falar com uma pessoa/atendente/humano, ou quando a situação exigir escalar conforme as regras restritas (ex: reclamação grave, urgência, fora da sua capacidade).',
      parameters: {
        type: 'object',
        properties: {
          motivo: { type: 'string', description: 'Breve motivo da transferência, para o atendente humano entender o contexto rapidamente.' },
        },
        required: ['motivo'],
      },
    },
  });

  if (hasDataRecords) {
    tools.push({
      type: 'function',
      function: {
        name: 'salvar_dado',
        description: 'Salva uma informação estruturada deste cliente para consulta posterior (ex: lançamento financeiro, pedido, anotação, medição). Escolha uma "categoria" curta e use sempre a mesma categoria para o mesmo tipo de dado, para poder consultar depois.',
        parameters: {
          type: 'object',
          properties: {
            categoria: { type: 'string', description: 'Tipo do dado, ex: "transacao", "pedido", "anotacao". Use sempre o mesmo nome para o mesmo tipo de dado.' },
            dados: { type: 'object', description: 'Conteúdo do registro em campos livres (ex: {"valor": -50, "descricao": "mercado", "tipo": "despesa"})', additionalProperties: true },
          },
          required: ['categoria', 'dados'],
        },
      },
    });
    tools.push({
      type: 'function',
      function: {
        name: 'consultar_dados',
        description: 'Consulta os dados estruturados salvos anteriormente para este cliente, filtrando por categoria e opcionalmente por período. Use para responder perguntas sobre o histórico (ex: "quanto gastei esse mês?").',
        parameters: {
          type: 'object',
          properties: {
            categoria: { type: 'string', description: 'Categoria usada ao salvar o dado (ex: "transacao").' },
            data_inicio: { type: 'string', description: 'Data inicial do filtro, formato AAAA-MM-DD (opcional).' },
            data_fim: { type: 'string', description: 'Data final do filtro, formato AAAA-MM-DD (opcional).' },
          },
          required: ['categoria'],
        },
      },
    });
  }

  if (hasKnowledge) {
    tools.push({
      type: 'function',
      function: {
        name: 'buscar_conhecimento',
        description: 'Busca informações na base de conhecimento do negócio: produtos, serviços, políticas, preços, FAQs. O resultado é texto bruto da base — nunca copie e cole literalmente, reescreva de forma natural e formatada para o cliente.',
        parameters: {
          type: 'object',
          properties: { query: { type: 'string', description: 'O que você precisa saber' } },
          required: ['query'],
        },
      },
    });
  }

  if (hasPayments) {
    tools.push({
      type: 'function',
      function: {
        name: 'gerar_link_pagamento',
        description: 'Gera um link de pagamento (Pix/cartão/boleto) para o cliente pagar um produto/serviço. Use quando o cliente confirmar que quer comprar/pagar.',
        parameters: {
          type: 'object',
          properties: {
            description: { type: 'string', description: 'Descrição do produto/serviço cobrado' },
            amount: { type: 'number', description: 'Valor a cobrar, em reais (ex: 99.90)' },
          },
          required: ['description', 'amount'],
        },
      },
    });
  }

  if (hasCalendar) {
    tools.push({
      type: 'function',
      function: {
        name: 'verificar_disponibilidade',
        description: 'Consulta os horários livres na agenda em uma data específica. Use antes de agendar um compromisso.',
        parameters: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'Data no formato AAAA-MM-DD' },
          },
          required: ['date'],
        },
      },
    });
    tools.push({
      type: 'function',
      function: {
        name: 'agendar_horario',
        description: 'Agenda um compromisso/reunião na agenda. Use depois de confirmar com o cliente a data, horário e o nome dele.',
        parameters: {
          type: 'object',
          properties: {
            datetime: { type: 'string', description: 'Data e hora no formato ISO 8601 (ex: 2026-06-10T14:00:00-03:00)' },
            nome: { type: 'string', description: 'Nome do cliente' },
            email: { type: 'string', description: 'E-mail do cliente, se disponível' },
            descricao: { type: 'string', description: 'Assunto/descrição do compromisso' },
          },
          required: ['nome'],
        },
      },
    });
    tools.push({
      type: 'function',
      function: {
        name: 'reagendar_horario',
        description: 'Move o agendamento ativo do cliente para uma nova data/horário, cancelando o horário anterior. Use quando o cliente pedir para remarcar/reagendar um compromisso já existente.',
        parameters: {
          type: 'object',
          properties: {
            datetime: { type: 'string', description: 'Nova data e hora no formato ISO 8601 (ex: 2026-06-10T14:00:00-03:00)' },
          },
          required: ['datetime'],
        },
      },
    });
    tools.push({
      type: 'function',
      function: {
        name: 'cancelar_agendamento',
        description: 'Cancela o agendamento ativo do cliente. Use quando o cliente pedir para cancelar/desmarcar o compromisso.',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    });
  }

  for (const tool of config.tools || []) {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    for (const [k, v] of Object.entries(tool.parameters || {})) {
      properties[k] = { type: 'string', description: v };
      if (tool.required_params?.includes(k)) required.push(k);
    }
    tools.push({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: { type: 'object', properties, required },
      },
    });
  }

  return tools;
}

async function callWebhookTool(tool: any, args: any): Promise<string> {
  try {
    const url = new URL(tool.url);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(tool.headers || {}),
    };
    let res: Response;
    if ((tool.method || 'GET').toUpperCase() === 'GET') {
      for (const [k, v] of Object.entries(args)) url.searchParams.set(k, String(v));
      res = await fetch(url.toString(), { headers });
    } else {
      res = await fetch(url.toString(), { method: 'POST', headers, body: JSON.stringify(args) });
    }
    const text = await res.text();
    return res.ok ? text : `Erro ${res.status}: ${text.slice(0, 300)}`;
  } catch (e: any) {
    return `Ferramenta indisponível: ${e.message}`;
  }
}

async function searchKnowledge(
  query: string, agentId: string, supabase: any, openaiKey: string
): Promise<string> {
  try {
    const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: query }),
    });
    if (!embedRes.ok) return '';
    const { data } = await embedRes.json();

    const { data: chunks } = await supabase.rpc('search_knowledge', {
      query_embedding: data[0].embedding,
      agent_id_filter: agentId,
      match_count: 5,
    });
    if (!chunks?.length) return 'Nenhuma informação relevante encontrada na base de conhecimento.';
    return chunks.map((c: any) => c.chunk_text).join('\n\n---\n\n');
  } catch {
    return '';
  }
}

async function generatePaymentLink(args: any, agentId: string, appBaseUrl: string, sideEffects: { imageUrl?: string }): Promise<string> {
  try {
    const res = await fetch(`${appBaseUrl}/api/payments/create-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, description: args.description, amount: args.amount }),
    });
    const data = await res.json();
    if (!res.ok) return `Erro ao gerar link de pagamento: ${data.error || res.status}`;
    if (data.pixCode) {
      if (data.qrCodeUrl) sideEffects.imageUrl = data.qrCodeUrl;
      return `O QR Code do Pix já foi enviado ao cliente como imagem. Envie também este código Pix Copia e Cola, caso ele prefira colar no app do banco: ${data.pixCode}`;
    }
    return `Link de pagamento gerado: ${data.url}`;
  } catch (e: any) {
    return `Não foi possível gerar o link de pagamento: ${e.message}`;
  }
}

// Agrupa os horários em Manhã/Tarde/Noite e amostra no máximo `maxPerPeriod`
// por período, igualmente espaçados — evita despejar uma lista enorme de
// slots de 15/30 em 15/30 minutos pro modelo.
function groupAndSampleSlots(slots: string[], maxPerPeriod = 4): string {
  const fmtHour = (d: Date) => Number(d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false }));
  const fmtTime = (d: Date) => d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

  const periods: { label: string; items: Date[] }[] = [
    { label: 'Manhã', items: [] },
    { label: 'Tarde', items: [] },
    { label: 'Noite', items: [] },
  ];

  for (const s of slots) {
    const d = new Date(s);
    const hour = fmtHour(d);
    if (hour < 12) periods[0].items.push(d);
    else if (hour < 18) periods[1].items.push(d);
    else periods[2].items.push(d);
  }

  const sample = (items: Date[]) => {
    if (items.length <= maxPerPeriod) return items;
    const step = items.length / maxPerPeriod;
    return Array.from({ length: maxPerPeriod }, (_, i) => items[Math.floor(i * step)]);
  };

  return periods
    .filter((p) => p.items.length > 0)
    .map((p) => `${p.label}: ${sample(p.items).map(fmtTime).join(', ')}`)
    .join(' | ');
}

async function checkCalendarAvailability(args: any, agentId: string, appBaseUrl: string): Promise<string> {
  try {
    const res = await fetch(`${appBaseUrl}/api/calendar/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, date: args.date }),
    });
    const data = await res.json();
    if (!res.ok) return `Erro ao consultar disponibilidade: ${data.error || res.status}`;
    if (!data.slots?.length) return 'Não há horários disponíveis nessa data.';
    const grouped = groupAndSampleSlots(data.slots);
    return `Algumas opções de horário disponíveis (apresente só 2-3 ao cliente, não a lista toda; há mais horários além destes): ${grouped}.`;
  } catch (e: any) {
    return `Não foi possível consultar a disponibilidade: ${e.message}`;
  }
}

async function bookCalendarSlot(args: any, agentId: string, appBaseUrl: string, leadId: string, conversationId: string): Promise<string> {
  try {
    const res = await fetch(`${appBaseUrl}/api/calendar/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, datetime: args.datetime, name: args.nome, email: args.email, description: args.descricao, leadId, conversationId }),
    });
    const data = await res.json();
    if (!res.ok) return `Erro ao agendar: ${data.error || res.status}`;
    return data.url ? `${data.message} Link: ${data.url}` : (data.message || 'Agendamento confirmado.');
  } catch (e: any) {
    return `Não foi possível concluir o agendamento: ${e.message}`;
  }
}

async function rescheduleCalendarSlot(args: any, agentId: string, appBaseUrl: string, leadId: string): Promise<string> {
  try {
    const res = await fetch(`${appBaseUrl}/api/calendar/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, leadId, datetime: args.datetime }),
    });
    const data = await res.json();
    if (!res.ok) return `Erro ao reagendar: ${data.error || res.status}`;
    return data.message || 'Agendamento reagendado.';
  } catch (e: any) {
    return `Não foi possível reagendar: ${e.message}`;
  }
}

async function cancelCalendarBooking(agentId: string, appBaseUrl: string, leadId: string): Promise<string> {
  try {
    const res = await fetch(`${appBaseUrl}/api/calendar/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, leadId }),
    });
    const data = await res.json();
    if (!res.ok) return `Erro ao cancelar: ${data.error || res.status}`;
    return data.message || 'Agendamento cancelado.';
  } catch (e: any) {
    return `Não foi possível cancelar: ${e.message}`;
  }
}

async function saveDataRecord(args: any, agentId: string, userId: string, leadId: string, supabase: any): Promise<string> {
  if (!args.categoria || !args.dados) return 'categoria e dados são obrigatórios.';
  const { error } = await supabase.from('agent_records').insert({
    user_id: userId,
    agent_id: agentId,
    lead_id: leadId,
    category: String(args.categoria).toLowerCase().trim(),
    data: args.dados,
  });
  if (error) return `Erro ao salvar: ${error.message}`;
  return 'Dado salvo com sucesso.';
}

async function queryDataRecords(args: any, agentId: string, leadId: string, supabase: any): Promise<string> {
  if (!args.categoria) return 'categoria é obrigatória.';
  let query = supabase.from('agent_records').select('data, created_at')
    .eq('agent_id', agentId).eq('lead_id', leadId)
    .eq('category', String(args.categoria).toLowerCase().trim())
    .order('created_at', { ascending: true })
    .limit(200);
  if (args.data_inicio) query = query.gte('created_at', `${args.data_inicio}T00:00:00`);
  if (args.data_fim) query = query.lte('created_at', `${args.data_fim}T23:59:59`);

  const { data, error } = await query;
  if (error) return `Erro ao consultar: ${error.message}`;
  if (!data?.length) return 'Nenhum registro encontrado para essa categoria/período.';
  return JSON.stringify(data.map((r: any) => ({ ...r.data, data_registro: r.created_at })));
}

// Avisa um humano disponível (número configurado) que uma conversa precisa de atenção.
async function notifyHandoff(
  config: any, channelInfo: any, instanceName: string, leadName: string, leadPhone: string, motivo: string
): Promise<void> {
  const handoffPhone = String(config.handoffPhone || '').replace(/\D/g, '');
  if (!handoffPhone) return;

  const text = `🔔 *Atendimento transferido para humano*\nCliente: ${leadName || 'Cliente'} (${leadPhone})\nMotivo: ${motivo || 'Solicitado pelo cliente'}\n\nA IA foi pausada nesta conversa. Acesse o painel de Conversas para responder.`;

  try {
    if (channelInfo?.provider === 'meta' && channelInfo.meta?.accessToken && channelInfo.meta?.phoneNumberId) {
      await fetch(`https://graph.facebook.com/v21.0/${channelInfo.meta.phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${channelInfo.meta.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: handoffPhone, type: 'text', text: { body: text } }),
      });
      return;
    }

    if (!instanceName) return;
    const { getVariable } = await import('windmill-client');
    const tryGet = async (...paths: string[]) => {
      for (const p of paths) { try { const v = await getVariable(p); if (v) return v; } catch {} }
      return '';
    };
    const evoUrl = await tryGet('u/bevervansomarcio/synapseai/EVOLUTION_API_URL', 'u/bevervansomarcio/EVOLUTION_API_URL');
    const evoKey = await tryGet('u/bevervansomarcio/synapseai/EVOLUTION_API_KEY', 'u/bevervansomarcio/EVOLUTION_API_KEY');
    if (!evoUrl || !evoKey) return;

    await fetch(`${evoUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: evoKey },
      body: JSON.stringify({ number: `${handoffPhone}@s.whatsapp.net`, text, linkPreview: false }),
    });
  } catch { /* notificação é best-effort */ }
}

async function transferToHuman(
  args: any, config: any, channelInfo: any, instanceName: string, conversationId: string,
  leadName: string, leadPhone: string, supabase: any
): Promise<string> {
  await supabase.from('conversations').update({ status: 'paused' }).eq('id', conversationId);
  await notifyHandoff(config, channelInfo, instanceName, leadName, leadPhone, args?.motivo || '');
  return 'Atendimento transferido para um humano com sucesso e a IA foi pausada nesta conversa. Responda ao cliente em 1 frase curta avisando que um atendente vai continuar o atendimento em instantes.';
}

async function executeTool(
  toolCall: any, config: any, agentId: string, supabase: any, openaiKey: string, appBaseUrl: string,
  leadId: string, conversationId: string, sideEffects: { imageUrl?: string }, userId: string,
  channelInfo: any, instanceName: string, leadName: string, leadPhone: string
): Promise<string> {
  const name: string = toolCall.function.name;
  let args: any = {};
  try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch {}

  if (name === 'buscar_conhecimento') {
    return searchKnowledge(args.query || '', agentId, supabase, openaiKey);
  }

  if (name === 'gerar_link_pagamento') {
    return generatePaymentLink(args, agentId, appBaseUrl, sideEffects);
  }

  if (name === 'verificar_disponibilidade') {
    return checkCalendarAvailability(args, agentId, appBaseUrl);
  }

  if (name === 'agendar_horario') {
    return bookCalendarSlot(args, agentId, appBaseUrl, leadId, conversationId);
  }

  if (name === 'reagendar_horario') {
    return rescheduleCalendarSlot(args, agentId, appBaseUrl, leadId);
  }

  if (name === 'cancelar_agendamento') {
    return cancelCalendarBooking(agentId, appBaseUrl, leadId);
  }

  if (name === 'salvar_dado') {
    return saveDataRecord(args, agentId, userId, leadId, supabase);
  }

  if (name === 'consultar_dados') {
    return queryDataRecords(args, agentId, leadId, supabase);
  }

  if (name === 'transferir_atendimento') {
    return transferToHuman(args, config, channelInfo, instanceName, conversationId, leadName, leadPhone, supabase);
  }

  const tool = (config.tools || []).find((t: any) => t.name === name);
  if (tool) return callWebhookTool(tool, args);

  return 'Ferramenta não encontrada.';
}

// ─── Memória longa ────────────────────────────────────────────────────────────

async function extractAndSaveMemories(
  userMsg: string, botMsg: string,
  leadId: string, agentId: string, userId: string,
  supabase: any, openaiKey: string
) {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'Extraia fatos concretos sobre o USUÁRIO desta troca. Retorne JSON: {"facts":[{"key":"...","value":"..."}]}. Máx 5. Apenas fatos úteis para conversas futuras (nome, cidade, profissão, preferências, situação, objetivos). Se nada relevante: {"facts":[]}.',
          },
          { role: 'user', content: `Usuário: "${userMsg}"\nBot: "${botMsg}"` },
        ],
      }),
    });
    if (!res.ok) return;
    const { choices } = await res.json();
    const { facts } = JSON.parse(choices[0].message.content);
    if (!facts?.length) return;

    for (const { key, value } of facts) {
      if (!key || !value) continue;
      await supabase.from('contact_memory').upsert(
        { user_id: userId, agent_id: agentId, lead_id: leadId, key, value, updated_at: new Date().toISOString() },
        { onConflict: 'lead_id,agent_id,key' }
      );
    }
  } catch { /* silently ignore */ }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export async function main(
  webhook_data: any,
  SUPABASE_URL?: string,
  SUPABASE_SERVICE_ROLE_KEY?: string,
  GEMINI_API_KEY?: string,
  OPENAI_API_KEY?: string
) {
  if (!webhook_data || webhook_data.process === false) {
    return { send: false, reason: webhook_data?.reason || 'Mensagem não qualificada.' };
  }

  let finalOpenAiKey = OPENAI_API_KEY;
  let finalGeminiKey = GEMINI_API_KEY;
  let finalSupabaseUrl = SUPABASE_URL;
  let finalSupabaseRoleKey = SUPABASE_SERVICE_ROLE_KEY;

  if (!finalOpenAiKey || !finalGeminiKey || !finalSupabaseUrl || !finalSupabaseRoleKey) {
    try {
      const { getVariable } = await import('windmill-client');
      const tryGet = async (...paths: string[]) => {
        for (const p of paths) { try { const v = await getVariable(p); if (v) return v; } catch {} }
        return '';
      };
      if (!finalOpenAiKey)       finalOpenAiKey       = await tryGet('u/bevervansomarcio/OPENAI_API_KEY', 'u/bevervansomarcio/synapseai/OPENAI_API_KEY');
      if (!finalGeminiKey)       finalGeminiKey       = await tryGet('u/bevervansomarcio/GEMINI_API_KEY', 'u/bevervansomarcio/synapseai/GEMINI_API_KEY');
      if (!finalSupabaseUrl)     finalSupabaseUrl     = await tryGet('u/bevervansomarcio/synapseai/SUPABASE_URL', 'u/bevervansomarcio/SUPABASE_URL');
      if (!finalSupabaseRoleKey) finalSupabaseRoleKey = await tryGet('u/bevervansomarcio/synapseai/SUPABASE_SERVICE_ROLE_KEY', 'u/bevervansomarcio/SUPABASE_SERVICE_ROLE_KEY');
    } catch (e: any) {
      console.warn('windmill-client:', e.message);
    }
  }

  if (!finalSupabaseUrl || !finalSupabaseRoleKey) {
    return { send: false, reason: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.' };
  }

  const supabase = createClient(finalSupabaseUrl, finalSupabaseRoleKey);
  const { instanceName, incomingMessage, senderName, remoteJid, provider, metaPhoneNumberId, messageType, wasAudio } = webhook_data;
  const isMeta = provider === 'meta';

  // ── Resolução do agente ───────────────────────────────────────────────────

  let agentData: any = null;

  if (isMeta && metaPhoneNumberId) {
    const { data } = await supabase.from('agents').select('*')
      .eq('config->whatsapp->meta->>phoneNumberId', metaPhoneNumberId).limit(1).maybeSingle();
    agentData = data;
    if (!agentData) return { send: false, reason: `Nenhum agente Meta para phoneNumberId: ${metaPhoneNumberId}` };
  }

  if (!agentData) {
    const uuidMatch = instanceName?.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (uuidMatch) {
      const { data } = await supabase.from('agents').select('*').eq('id', uuidMatch[1]).maybeSingle();
      agentData = data;
    }
  }

  if (!agentData && !isMeta && instanceName) {
    const clean = instanceName.toLowerCase().replace('agent_', '');
    const { data: list } = await supabase.from('agents').select('*');
    agentData = list?.find((a: any) =>
      clean.includes(a.name.toLowerCase()) || a.name.toLowerCase().includes(clean)
    );
  }

  if (!agentData && !isMeta) {
    const { data } = await supabase.from('agents').select('*').limit(1);
    agentData = data?.[0] ?? null;
  }

  if (!agentData) return { send: false, reason: 'Agente não encontrado.' };

  const userId = agentData.user_id;
  const phoneNumber = remoteJid.replace('@s.whatsapp.net', '');
  const config = agentData.config || {};

  // ── Lead / Conversa ───────────────────────────────────────────────────────

  let { data: lead } = await supabase.from('leads').select('*')
    .eq('phone', phoneNumber).eq('user_id', userId).single();

  if (!lead) {
    const { data } = await supabase.from('leads')
      .insert([{ user_id: userId, phone: phoneNumber, name: senderName }]).select().single();
    lead = data;
  }

  let { data: conversation } = await supabase.from('conversations').select('*')
    .eq('lead_id', lead.id).limit(1).maybeSingle();
  let isNewConversation = false;

  if (!conversation) {
    const { data } = await supabase.from('conversations')
      .insert([{ user_id: userId, lead_id: lead.id, agent_id: agentData.id, status: 'active', channel: 'whatsapp' }])
      .select().single();
    conversation = data;
    isNewConversation = true;
  } else if (conversation.status === 'closed') {
    const { data } = await supabase.from('conversations')
      .update({ status: 'active', last_message_at: new Date().toISOString() })
      .eq('id', conversation.id).select().single();
    conversation = data;
    isNewConversation = true;
  }

  await supabase.from('messages').insert({ conversation_id: conversation.id, sender_type: 'lead', content: incomingMessage });

  if (conversation.status === 'paused') {
    return { send: false, reason: 'IA pausada para esta conversa.' };
  }

  // ── Canal de saída ────────────────────────────────────────────────────────

  const waConfig = config.whatsapp || {};
  const channelProvider = isMeta ? 'meta' : (waConfig.provider || 'evolution');
  const channelInfo = {
    provider: channelProvider,
    meta: channelProvider === 'meta' ? {
      phoneNumberId: metaPhoneNumberId || waConfig.meta?.phoneNumberId,
      accessToken: waConfig.meta?.accessToken,
    } : null,
  };

  // ── Memória longa ─────────────────────────────────────────────────────────

  const { data: memories } = await supabase.from('contact_memory').select('key, value')
    .eq('lead_id', lead.id).eq('agent_id', agentData.id);

  let memoryContext = '';
  if (memories?.length) {
    memoryContext = '\n\n=== O QUE VOCÊ JÁ SABE SOBRE ESTE CLIENTE ===\n' +
      memories.map((m: any) => `${m.key}: ${m.value}`).join('\n');
  }

  // ── Base de conhecimento (verifica se há chunks) ──────────────────────────

  const { count: chunkCount } = await supabase.from('knowledge_chunks')
    .select('id', { count: 'exact', head: true }).eq('agent_id', agentData.id);
  const hasKnowledge = (chunkCount || 0) > 0;

  // ── Links de pagamento (Mercado Pago / Asaas / Woovi) ─────────────────────

  const { data: paymentsIntegration } = await supabase.from('integrations')
    .select('status').eq('user_id', userId).eq('provider', 'payments').maybeSingle();
  const hasPayments = paymentsIntegration?.status === 'connected';

  // ── Calendário / Agenda (Cal.com / Google Calendar / Calendly) ────────────

  const { data: calendarIntegration } = await supabase.from('integrations')
    .select('status').eq('user_id', userId).eq('provider', 'calendar').maybeSingle();
  const hasCalendar = calendarIntegration?.status === 'connected';

  // ── Memória de dados estruturados (registros livres por categoria) ───────

  const hasDataRecords = !!config.dataRecordsEnabled;

  let appBaseUrl = process.env.APP_BASE_URL || '';
  if (!appBaseUrl) {
    try {
      const { getVariable } = await import('windmill-client');
      appBaseUrl = await getVariable('u/bevervansomarcio/synapseai/APP_BASE_URL').catch(() => '');
    } catch { /* ignore */ }
  }

  // ── Histórico ─────────────────────────────────────────────────────────────

  const { data: history } = await supabase.from('messages').select('*')
    .eq('conversation_id', conversation.id)
    .order('created_at', { ascending: false }).limit(20);

  const cleanHistory = (history || []).reverse()
    .filter((m: any) => !m.content.startsWith('[ERRO'));

  // ── Limitações / saudação ─────────────────────────────────────────────────

  const limitations: string[] = config.limitations || [];
  const greeting: string = config.greeting || '';
  const agentName: string = agentData.name;
  const agentRole: string = config.role || 'Assistente';
  const agentNiche: string = config.niche || '';
  const agentTone: string = config.tone || 'Amigável';
  const systemPrompt: string = agentData.system_prompt || 'Você é um assistente prestativo.';

  const isSimpleGreeting = /^(oi|ol[aá]|opa|bom\s*dia|boa\s*tarde|boa\s*noite|hello|hi|e\s*ai|e\s*aí)[\s!.]*$/i.test(incomingMessage.trim());

  let greetingInstruction = '';
  if (isNewConversation && greeting) {
    if (isSimpleGreeting) {
      // Resposta rápida de saudação sem chamar a IA
      const { data: audioGreeting } = await generateTTS(greeting, config, finalOpenAiKey, wasAudio);
      await supabase.from('messages').insert({ conversation_id: conversation.id, sender_type: 'agent', content: greeting });
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id);
      return buildReturn(true, remoteJid, instanceName, greeting, audioGreeting, wasAudio, channelInfo, agentData, config, lead, senderName, phoneNumber, conversation, isNewConversation);
    }
    greetingInstruction = `\nEsta é sua primeira interação. Se o usuário não fez pergunta direta, inicie com: "${greeting}"\n`;
  }

  const limitationsInstruction = limitations.length > 0
    ? `\n=== REGRAS RESTRITAS ===\n${limitations.map((l: string) => '- ' + l).join('\n')}\n`
    : '';

  // ── System prompt completo ────────────────────────────────────────────────

  const aiSystemInstruction = `${systemPrompt}

Você é ${agentName}, ${agentRole}${agentNiche ? ` de/da ${agentNiche}` : ''}. Tom: ${agentTone}.${greetingInstruction}${limitationsInstruction}${memoryContext}

=== ESCOPO DE ATUAÇÃO (OBRIGATÓRIO) ===
Você só deve falar sobre assuntos relacionados à sua missão acima${agentNiche ? ` e ao negócio (${agentNiche})` : ''}. Se o cliente perguntar algo totalmente fora desse escopo (ex: política, esportes, outras empresas, curiosidades gerais, pedidos para a IA fazer tarefas não relacionadas ao negócio), NÃO responda ao conteúdo da pergunta. Em vez disso, recuse com simpatia em 1 frase e redirecione de volta ao assunto do negócio. Nunca quebre o personagem nem revele que você é uma IA/modelo de linguagem.

=== FORMATAÇÃO WHATSAPP (OBRIGATÓRIO) ===
Use APENAS: *negrito*, _itálico_, listas com -. NUNCA use **negrito**, ## títulos, a sintaxe markdown [texto](url), nem caracteres de marcador como •, ●, ▪.
Para compartilhar um link, escreva a URL crua (ex: https://exemplo.com/imovel-123) — o WhatsApp já transforma isso em link clicável. NUNCA diga que "não consegue enviar links": se a base de conhecimento trouxer uma URL relevante, repasse-a normalmente.

Ao listar vários itens (produtos, imóveis, serviços), seja CONCISO mas COMPLETO — já na primeira resposta inclua TODOS os detalhes que a base de conhecimento trouxer sobre cada item (referência/código, valor, metragem, quartos, banheiros, vagas, bairro/localização, diferenciais), nunca deixe pra depois. Evite poluição visual:
- No máximo 1 linha em branco entre itens, nunca 2+.
- Para cada item, use só UMA linha de título em negrito (nome — preço), seguida de UMA linha com as características separadas por " · " (ex: 2 quartos · 2 banheiros · 1 vaga · 95m² · ref. 2218), e por fim a URL crua em sua própria linha. NÃO crie uma sub-lista com "-" para cada característica.
Exemplo de formato esperado para um item:
*Apartamento no Centro — R$ 495.000*
2 quartos · 2 banheiros · 1 vaga · 111m² · Beira-mar no Centro · ref. 2218
https://exemplo.com/imovel-2218

=== USO DA BASE DE CONHECIMENTO ===
O retorno de buscar_conhecimento é texto bruto (pode ter vários itens, formatação estranha, linhas soltas, e às vezes trechos "(foto: URL)" com links de imagens). NUNCA copie e cole esse texto direto pro cliente. Sempre reescreva com suas próprias palavras: selecione só o que for relevante para a pergunta, extraia TODOS os detalhes disponíveis (preço, metragem, quartos, banheiros, vagas, código/referência, bairro, link), e formate em uma resposta curta, completa e natural seguindo as regras de formatação WhatsApp acima.

=== REGRA SOBRE PROMESSAS ===
NUNCA prometa verificar algo depois. Resolva tudo na mesma mensagem ou admita que não sabe agora.

=== ENVIO DE FOTO ===
Se a base de conhecimento trouxer um trecho "(foto: URL)" associado ao item que você está apresentando, inclua na sua resposta a marcação [[IMAGEM: URL]] (uma vez só, para o item principal/destaque). Essa marcação não aparece para o cliente — o sistema envia a foto de capa junto com sua mensagem como legenda.

=== ATENDIMENTO HUMANO ===
Se o cliente pedir para falar com um atendente/humano/pessoa, ou a situação exigir escalar conforme as regras restritas acima, chame transferir_atendimento com um breve motivo. Depois disso, responda ao cliente em 1 frase curta avisando que um atendente vai continuar por ali.

=== MENUS CLICÁVEIS ===
Botões (até 3): [[BOTOES: Opção 1 | Opção 2 | Opção 3]]
Lista (4+): [[LISTA: Título || Seção | Opção 1 | Opção 2]]${hasDataRecords ? `

=== MEMÓRIA DE DADOS (REGISTROS) ===
Sempre que o cliente fornecer uma informação que deva ser guardada para consulta futura (ex: um lançamento financeiro, um pedido, uma anotação, uma medição), chame salvar_dado com uma "categoria" curta e consistente (ex: "transacao") e os campos relevantes em "dados". Quando o cliente perguntar sobre o histórico ou pedir totais/resumos (ex: "quanto gastei esse mês?"), chame consultar_dados com a mesma categoria e, se fizer sentido, um período, e calcule a resposta a partir dos registros retornados.` : ''}`;

  // ── Verificações de segurança ─────────────────────────────────────────────

  if (config.ignoreGroups && remoteJid.includes('@g.us')) {
    return { send: false, reason: 'Grupo ignorado.' };
  }
  if (config.blocklist?.some((n: string) => phoneNumber.includes(n) || n.includes(phoneNumber))) {
    return { send: false, reason: 'Número bloqueado.' };
  }

  // ── Agentic loop (OpenAI function calling) ────────────────────────────────

  const modelToUse = config.model || 'gpt-5.4-mini';
  let responseText = 'Desculpe, não consegui processar sua mensagem no momento.';
  const sideEffects: { imageUrl?: string } = {};

  if (!modelToUse.includes('gemini') && finalOpenAiKey) {
    const tools = buildOpenAITools(config, hasKnowledge, hasPayments && !!appBaseUrl, hasCalendar && !!appBaseUrl, hasDataRecords);
    const messages: any[] = [
      { role: 'system', content: aiSystemInstruction },
      ...cleanHistory.map((m: any) => ({
        role: m.sender_type === 'lead' ? 'user' : 'assistant',
        content: m.content,
      })),
      { role: 'user', content: incomingMessage },
    ];

    const MAX_ROUNDS = 5;
    for (let round = 0; round < MAX_ROUNDS; round++) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${finalOpenAiKey}` },
        body: JSON.stringify({
          model: modelToUse === 'openai' ? 'gpt-4o-mini' : modelToUse,
          messages,
          ...(tools.length > 0 ? { tools, tool_choice: 'auto' } : {}),
        }),
      });

      const result = await res.json();
      if (!res.ok) { responseText = `[ERRO OPENAI]: ${JSON.stringify(result)}`; break; }

      const choice = result.choices[0];

      if (choice.finish_reason === 'tool_calls') {
        const assistantMsg = choice.message;
        messages.push(assistantMsg);

        const toolResults = await Promise.all(
          assistantMsg.tool_calls.map(async (tc: any) => ({
            role: 'tool',
            tool_call_id: tc.id,
            content: await executeTool(tc, config, agentData.id, supabase, finalOpenAiKey!, appBaseUrl, lead.id, conversation.id, sideEffects, userId, channelInfo, instanceName, lead.name || senderName, phoneNumber),
          }))
        );
        messages.push(...toolResults);
      } else {
        responseText = choice.message?.content || responseText;
        break;
      }
    }

  } else if (finalGeminiKey) {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${finalGeminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: aiSystemInstruction }] },
          contents: cleanHistory.map((m: any) => ({
            role: m.sender_type === 'lead' ? 'user' : 'model',
            parts: [{ text: m.content }],
          })),
        }),
      }
    );
    const geminiResult = await geminiRes.json();
    responseText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text
      || `[ERRO GEMINI]: ${JSON.stringify(geminiResult)}`;
  } else {
    responseText = '[ERRO]: Nenhuma chave de IA configurada.';
  }

  // ── Persiste resposta ─────────────────────────────────────────────────────

  await supabase.from('messages').insert({ conversation_id: conversation.id, sender_type: 'agent', content: responseText });
  await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversation.id);

  // ── TTS (responder no mesmo canal: só gera áudio se usuário mandou áudio) ──

  const { data: audioBase64 } = await generateTTS(responseText, config, finalOpenAiKey, wasAudio);

  // ── Extração assíncrona de memória (fire and forget) ──────────────────────

  if (finalOpenAiKey) {
    extractAndSaveMemories(incomingMessage, responseText, lead.id, agentData.id, userId, supabase, finalOpenAiKey)
      .catch(() => {});
  }

  return buildReturn(true, remoteJid, instanceName, responseText, audioBase64, wasAudio, channelInfo, agentData, config, lead, senderName, phoneNumber, conversation, isNewConversation, sideEffects.imageUrl);
}

// ─── Helpers de retorno ────────────────────────────────────────────────────────

async function generateTTS(
  text: string, config: any, openaiKey: string | undefined, wasAudio: boolean
): Promise<{ data: string | null }> {
  if (!config.voice_enabled || !wasAudio || !openaiKey) return { data: null };
  try {
    const clean = buildTtsText(text);
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'tts-1', voice: config.voice_voice || 'alloy', input: clean }),
    });
    if (!res.ok) return { data: null };
    return { data: Buffer.from(await res.arrayBuffer()).toString('base64') };
  } catch { return { data: null }; }
}

function buildReturn(
  send: boolean, remoteJid: string, instanceName: string,
  message: string, audioBase64: string | null, wasAudio: boolean,
  channel: any, agentData: any, config: any,
  lead: any, senderName: string, phoneNumber: string,
  conversation: any, isNewConversation: boolean,
  imageUrl?: string | null
) {
  return {
    send, remoteJid, instanceName, message, audioBase64, wasAudio, channel, imageUrl: imageUrl || null,
    agent: {
      id: agentData.id, name: agentData.name, type: agentData.type,
      role: config.role || '', niche: config.niche || '', tone: config.tone || '',
      systemPrompt: agentData.system_prompt || '', tags: config.tags || [], variables: config.variables || {},
    },
    lead: { id: lead?.id, name: lead?.name || senderName, phone: phoneNumber },
    conversation: { id: conversation?.id, status: conversation?.status, isNew: isNewConversation },
  };
}
