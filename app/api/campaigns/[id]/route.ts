import { NextRequest, NextResponse } from "next/server";
import { requireUser, getServiceSupabase } from "@/lib/api-auth";

// Detalhe de uma campanha do usuário logado, com o status de cada destinatário
// (pra tela de histórico mostrar número a número sendo enviado).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const supabase = getServiceSupabase();
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("id, name, message, image_url, status, total_recipients, sent_count, failed_count, created_at, started_at, finished_at, user_id")
    .eq("id", id).single();
  if (error || !campaign || campaign.user_id !== auth.user.id) {
    return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
  }

  const { data: recipients } = await supabase
    .from("campaign_recipients")
    .select("id, phone, name, status, error, sent_at")
    .eq("campaign_id", id)
    .order("sent_at", { ascending: true, nullsFirst: false });

  const { user_id, ...campaignSafe } = campaign;
  return NextResponse.json({ campaign: campaignSafe, recipients: recipients ?? [] });
}
