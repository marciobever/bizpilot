import { NextRequest, NextResponse } from "next/server";
import { requireUser, getServiceSupabase, userOwnsAgent } from "@/lib/api-auth";

// Gera o arquivo de arquivamento (JSON) com todo o histórico do agente antes
// de ele ser apagado — conversas, mensagens e um snapshot do lead de cada uma.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const { id: agentId } = await params;

  if (!(await userOwnsAgent(agentId, auth.user.id))) {
    return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
  }

  const supabase = getServiceSupabase();

  const [{ data: agent }, { data: conversations }] = await Promise.all([
    supabase.from("agents").select("id, name, type, created_at").eq("id", agentId).single(),
    supabase.from("conversations").select("id, status, channel, created_at, last_message_at, lead:leads(name, phone, email)").eq("agent_id", agentId),
  ]);

  const conversationIds = (conversations ?? []).map((c: any) => c.id);
  const { data: messages } = conversationIds.length > 0
    ? await supabase.from("messages").select("conversation_id, sender_type, content, media_url, media_type, created_at").in("conversation_id", conversationIds).order("created_at", { ascending: true })
    : { data: [] as any[] };

  const messagesByConversation = new Map<string, any[]>();
  for (const m of messages ?? []) {
    const arr = messagesByConversation.get(m.conversation_id) || [];
    arr.push({ sender: m.sender_type, content: m.content, media_url: m.media_url, media_type: m.media_type, created_at: m.created_at });
    messagesByConversation.set(m.conversation_id, arr);
  }

  const archive = {
    exported_at: new Date().toISOString(),
    agent: { id: agent?.id, name: agent?.name, type: agent?.type, created_at: agent?.created_at },
    conversations: (conversations ?? []).map((c: any) => ({
      id: c.id,
      status: c.status,
      channel: c.channel,
      created_at: c.created_at,
      last_message_at: c.last_message_at,
      lead: c.lead ? { name: c.lead.name, phone: c.lead.phone, email: c.lead.email } : null,
      messages: messagesByConversation.get(c.id) || [],
    })),
  };

  return NextResponse.json(archive, {
    headers: {
      "Content-Disposition": `attachment; filename="historico-${(agent?.name || "agente").replace(/[^a-z0-9-]/gi, "_")}.json"`,
    },
  });
}
