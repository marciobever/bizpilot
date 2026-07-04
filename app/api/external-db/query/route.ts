import { NextRequest, NextResponse } from 'next/server';
import { requireInternalSecret, getServiceSupabase, assertPublicHttpUrl } from '@/lib/api-auth';

const MAX_RESULTS = 5;

async function querySupabase(config: any, termo: string) {
  const { projectUrl, apiKey, table, searchColumn } = config;
  const base = await assertPublicHttpUrl(String(projectUrl));
  const url = `${base.toString().replace(/\/$/, '')}/rest/v1/${encodeURIComponent(table)}?${encodeURIComponent(searchColumn)}=ilike.*${encodeURIComponent(termo)}*&limit=${MAX_RESULTS}`;
  const res = await fetch(url, { headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` } });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Erro ao consultar a tabela.');
  return data;
}

// Converte um valor de campo do Firestore REST (ex: { stringValue: "x" }) em valor nativo.
function firestoreValue(v: any): any {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('mapValue' in v) return firestoreDoc(v.mapValue.fields || {});
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(firestoreValue);
  return null;
}

function firestoreDoc(fields: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(fields || {})) out[k] = firestoreValue(v);
  return out;
}

async function queryFirebase(config: any, termo: string) {
  const { projectId, apiKey, collection, searchField } = config;
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${encodeURIComponent(collection)}?key=${encodeURIComponent(apiKey)}&pageSize=100`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Erro ao consultar a coleção.');

  const termoLower = termo.toLowerCase();
  const docs = (data.documents || []).map((d: any) => firestoreDoc(d.fields || {}));
  return docs
    .filter((doc: any) => String(doc[searchField] ?? '').toLowerCase().includes(termoLower))
    .slice(0, MAX_RESULTS);
}

// POST /api/external-db/query
// Chamado pelo Windmill (tool `consultar_dados_externos`) quando o agente
// precisa buscar uma informação no banco de dados próprio do usuário.
export async function POST(req: NextRequest) {
  const auth = requireInternalSecret(req);
  if (!auth.ok) return auth.response;

  const { agentId, termo } = await req.json();

  if (!agentId || !termo) {
    return NextResponse.json({ error: 'agentId e termo são obrigatórios' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const { data: agent, error: agentErr } = await supabase
    .from('agents').select('user_id').eq('id', agentId).single();
  if (agentErr || !agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 });

  const { data: integration, error: intErr } = await supabase
    .from('integrations').select('status, config')
    .eq('user_id', agent.user_id).eq('provider', 'external_db').maybeSingle();

  if (intErr || !integration || integration.status !== 'connected') {
    return NextResponse.json({ error: 'Banco de dados externo não conectado para este usuário.' }, { status: 400 });
  }

  const config = integration.config as any;

  try {
    const results = config.provider === 'firebase'
      ? await queryFirebase(config, String(termo))
      : await querySupabase(config, String(termo));

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
