import type { SupabaseClient } from "@supabase/supabase-js";

// Limite simples por janela fixa (não é uma trava criptográfica — é defesa
// contra abuso/custo de OpenAI, não contra atacante sofisticado). Race
// condition entre requisições simultâneas é aceitável aqui: o pior caso é
// deixar passar 1-2 chamadas a mais na borda da janela.
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  route: string,
  limit: number,
  windowSeconds = 60,
): Promise<{ ok: boolean; retryAfterSeconds: number }> {
  const windowMs = windowSeconds * 1000;
  const windowStartMs = Math.floor(Date.now() / windowMs) * windowMs;
  const windowStart = new Date(windowStartMs).toISOString();
  const retryAfterSeconds = Math.ceil((windowStartMs + windowMs - Date.now()) / 1000);

  const { data: existing } = await supabase
    .from("api_rate_limits")
    .select("count")
    .eq("user_id", userId).eq("route", route).eq("window_start", windowStart)
    .maybeSingle();

  if (existing) {
    if (existing.count >= limit) return { ok: false, retryAfterSeconds };
    await supabase.from("api_rate_limits")
      .update({ count: existing.count + 1 })
      .eq("user_id", userId).eq("route", route).eq("window_start", windowStart);
    return { ok: true, retryAfterSeconds };
  }

  await supabase.from("api_rate_limits").insert({ user_id: userId, route, window_start: windowStart, count: 1 });
  return { ok: true, retryAfterSeconds };
}
