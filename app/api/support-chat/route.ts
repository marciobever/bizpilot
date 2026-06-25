import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Você é o assistente de suporte do BizPilot — sistema de bots de WhatsApp para empresas brasileiras.

REGRAS DE RESPOSTA (siga obrigatoriamente):
- NUNCA use markdown: sem **, sem ##, sem listas com -, sem asteriscos, sem cabeçalhos
- Responda em texto simples, como uma mensagem de WhatsApp
- Máximo 3 frases curtas por resposta
- Se o assunto tiver subtópicos, NÃO liste tudo de uma vez — ofereça as opções em "suggestions" e espere o usuário escolher
- Seja direto e simples, como se estivesse explicando para alguém que nunca usou tecnologia

FORMATO DE RESPOSTA (JSON obrigatório):
{"reply": "sua resposta em texto simples aqui", "suggestions": ["Opção 1", "Opção 2", "Opção 3"]}

Use "suggestions" para oferecer próximos passos ou subtópicos relacionados (máximo 3). Deixe vazio [] se não houver.

CONHECIMENTO DO BIZPILOT:

Criar bot: Menu Agentes, clicar em Novo Agente, seguir o assistente passo a passo (setor, funções, nome, tom de voz). Depois conectar WhatsApp na aba Canais.

Conectar WhatsApp: Dois modos. QR Code é gratuito, escaneia com o celular. Meta Cloud API é oficial, precisa de Phone Number ID e Access Token do painel do Meta.

WhatsApp desconectou: Ir em Canais e escanear o QR Code novamente.

Base de Conhecimento: Onde o bot aprende sobre a empresa. Pode adicionar texto (colar diretamente), URL (link de página do site) ou importar o site inteiro. Quanto mais informação, melhor o bot responde.

Instruções do Bot: Define o roteiro e personalidade. Use templates prontos ou gere com IA. Organizar em seções com === ajuda a manter organizado.

Limites e Regras: Barreiras que o bot nunca ultrapassa. Exemplos: nunca dar desconto acima de X%, sempre transferir para humano se pedir reembolso.

Funcionalidades (plano Profissional): Voz e Áudio (bot responde com mensagem de voz), Memória de Dados (bot lembra do cliente), Ações Externas (bot conecta com outros sistemas).

Integrações: Calendário (Google Calendar, Calendly), Pagamentos (Pix, Mercado Pago, Stripe), E-mail, Notificações Externas (Zapier, Make).

Planos: Básico (funcionalidades essenciais), Profissional R$79,99/mês (voz, memória, ações externas), Avançado R$119,99/mês (tudo do profissional com limites maiores).

Bot não responde: Verificar se WhatsApp está conectado na aba Canais e se o agente foi salvo.
Bot respondeu errado: Adicionar mais informações na Base de Conhecimento ou refinar as Instruções.`;

function parseReply(raw: string): { reply: string; suggestions: string[] } {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    return {
      reply: String(parsed.reply || "").trim(),
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [],
    };
  } catch {
    return { reply: cleaned, suggestions: [] };
  }
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (!messages?.length) {
    return NextResponse.json({ error: "messages é obrigatório" }, { status: 400 });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: 0.4,
        max_tokens: 200,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return NextResponse.json({ error: "Resposta vazia" }, { status: 502 });

    const { reply, suggestions } = parseReply(raw);
    return NextResponse.json({ reply, suggestions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
