import { NextRequest, NextResponse } from "next/server";
import { requireUser, getServiceSupabase, assertPublicHttpUrl, SsrfError } from "@/lib/api-auth";
import { normalizePlan, computeCampaignQuota, addonCountsFromRows } from "@/lib/plans";
import { normalizeBrazilPhone } from "@/lib/phone";

// Limite de segurança por disparo — evita que uma lista gigante estoure a
// cota inteira de uma vez ou derrube a instância Evolution (rate limit do WhatsApp).
const MAX_RECIPIENTS_PER_CAMPAIGN = 500;

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("campaigns")
    .select("id, name, message, status, total_recipients, sent_count, failed_count, created_at, finished_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Cota do mês corrente (soma de sent_count de todas as campanhas desde o dia 1).
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { data: monthRows } = await supabase
    .from("campaigns")
    .select("sent_count")
    .eq("user_id", auth.user.id)
    .gte("created_at", monthStart.toISOString());
  const usedThisMonth = (monthRows ?? []).reduce((acc, r) => acc + (r.sent_count ?? 0), 0);

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", auth.user.id).single();
  const { data: addonRows } = await supabase.from("user_addons").select("addon_id, status, current_period_end").eq("user_id", auth.user.id);
  const extra = addonCountsFromRows(addonRows as any)["addon_campaigns"] ?? 0;
  const quota = computeCampaignQuota(profile?.plan, extra);

  return NextResponse.json({ campaigns: data, quota: { used: usedThisMonth, limit: quota } });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

  const body = await req.json() as {
    agentId?: string; name?: string; message?: string; imageUrl?: string;
    recipients?: { phone: string; name?: string }[];
  };
  const message = (body.message || "").trim();
  const name = (body.name || "").trim() || "Campanha";
  const imageUrl = (body.imageUrl || "").trim();
  if (imageUrl) {
    try {
      const url = await assertPublicHttpUrl(imageUrl);
      // A Evolution só aceita jpeg/png/webp — checar aqui evita criar a
      // campanha inteira pra descobrir só no Windmill que a URL não é imagem.
      const head = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
      const contentType = head.headers.get("content-type") || "";
      if (!/^image\/(jpeg|png|webp)/i.test(contentType)) {
        return NextResponse.json({
          error: `Essa URL não é um arquivo de imagem direto (veio como "${contentType || "desconhecido"}"). Cole o link direto do arquivo .jpg/.png/.webp — não o link de uma página que exibe a imagem.`,
        }, { status: 400 });
      }
    } catch (e) {
      if (e instanceof SsrfError) return NextResponse.json({ error: e.message }, { status: 400 });
      return NextResponse.json({ error: "Não consegui acessar essa URL de imagem. Confira se ela é pública." }, { status: 400 });
    }
  }
  // Normaliza cada telefone pro padrão do WhatsApp (55+DDD+9 dígitos) — aceita
  // qualquer formato colado pelo usuário; descarta o que não dá pra corrigir.
  const seenPhones = new Set<string>();
  const recipients = (body.recipients ?? [])
    .map((r) => ({ norm: normalizeBrazilPhone(r.phone || ""), name: (r.name || "").trim() || null }))
    .filter((r) => r.norm.valid)
    .map((r) => ({ phone: r.norm.phone, name: r.name }))
    .filter((r) => (seenPhones.has(r.phone) ? false : (seenPhones.add(r.phone), true))); // dedupe

  if (!body.agentId) return NextResponse.json({ error: "Selecione um agente." }, { status: 400 });
  if (!message) return NextResponse.json({ error: "A mensagem não pode ficar vazia." }, { status: 400 });
  if (recipients.length === 0) return NextResponse.json({ error: "Nenhum número de telefone válido na lista." }, { status: 400 });
  if (recipients.length > MAX_RECIPIENTS_PER_CAMPAIGN) {
    return NextResponse.json({ error: `Máximo de ${MAX_RECIPIENTS_PER_CAMPAIGN} contatos por campanha.` }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const { data: agent, error: agentError } = await supabase
    .from("agents").select("id, user_id, config").eq("id", body.agentId).single();
  if (agentError || !agent || agent.user_id !== userId) {
    return NextResponse.json({ error: "Agente não encontrado." }, { status: 404 });
  }
  const cfg = typeof agent.config === "string" ? JSON.parse(agent.config) : agent.config || {};
  const wa = cfg.whatsapp || {};
  // Meta Cloud API exige template pré-aprovado pra iniciar conversa fora da
  // janela de 24h — disparo de texto livre em massa violaria a política.
  if (wa.provider !== "evolution" || !wa.evolution?.connected) {
    return NextResponse.json({
      error: "Campanhas exigem um agente conectado via WhatsApp Evolution (QR Code). Conecte na aba Canais.",
    }, { status: 400 });
  }

  // Checa a cota do mês antes de aceitar a campanha.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const { data: monthRows } = await supabase
    .from("campaigns").select("sent_count").eq("user_id", userId).gte("created_at", monthStart.toISOString());
  const usedThisMonth = (monthRows ?? []).reduce((acc, r) => acc + (r.sent_count ?? 0), 0);

  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", userId).single();
  const { data: addonRows } = await supabase.from("user_addons").select("addon_id, status, current_period_end").eq("user_id", userId);
  const extra = addonCountsFromRows(addonRows as any)["addon_campaigns"] ?? 0;
  const quota = computeCampaignQuota(profile?.plan, extra);

  if (usedThisMonth + recipients.length > quota) {
    const remaining = Math.max(0, quota - usedThisMonth);
    return NextResponse.json({
      error: quota === 0
        ? "Seu plano não inclui disparos de campanha. Contrate o complemento Campanhas Extras."
        : `Cota de campanhas quase esgotada: restam ${remaining} disparo(s) este mês. Compre Campanhas Extras para liberar mais.`,
    }, { status: 400 });
  }

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({ user_id: userId, agent_id: body.agentId, name, message, image_url: imageUrl || null, total_recipients: recipients.length })
    .select("id").single();
  if (campaignError) return NextResponse.json({ error: campaignError.message }, { status: 500 });

  const { error: recError } = await supabase
    .from("campaign_recipients")
    .insert(recipients.map((r) => ({ campaign_id: campaign.id, phone: r.phone, name: r.name })));
  if (recError) return NextResponse.json({ error: recError.message }, { status: 500 });

  // Dispara o envio no Windmill (fire-and-forget — progresso é consultado via GET).
  // Token dedicado só a este script (rota fixa do campaign_sender).
  const windmillToken = process.env.WINDMILL_CAMPAIGN_TOKEN;
  if (windmillToken) {
    fetch("https://windmill.seureview.com.br/api/w/foodsnap/jobs/run/p/u/bevervansomarcio/bizpilot/campaign_sender", {
      method: "POST",
      headers: { Authorization: `Bearer ${windmillToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId: campaign.id }),
    }).catch((e) => console.error("[campaigns] falha ao disparar Windmill:", e));
  } else {
    console.warn("[campaigns] WINDMILL_CAMPAIGN_TOKEN não configurada — campanha ficará em 'queued'.");
  }

  return NextResponse.json({ id: campaign.id });
}
