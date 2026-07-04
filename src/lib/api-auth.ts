import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dns from 'dns/promises';
import net from 'net';

// ============================================================================
// Helpers de autenticação/autorização para as rotas de API.
//
// Regra de ouro: NUNCA confie em `userId`/`agentId` vindos do corpo ou da query.
// Rotas chamadas pelo usuário logado usam `requireUser()` (valida o JWT da
// sessão e devolve o user real). Rotas chamadas por serviços internos
// (Windmill, Evolution) usam `requireInternalSecret()`.
// ============================================================================

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL ausente no ambiente.');
  return url;
}

// Cliente com Service Role — ignora RLS. Uso EXCLUSIVO no servidor, e sempre
// filtrando pelos ids derivados da sessão (nunca do payload do cliente).
export function getServiceSupabase(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.');
  return createClient(getSupabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type AuthOk = { ok: true; user: User };
export type AuthFail = { ok: false; response: NextResponse };
export type AuthResult = AuthOk | AuthFail;

function unauthorized(message = 'Não autenticado.'): AuthFail {
  return { ok: false, response: NextResponse.json({ error: message }, { status: 401 }) };
}

// Valida o token `Authorization: Bearer <jwt>` contra o Supabase e devolve o
// usuário autenticado. Use SEMPRE `user.id` — nunca um userId vindo do corpo.
export async function requireUser(req: Request): Promise<AuthResult> {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  const token = header?.toLowerCase().startsWith('bearer ')
    ? header.slice(7).trim()
    : null;
  if (!token) return unauthorized('Token de autenticação ausente.');

  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!anonKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Supabase não configurado (anon key ausente).' },
        { status: 500 },
      ),
    };
  }

  const supabase = createClient(getSupabaseUrl(), anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return unauthorized('Sessão inválida ou expirada.');

  return { ok: true, user: data.user };
}

// Verifica se o agente pertence ao usuário. Use após `requireUser` em qualquer
// rota que receba um agentId/instanceName do cliente.
export async function userOwnsAgent(agentId: string, userId: string): Promise<boolean> {
  if (!agentId) return false;
  const supabase = getServiceSupabase();
  const { data } = await supabase.from('agents').select('user_id').eq('id', agentId).maybeSingle();
  return !!data && data.user_id === userId;
}

// Extrai o agentId (uuid) de um instanceName no formato `agent_{uuid}[...]`.
export function agentIdFromInstanceName(instanceName: string): string | null {
  const m = instanceName.match(
    /^agent_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  );
  return m ? m[1] : null;
}

// Comparação em tempo constante de dois segredos (evita timing attack).
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

// Autoriza chamadas serviço-a-serviço (Windmill, cron, Evolution) por um
// segredo compartilhado enviado no header `x-internal-secret`.
export function requireInternalSecret(req: Request): AuthResult {
  const expected = process.env.INTERNAL_API_SECRET;
  if (!expected) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'INTERNAL_API_SECRET não configurado no servidor.' },
        { status: 500 },
      ),
    };
  }
  const provided = req.headers.get('x-internal-secret') || '';
  if (!provided || !safeEqual(provided, expected)) {
    return unauthorized('Segredo interno inválido.');
  }
  // `user` é irrelevante aqui; devolvemos um placeholder para manter o tipo.
  return { ok: true, user: { id: 'internal-service' } as User };
}

// ============================================================================
// Guarda anti-SSRF: garante que uma URL fornecida pelo usuário aponta para um
// host público (http/https) e não para localhost, rede interna ou o endpoint
// de metadados da cloud.
// ============================================================================

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    if (a === 10) return true;
    if (a === 127) return true; // loopback
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local / metadata (169.254.169.254)
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === '::1' || v === '::') return true; // loopback / unspecified
    if (v.startsWith('fc') || v.startsWith('fd')) return true; // ULA
    if (v.startsWith('fe80')) return true; // link-local
    if (v.startsWith('::ffff:')) return isPrivateIp(v.replace('::ffff:', '')); // IPv4-mapped
    return false;
  }
  return false;
}

export class SsrfError extends Error {}

// Lança SsrfError se a URL não for http(s) pública. Resolve o DNS e checa
// TODOS os IPs retornados para bloquear rebinding para faixas privadas.
export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError('URL inválida.');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new SsrfError('Apenas URLs http(s) são permitidas.');
  }

  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new SsrfError('Host não permitido.');
  }

  // Se o host já é um IP literal, valida direto.
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new SsrfError('Endereço de rede interna não permitido.');
    return url;
  }

  // Caso contrário, resolve o DNS e reprova se QUALQUER registro for privado.
  let addresses: string[] = [];
  try {
    const results = await dns.lookup(host, { all: true });
    addresses = results.map((r) => r.address);
  } catch {
    throw new SsrfError('Não foi possível resolver o host.');
  }
  if (addresses.length === 0) throw new SsrfError('Host sem endereço resolvível.');
  for (const addr of addresses) {
    if (isPrivateIp(addr)) throw new SsrfError('Host resolve para rede interna.');
  }
  return url;
}
