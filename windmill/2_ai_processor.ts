// Windmill Script 2: AI Processor
// Runtime: Bun
// Suporta: agentic loop (function calling), memória longa, RAG (base de conhecimento).
import { createClient } from '@supabase/supabase-js';

// ─── Helpers de formatação ────────────────────────────────────────────────────

const stripInteractiveMarkers = (t: string) =>
  t.replace(/\[\[BOTOES:[^\]]*\]\]/g, '').replace(/\[\[LISTA:[^\]]*\]\]/g, '').trim();

const buildTtsText = (t: string) =>
  stripInteractiveMarkers(t).replace(/[*_~`#]/g, '').trim();

// ─── Tools: construção e execução ─────────────────────────────────────────────

function buildOpenAITools(config: any, hasKnowledge: boolean, hasPayments: boolean, hasCalendar: boolean): any[] {
  const tools: any[] = [];

  if (hasKnowledge) {
    tools.push({
      type: 'function',
      function: {
        name: 'buscar_conhecimento',
        description: 'Busca informações na base de conhecimento do negócio: produtos, serviços, políticas, preços, FAQs.',
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

async function generatePaymentLink(args: any, agentId: string, appBaseUrl: string): Promise<string> {
  try {
    const res = await fetch(`${appBaseUrl}/api/payments/create-link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, description: args.description, amount: args.amount }),
    });
    const data = await res.json();
    if (!res.ok) return `Erro ao gerar link de pagamento: ${data.error || res.status}`;
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

async function executeTool(
  toolCall: any, config: any, agentId: string, supabase: any, openaiKey: string, appBaseUrl: string,
  leadId: string, conversationId: string
): Promise<string> {
  const name: string = toolCall.function.name;
  let args: any = {};
  try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch {}

  if (name === 'buscar_conhecimento') {
    return searchKnowledge(args.query || '', agentId, supabase, openaiKey);
  }

  if (name === 'gerar_link_pagamento') {
    return generatePaymentLink(args, agentId, appBaseUrl);
  }

  if (name === 'verificar_disponibilidade') {
    return checkCalendarAvailability(args, agentId, appBaseUrl);
  }

  if (name === 'agendar_horario') {
    return bookCalendarSlot(args, agentId, appBaseUrl, leadId, conversationId);
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

Você é ${agentName}, ${agentRole}. Tom: ${agentTone}.${greetingInstruction}${limitationsInstruction}${memoryContext}

=== FORMATAÇÃO WHATSAPP (OBRIGATÓRIO) ===
Use APENAS: *negrito*, _itálico_, listas com -. NUNCA use **negrito**, ## títulos ou [links](url).

=== REGRA SOBRE PROMESSAS ===
NUNCA prometa verificar algo depois. Resolva tudo na mesma mensagem ou admita que não sabe agora.

=== MENUS CLICÁVEIS ===
Botões (até 3): [[BOTOES: Opção 1 | Opção 2 | Opção 3]]
Lista (4+): [[LISTA: Título || Seção | Opção 1 | Opção 2]]`;

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

  if (!modelToUse.includes('gemini') && finalOpenAiKey) {
    const tools = buildOpenAITools(config, hasKnowledge, hasPayments && !!appBaseUrl, hasCalendar && !!appBaseUrl);
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
            content: await executeTool(tc, config, agentData.id, supabase, finalOpenAiKey!, appBaseUrl, lead.id, conversation.id),
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

  return buildReturn(true, remoteJid, instanceName, responseText, audioBase64, wasAudio, channelInfo, agentData, config, lead, senderName, phoneNumber, conversation, isNewConversation);
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
  conversation: any, isNewConversation: boolean
) {
  return {
    send, remoteJid, instanceName, message, audioBase64, wasAudio, channel,
    agent: {
      id: agentData.id, name: agentData.name, type: agentData.type,
      role: config.role || '', niche: config.niche || '', tone: config.tone || '',
      systemPrompt: agentData.system_prompt || '', tags: config.tags || [], variables: config.variables || {},
    },
    lead: { id: lead?.id, name: lead?.name || senderName, phone: phoneNumber },
    conversation: { id: conversation?.id, status: conversation?.status, isNew: isNewConversation },
  };
}
