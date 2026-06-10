import { createClient } from '@supabase/supabase-js';

// Versão da Graph API do WhatsApp Cloud (Meta Oficial).
export const GRAPH_API_VERSION = 'v21.0';

export function graphUrl(path: string) {
  return `https://graph.facebook.com/${GRAPH_API_VERSION}/${path}`;
}

// Cliente Supabase com Service Role para uso EXCLUSIVO no servidor
// (rotas /api/meta). Necessário porque o webhook da Meta chega sem sessão
// de usuário e precisamos descobrir a qual agente o número pertence.
export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente no ambiente.');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Extrai os dados relevantes de uma config de agente para o canal Meta.
export function getMetaConfig(config: any): {
  provider?: string;
  phoneNumberId?: string;
  accessToken?: string;
  wabaId?: string;
  verifyToken?: string;
} {
  const cfg = typeof config === 'string' ? safeParse(config) : config || {};
  const wa = cfg.whatsapp || {};
  const meta = wa.meta || {};
  return {
    provider: wa.provider,
    phoneNumberId: meta.phoneNumberId,
    accessToken: meta.accessToken,
    wabaId: meta.wabaId,
    verifyToken: meta.verifyToken,
  };
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
