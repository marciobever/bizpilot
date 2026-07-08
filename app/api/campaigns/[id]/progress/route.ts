import { NextRequest, NextResponse } from "next/server";
import { requireInternalSecret, getServiceSupabase } from "@/lib/api-auth";

// Chamado pelo Windmill após cada envio (ou no fim do lote) para reportar
// o resultado de um destinatário e, opcionalmente, fechar a campanha.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireInternalSecret(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const body = await req.json() as {
    recipientId?: string; status?: "sent" | "failed"; error?: string; finished?: boolean;
  };

  const supabase = getServiceSupabase();

  if (body.recipientId && body.status) {
    await supabase.from("campaign_recipients").update({
      status: body.status,
      error: body.error ?? null,
      sent_at: body.status === "sent" ? new Date().toISOString() : null,
    }).eq("id", body.recipientId);

    // Windmill envia sequencialmente (1 por vez) — sem concorrência aqui,
    // então read-then-write é seguro sem precisar de função SQL dedicada.
    const column = body.status === "sent" ? "sent_count" : "failed_count";
    const { data: current } = await supabase.from("campaigns").select(column).eq("id", id).single();
    const nextValue = ((current as any)?.[column] ?? 0) + 1;
    await supabase.from("campaigns").update({ [column]: nextValue }).eq("id", id);
  }

  if (body.finished) {
    await supabase.from("campaigns").update({
      status: "done",
      finished_at: new Date().toISOString(),
    }).eq("id", id);
  }

  return NextResponse.json({ ok: true });
}
