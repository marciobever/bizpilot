import { NextRequest, NextResponse } from "next/server";
import { requireInternalSecret, getServiceSupabase } from "@/lib/api-auth";
import { getUserEmail } from "@/lib/billing/notices";
import { sendSystemEmail } from "@/lib/systemMail";

export const maxDuration = 300;

// Relatório semanal por e-mail (chamado pelo Windmill 1x/semana, com
// x-internal-secret): resumo de leads, conversas, respostas da IA e
// agendamentos dos últimos 7 dias, por conta ativa. Contas sem nenhuma
// atividade na semana não recebem (evita e-mail vazio de conta parada).
export async function POST(req: NextRequest) {
  const auth = requireInternalSecret(req);
  if (!auth.ok) return auth.response;

  const supabase = getServiceSupabase();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sinceLabel = new Date(since).toLocaleDateString("pt-BR");

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id")
    .in("subscription_status", ["active", "trialing"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  for (const u of users ?? []) {
    const [leads, convos, aiReplies, bookings] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true })
        .eq("user_id", u.id).gte("created_at", since),
      supabase.from("conversations").select("id", { count: "exact", head: true })
        .eq("user_id", u.id).gte("last_message_at", since),
      supabase.from("usage_logs").select("id", { count: "exact", head: true })
        .eq("user_id", u.id).gte("created_at", since),
      supabase.from("bookings").select("id", { count: "exact", head: true })
        .eq("user_id", u.id).gte("created_at", since),
    ]);

    const nLeads = leads.count ?? 0;
    const nConvos = convos.count ?? 0;
    const nAi = aiReplies.count ?? 0;
    const nBookings = bookings.count ?? 0;
    if (nLeads + nConvos + nAi + nBookings === 0) continue;

    const email = await getUserEmail(supabase, u.id);
    if (!email) continue;

    const rows = [
      { label: "Novos leads", value: nLeads },
      { label: "Conversas movimentadas", value: nConvos },
      { label: "Respostas da IA", value: nAi },
      { label: "Agendamentos", value: nBookings },
    ];
    const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a2e">
      <h2 style="margin:0 0 6px">Sua semana no BizPilot 📊</h2>
      <p style="color:#666;margin:0 0 20px">Resumo desde ${sinceLabel}</p>
      <table style="width:100%;border-collapse:collapse">
        ${rows.map((r) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #eee">${r.label}</td>
          <td style="padding:10px 0;border-bottom:1px solid #eee;text-align:right;font-size:20px;font-weight:bold">${r.value}</td>
        </tr>`).join("")}
      </table>
      <p style="margin:28px 0">
        <a href="${process.env.APP_BASE_URL || "https://bizpilot.com.br"}/app" style="background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:bold">Ver detalhes no painel</a>
      </p>
      <p style="color:#888;font-size:12px;margin-top:32px">Você recebe este resumo uma vez por semana enquanto sua conta estiver ativa.</p>
    </div>`;
    const text = `Sua semana no BizPilot (desde ${sinceLabel}): ${rows.map((r) => `${r.label}: ${r.value}`).join(" | ")}. Detalhes: ${process.env.APP_BASE_URL || "https://bizpilot.com.br"}/app`;

    try {
      await sendSystemEmail(email, "Sua semana no BizPilot — resumo do agente", text, html);
      sent++;
    } catch (e) {
      console.error(`[weekly-report] falha ao enviar para ${u.id}:`, e);
    }
  }

  return NextResponse.json({ users_checked: users?.length ?? 0, reports_sent: sent });
}
