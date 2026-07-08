import crypto from "crypto";

// State assinado pro round-trip OAuth do Google (calendário/e-mail). O ponto
// central: o userId embutido vem SEMPRE de uma sessão autenticada no momento
// da emissão (nunca de query string) — sem isso, um CSRF poderia induzir a
// vítima a autorizar o Google dela e o token acabar salvo na conta de outra
// pessoa (o round-trip do OAuth não tem como saber "de quem" é o clique).
// Reaproveita INTERNAL_API_SECRET (já existe, evita mais uma env).

const TTL_MS = 10 * 60 * 1000; // 10 minutos — tempo de sobra pra tela de consentimento do Google

function getSecret(): string {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) throw new Error("INTERNAL_API_SECRET ausente — necessário pra assinar o state do OAuth.");
  return secret;
}

function base64url(input: Buffer): string {
  return input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function signOAuthState(payload: Record<string, string>): string {
  const body = { ...payload, exp: Date.now() + TTL_MS };
  const encoded = base64url(Buffer.from(JSON.stringify(body)));
  const sig = base64url(crypto.createHmac("sha256", getSecret()).update(encoded).digest());
  return `${encoded}.${sig}`;
}

export function verifyOAuthState<T extends Record<string, string> = Record<string, string>>(
  state: string,
): (T & { exp: number }) | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;

  const expectedSig = base64url(crypto.createHmac("sha256", getSecret()).update(encoded).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
