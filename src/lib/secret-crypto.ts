import crypto from "crypto";

// Criptografia de campos sensíveis em integrations.config (refresh tokens,
// senha SMTP, segredo de webhook, API keys de banco externo) — hoje ficam em
// texto puro no banco. AES-256-GCM com chave própria (não reaproveita
// INTERNAL_API_SECRET: são segredos de natureza diferente, cada um com seu
// blast radius se vazar).
//
// Modo compatível de propósito: decryptSecret() devolve o valor como veio se
// não estiver no formato criptografado (registros antigos, ou chave ainda não
// configurada) — sem isso, uma integração já conectada pararia de funcionar
// no primeiro deploy. Escritas novas sempre criptografam.

const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const raw = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!raw) return null;
  // Aceita chave em base64 (32 bytes) ou qualquer string (deriva 32 bytes via sha256).
  try {
    const b64 = Buffer.from(raw, "base64");
    if (b64.length === 32) return b64;
  } catch { /* cai no derive abaixo */ }
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain: string): string {
  const key = getKey();
  if (!key || !plain) return plain; // sem chave configurada: no-op (não quebra o app)
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

export function decryptSecret(value: string | null | undefined): string | null | undefined {
  if (!value || !value.startsWith(PREFIX)) return value; // texto puro (legado) ou vazio — passa direto
  const key = getKey();
  if (!key) return value; // sem chave: não dá pra decifrar, devolve como está (vai falhar no uso, mas não quebra a leitura)
  try {
    const raw = Buffer.from(value.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null; // corrompido ou chave errada — melhor falhar limpo do que devolver lixo
  }
}

// Aplica encrypt/decrypt só nas chaves sensíveis de um objeto config,
// preservando o resto (pixKey, calendarId, provider etc não precisam disso).
export function encryptConfigFields<T extends Record<string, any>>(config: T, fields: (keyof T)[]): T {
  const out = { ...config };
  for (const f of fields) {
    if (typeof out[f] === "string") out[f] = encryptSecret(out[f]) as any;
  }
  return out;
}

export function decryptConfigFields<T extends Record<string, any>>(config: T, fields: (keyof T)[]): T {
  const out = { ...config };
  for (const f of fields) {
    if (typeof out[f] === "string") out[f] = decryptSecret(out[f]) as any;
  }
  return out;
}
