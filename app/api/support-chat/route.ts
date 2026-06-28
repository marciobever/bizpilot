import { NextRequest, NextResponse } from "next/server";
import { TOOL_DEFINITIONS, executeTool, getUserPlan } from "./tools";
import { PLAN_LABEL, type PlanId } from "@/lib/plans";

const SYSTEM_PROMPT = `Você é o assistente do BizPilot — sistema de bots de WhatsApp para empresas brasileiras.
Você responde dúvidas E também pode fazer configurações diretamente pelo chat.

QUANDO USAR FERRAMENTAS:
- Usuário pede para mudar nome, tom, saudação, cargo ou nicho → use update_agent
- Usuário pede para adicionar uma regra/restrição → use add_rule
- Usuário quer adicionar informação ao bot (preços, horários, FAQ) → use add_knowledge
- Usuário pergunta como está configurado o bot → use get_agent_info
- Não há agentId no contexto → use list_agents para mostrar os bots disponíveis

REGRAS DE RESPOSTA:
- NUNCA use markdown: sem **, sem ##, sem asteriscos
- Texto simples, como mensagem de WhatsApp
- Use \\n para separar frases — nunca escreva tudo junto
- Máximo 3 linhas. Se tiver mais conteúdo, ofereça em suggestions
- Quando executar uma ação, confirme o que foi feito de forma curta e positiva
- Nunca diga "me avise se precisar de mais ajuda"

FORMATO DE RESPOSTA (JSON obrigatório para a resposta final):
{"reply": "texto aqui\\noutro parágrafo", "suggestions": ["Próxima ação 1", "Próxima ação 2"]}

CONHECIMENTO DO BIZPILOT:

Criar bot: Menu Agentes, Novo Agente, seguir o assistente. Depois conectar WhatsApp na aba Canais.

Conectar WhatsApp via QR Code:
1. Aba Canais do agente
2. Clicar em Conectar WhatsApp
3. Digitar nome da instância sem espaços
4. Escanear QR Code com o celular: WhatsApp > 3 pontinhos > Aparelhos conectados > Conectar aparelho

Conectar WhatsApp via Meta Cloud API: precisa de Phone Number ID, Access Token e WABA ID do painel business.facebook.com.

Base de Conhecimento: onde o bot aprende sobre a empresa. Pode ser texto, URL ou importar site inteiro.
Instruções do Bot: roteiro e personalidade. Use templates ou gere com IA.
Limites e Regras: barreiras que o bot nunca ultrapassa.
Funcionalidades (plano Profissional): Voz e Áudio, Memória de Dados, Ações Externas, E-mail, Pagamentos, Notificações Externas.
Funcionalidades (plano Avançado): Calendário, Banco de Dados Externo, Instagram, Facebook.
Integrações: Calendário (Avançado), Pagamentos - Pix/Mercado Pago/Stripe (Profissional), E-mail (Profissional, bot envia durante conversa), Notificações Externas - Zapier/Make (Profissional).
Planos: Básico (grátis), Profissional R$79,99/mês, Avançado R$119,99/mês.

REGRAS DE PLANO (CRÍTICO):
- Verifique o plano do usuário no CONTEXTO ATUAL antes de sugerir qualquer funcionalidade
- Se o plano for "basico": NÃO ofereça nem explique como configurar Voz, Memória, Ações Externas, E-mail, Pagamentos, Webhooks, Calendário, Instagram ou Facebook
- Se o plano for "profissional": NÃO ofereça Calendário, Banco de Dados Externo, Instagram ou Facebook
- Quando o usuário perguntar sobre feature bloqueada: informe que requer upgrade e diga o plano necessário
- NUNCA configure algo que o plano não permite

Problemas comuns:
- Bot não responde: verificar se WhatsApp está conectado na aba Canais e se o agente foi salvo
- WhatsApp desconectou: ir em Canais e escanear QR Code novamente
- Bot respondeu errado: adicionar mais conteúdo na Base de Conhecimento`;

type OAIMessage = { role: string; content: string | null; tool_calls?: any[]; tool_call_id?: string };

async function callOpenAI(messages: OAIMessage[], useTools: boolean) {
  const body: any = {
    model: "gpt-4o-mini",
    messages,
    temperature: 0.4,
    max_tokens: 250,
  };
  if (useTools) {
    body.tools = TOOL_DEFINITIONS;
    body.tool_choice = "auto";
  }
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function parseReply(raw: string): { reply: string; suggestions: string[] } {
  try {
    const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return { reply: String(parsed.reply || "").trim(), suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [] };
  } catch {
    return { reply: raw.trim(), suggestions: [] };
  }
}

export async function POST(req: NextRequest) {
  const { messages, context } = await req.json() as {
    messages: { role: "user" | "assistant"; content: string }[];
    context?: { userId?: string; agentId?: string };
  };

  if (!messages?.length) return NextResponse.json({ error: "messages obrigatório" }, { status: 400 });

  const userId = context?.userId || "";
  const agentId = context?.agentId || "";

  const userPlan = userId ? await getUserPlan(userId) : "basico";
  const planLabel = PLAN_LABEL[(userPlan as PlanId)] ?? userPlan;

  const contextNote = [
    agentId ? `agentId do bot atual: ${agentId}` : "Usuário não está em nenhum bot específico agora.",
    userId ? `userId: ${userId}` : "",
    `Plano do usuário: ${userPlan} (${planLabel}) — respeite rigorosamente as restrições de plano.`,
  ].filter(Boolean).join(" | ");

  const systemMsg = { role: "system", content: `${SYSTEM_PROMPT}\n\nCONTEXTO ATUAL: ${contextNote}` };
  const history: OAIMessage[] = messages.map(({ role, content }) => ({ role, content }));
  let oaiMessages: OAIMessage[] = [systemMsg, ...history];

  try {
    let data = await callOpenAI(oaiMessages, !!userId);
    let choice = data.choices[0];

    // Function calling loop (max 3 rounds)
    for (let i = 0; i < 3 && choice.finish_reason === "tool_calls"; i++) {
      const assistantMsg = choice.message;
      oaiMessages = [...oaiMessages, assistantMsg];

      for (const call of assistantMsg.tool_calls || []) {
        const args = JSON.parse(call.function.arguments || "{}");
        const result = await executeTool(call.function.name, args, userId);
        oaiMessages.push({ role: "tool", content: result, tool_call_id: call.id });
      }

      data = await callOpenAI(oaiMessages, false);
      choice = data.choices[0];
    }

    const raw = choice.message?.content?.trim();
    if (!raw) return NextResponse.json({ error: "Resposta vazia" }, { status: 502 });

    const { reply, suggestions } = parseReply(raw);
    return NextResponse.json({ reply, suggestions });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
