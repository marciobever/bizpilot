import { NextRequest, NextResponse } from "next/server";
import { requireUser, getServiceSupabase } from "@/lib/api-auth";

// Base de contatos que cresce sozinha a cada campanha disparada (ver POST
// /api/campaigns) — usada pra não precisar colar a mesma lista de novo.
export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const supabase = getServiceSupabase();

  const { data, error } = await supabase
    .from("campaign_contacts")
    .select("phone, name, updated_at")
    .eq("user_id", auth.user.id)
    .order("updated_at", { ascending: false })
    .limit(2000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ contacts: data ?? [] });
}
