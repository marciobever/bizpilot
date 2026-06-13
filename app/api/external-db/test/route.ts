import { NextResponse } from 'next/server';

// Valida as credenciais do banco de dados externo do usuário (Supabase ou
// Firebase/Firestore) consultando a tabela/coleção informada. Usado pelo
// botão "Salvar Conexão" da integração "Banco de Dados Externo".
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { provider } = body;

    if (provider === 'supabase') {
      const { projectUrl, apiKey, table } = body;
      if (!projectUrl || !apiKey || !table) {
        return NextResponse.json({ success: false, error: 'Informe a URL do projeto, a chave de API e o nome da tabela.' }, { status: 400 });
      }
      const url = `${String(projectUrl).replace(/\/$/, '')}/rest/v1/${encodeURIComponent(table)}?select=*&limit=1`;
      const res = await fetch(url, { headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` } });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json({ success: false, error: data?.message || `Não foi possível acessar a tabela "${table}". Verifique a URL, a chave e o nome da tabela.` }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    if (provider === 'firebase') {
      const { projectId, apiKey, collection } = body;
      if (!projectId || !apiKey || !collection) {
        return NextResponse.json({ success: false, error: 'Informe o ID do projeto, a chave de API e o nome da coleção.' }, { status: 400 });
      }
      const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/${encodeURIComponent(collection)}?key=${encodeURIComponent(apiKey)}&pageSize=1`;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return NextResponse.json({ success: false, error: data?.error?.message || `Não foi possível acessar a coleção "${collection}". Verifique o ID do projeto, a chave e as regras de segurança do Firestore.` }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Provedor não suportado.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
