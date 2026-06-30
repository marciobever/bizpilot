import { NextRequest, NextResponse } from 'next/server';

const GREETING_RULES = `Estrutura ideal de cada saudação (2 a 4 linhas curtas, fáceis de ler no celular):
1. Boas-vindas calorosas citando o nome da empresa/negócio (quando houver um claro).
2. Apresentação natural pelo nome — como uma pessoa real faria, SEM dizer "assistente virtual", "robô" ou "IA". Apenas o nome de forma conversacional (ex.: "Aqui é a Ana 😊", "Oi, pode falar comigo — sou a Ana!", "Me chamo Ana e cuido do atendimento aqui."). Combine o gênero com o nome do agente.
3. Uma frase curta que situa o que o negócio oferece ou como pode ajudar — direta ao ponto.
4. Uma pergunta de encerramento que conduza o cliente ao próximo passo, com 2 a 3 opções concretas baseadas no que o negócio realmente faz (ex.: "Quer ver os produtos disponíveis, tirar uma dúvida ou fazer um pedido?").

Regras:
- Português do Brasil, tom natural e humano — como uma atendente real escreveria no WhatsApp.
- NUNCA diga "assistente virtual", "atendimento virtual", "robô" ou "IA" em nenhuma das opções.
- NUNCA termine com o clichê genérico "Como posso te ajudar hoje?" — sempre ofereça opções concretas.
- Respeite o tom de voz indicado. Use no máximo 1 emoji, e só se o tom permitir (evite emojis em tons "Profissional e Direto" ou "Técnico e Especialista").
- Baseie o contexto e as opções nas funções/atuação informadas e no nome da empresa.
- Não invente nome de empresa: se não houver um claro, faça as boas-vindas sem citar nome.
- Não use markdown, asteriscos nem aspas dentro do texto da saudação.`;

const SYSTEM_PROMPTS: Record<string, string> = {
  generate_function: `Você é especialista em criar instruções para bots de atendimento via WhatsApp.
O usuário vai descrever em linguagem natural o que quer que o bot faça. Sua tarefa é:
1. Criar um label curto (2-4 palavras) para identificar essa função
2. Escolher um emoji adequado
3. Escrever um bloco de instruções no formato "=== TITULO ===" seguido das instruções objetivas em português do Brasil, explicando como o bot deve executar essa função, o que perguntar, como agir e quais limites respeitar.

As instruções devem ser práticas, específicas e prontas para uso num system prompt de WhatsApp.

Responda APENAS com JSON válido, sem texto fora dele, no formato exato:
{"label": "Nome da Função", "emoji": "🎯", "prompt": "=== NOME DA FUNÇÃO ===\\nInstruções objetivas aqui..."}`,
  greeting: `Você é um especialista em copywriting para atendimento via WhatsApp. Escreva UMA mensagem de saudação que um agente de IA usará para INICIAR conversas — é a primeira impressão do negócio.

${GREETING_RULES}
- Responda APENAS com o texto da saudação, pronto para uso, sem explicações.`,
  greetings: `Você é um especialista em copywriting para atendimento via WhatsApp. Gere TRÊS opções DISTINTAS de saudação de abertura para um agente de IA — a primeira impressão do negócio. O usuário vai escolher uma.

${GREETING_RULES}
- As 3 opções devem variar entre si no estilo da abertura e na forma da pergunta final, mas todas seguir as regras acima.
- Responda APENAS um JSON válido, sem texto fora dele, no formato exato: {"options": ["saudação 1", "saudação 2", "saudação 3"]}`,
  instructions: `Você é um especialista em criar prompts de sistema (instruções) para agentes de IA de atendimento via WhatsApp.

Sua tarefa é gerar um prompt de instruções completo, em português do Brasil, organizado em seções com "===", cobrindo:
- Identidade do agente (nome, cargo, empresa)
- Missão / objetivo principal
- Como se comunicar (tom de voz, estilo)
- O que fazer e o que nunca fazer
- Espaço para informações específicas da empresa (produtos, preços, processos)

Use as informações fornecidas pelo usuário sobre o que o bot deve fazer como base principal para o conteúdo.

Não use markdown (sem **negrito** ou listas com -, use apenas texto simples com seções "==="). Responda APENAS com o prompt final, pronto para uso, sem explicações adicionais.`,
};

// Extrai a lista de saudações do texto retornado pela IA (JSON, com tolerância a
// cercas de código ou numeração solta).
function parseGreetingOptions(raw: string): string[] {
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    const arr = Array.isArray(parsed) ? parsed : parsed.options;
    if (Array.isArray(arr)) {
      return arr.map((s) => String(s).trim()).filter(Boolean).slice(0, 3);
    }
  } catch {
    // cai no fallback abaixo
  }
  return cleaned
    .split(/\n\s*\n|\n(?=\s*\d+[\).]\s)/)
    .map((s) => s.replace(/^\s*\d+[\).]\s*/, '').replace(/^["']|["']$/g, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { field, description, context } = body as {
    field: 'greeting' | 'greetings' | 'instructions' | 'generate_function';
    description: string;
    context?: { agentName?: string; role?: string; niche?: string; tone?: string; sector?: string };
  };

  if (!field || !SYSTEM_PROMPTS[field]) {
    return NextResponse.json({ error: 'field deve ser "greeting", "greetings" ou "instructions"' }, { status: 400 });
  }
  if (!description || !description.trim()) {
    return NextResponse.json({ error: 'description é obrigatório' }, { status: 400 });
  }

  const ctx = context || {};
  const contextLines = [
    ctx.agentName ? `Nome do agente: ${ctx.agentName}` : null,
    ctx.role ? `Cargo/função: ${ctx.role}` : null,
    ctx.niche ? `Empresa/nicho: ${ctx.niche}` : null,
    ctx.tone ? `Tom de voz: ${ctx.tone}` : null,
    ctx.sector ? `Setor do negócio: ${ctx.sector}` : null,
  ].filter(Boolean).join('\n');

  const userMessage = [
    contextLines,
    `O que o agente deve fazer:\n${description.trim()}`,
  ].filter(Boolean).join('\n\n');

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-5.4-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[field] },
          { role: 'user', content: userMessage },
        ],
        temperature: field === 'greetings' ? 0.9 : 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Erro na geração: ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return NextResponse.json({ error: 'Resposta vazia da IA' }, { status: 502 });

    if (field === 'greetings') {
      const options = parseGreetingOptions(text);
      if (!options.length) return NextResponse.json({ error: 'Não consegui gerar as opções de saudação.' }, { status: 502 });
      return NextResponse.json({ options });
    }

    if (field === 'generate_function') {
      try {
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (!parsed.label || !parsed.prompt) throw new Error('Resposta incompleta');
        return NextResponse.json({ label: parsed.label, emoji: parsed.emoji || '⚙️', prompt: parsed.prompt });
      } catch {
        return NextResponse.json({ error: 'Não consegui gerar a função. Tente descrever de outra forma.' }, { status: 502 });
      }
    }

    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
