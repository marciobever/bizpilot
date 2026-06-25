import { createClient } from "@supabase/supabase-js";
import { ingestKnowledgeEntry } from "@/lib/knowledge";

function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase não configurado");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "list_agents",
      description: "Lista os bots do usuário. Use quando o usuário não estiver em nenhum agente específico.",
      parameters: {
        type: "object",
        properties: { user_id: { type: "string" } },
        required: ["user_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_agent_info",
      description: "Lê as configurações atuais do bot: nome, tom, saudação, cargo, nicho e regras.",
      parameters: {
        type: "object",
        properties: { agent_id: { type: "string" } },
        required: ["agent_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_agent",
      description: "Atualiza nome, tom de voz, saudação, cargo ou nicho do bot.",
      parameters: {
        type: "object",
        properties: {
          agent_id: { type: "string" },
          field: {
            type: "string",
            enum: ["name", "tone", "greeting", "role", "niche"],
          },
          value: { type: "string" },
        },
        required: ["agent_id", "field", "value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_rule",
      description: "Adiciona uma regra ou restrição ao bot.",
      parameters: {
        type: "object",
        properties: {
          agent_id: { type: "string" },
          rule: { type: "string" },
        },
        required: ["agent_id", "rule"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_knowledge",
      description: "Adiciona um texto à base de conhecimento do bot.",
      parameters: {
        type: "object",
        properties: {
          agent_id: { type: "string" },
          title: { type: "string" },
          content: { type: "string" },
        },
        required: ["agent_id", "title", "content"],
      },
    },
  },
];

async function verifyOwnership(db: ReturnType<typeof getDb>, agentId: string, userId: string) {
  const { data } = await db.from("agents").select("user_id").eq("id", agentId).single();
  return data?.user_id === userId;
}

export async function executeTool(
  name: string,
  args: Record<string, string>,
  userId: string
): Promise<string> {
  const db = getDb();

  if (name === "list_agents") {
    const { data } = await db
      .from("agents")
      .select("id, name, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!data?.length) return "Nenhum bot encontrado.";
    return data.map((a: any) => `• ${a.name} (${a.status})`).join("\n");
  }

  if (!await verifyOwnership(db, args.agent_id, userId)) {
    return "Erro: agente não encontrado ou sem permissão.";
  }

  switch (name) {
    case "get_agent_info": {
      const { data } = await db.from("agents").select("name, config").eq("id", args.agent_id).single();
      if (!data) return "Agente não encontrado.";
      const cfg = data.config || {};
      return JSON.stringify({
        nome: data.name,
        tom: cfg.tone || "não definido",
        saudacao: cfg.greeting || "não definida",
        cargo: cfg.role || "não definido",
        nicho: cfg.niche || "não definido",
        regras: cfg.limitations || [],
      });
    }

    case "update_agent": {
      const { agent_id, field, value } = args;
      if (field === "name") {
        await db.from("agents").update({ name: value }).eq("id", agent_id);
        return `Nome atualizado para "${value}".`;
      }
      const { data } = await db.from("agents").select("config").eq("id", agent_id).single();
      const config = { ...(data?.config || {}), [field]: value };
      await db.from("agents").update({ config }).eq("id", agent_id);
      const labels: Record<string, string> = { tone: "Tom de voz", greeting: "Saudação", role: "Cargo", niche: "Nicho" };
      return `${labels[field] || field} atualizado para "${value}".`;
    }

    case "add_rule": {
      const { data } = await db.from("agents").select("config").eq("id", args.agent_id).single();
      const config = data?.config || {};
      const limitations = Array.isArray(config.limitations) ? [...config.limitations, args.rule] : [args.rule];
      await db.from("agents").update({ config: { ...config, limitations } }).eq("id", args.agent_id);
      return `Regra adicionada: "${args.rule}"`;
    }

    case "add_knowledge": {
      const { data: agent } = await db.from("agents").select("user_id").eq("id", args.agent_id).single();
      await ingestKnowledgeEntry({
        agentId: args.agent_id,
        userId: agent!.user_id,
        title: args.title,
        content: args.content,
        sourceType: "text",
      });
      return `Conteúdo "${args.title}" adicionado à base de conhecimento.`;
    }

    default:
      return "Ferramenta não reconhecida.";
  }
}
