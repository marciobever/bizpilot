import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPTS: Record<string, string> = {
  greeting: `Você é um especialista em copywriting para atendimento via WhatsApp. Sua tarefa é escrever a mensagem de saudação que um agente de IA usará para INICIAR conversas com clientes — é a primeira impressão do negócio, então precisa ser acolhedora e dar direção.

Estrutura ideal (2 a 4 linhas curtas, fáceis de ler no celular):
1. Boas-vindas calorosas citando o nome da empresa/negócio (quando houver um claro).
2. Apresentação breve do agente: nome + no que ele ajuda.
3. Uma pergunta de encerramento que conduza o cliente ao próximo passo, oferecendo de 2 a 3 opções concretas baseadas no que o negócio realmente faz (ex.: "comprar, alugar ou outra dúvida?", "qual produto você procura?", "quer agendar ou tirar uma dúvida?").

Regras:
- Português do Brasil, tom natural e humano. NUNCA termine com o clichê genérico "Como posso te ajudar hoje?" — sempre ofereça opções concretas.
- Respeite o tom de voz indicado. Use no máximo 1 emoji, e só se o tom permitir (evite emojis em tons "Profissional e Direto" ou "Técnico e Especialista").
- Baseie o contexto e as opções no que o usuário descreveu sobre o negócio, não apenas no nicho cru. Se o nicho informado parecer incompleto ou estranho, priorize a descrição.
- Não invente nome de empresa: se não houver um claro, faça as boas-vindas sem citar nome.
- Não use markdown, asteriscos, aspas, nem explicações. Responda APENAS com o texto da saudação, pronto para uso.`,
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

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { field, description, context } = body as {
    field: 'greeting' | 'instructions';
    description: string;
    context?: { agentName?: string; role?: string; niche?: string; tone?: string };
  };

  if (!field || !SYSTEM_PROMPTS[field]) {
    return NextResponse.json({ error: 'field deve ser "greeting" ou "instructions"' }, { status: 400 });
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
  ].filter(Boolean).join('\n');

  const userMessage = [
    contextLines,
    `O que o usuário descreveu sobre o que o bot deve fazer:\n${description.trim()}`,
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
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Erro na geração: ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return NextResponse.json({ error: 'Resposta vazia da IA' }, { status: 502 });

    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
