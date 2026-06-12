import { NextResponse } from 'next/server';

// Valida a credencial do provedor de pagamentos consultando um endpoint
// autenticado simples. Usado pelo botão "Salvar Conexão" da integração
// "Links de Pagamento".
export async function POST(req: Request) {
  try {
    const { provider, apiKey } = await req.json();
    if (!provider || !apiKey) {
      return NextResponse.json({ success: false, error: 'Informe o provedor e a chave/token.' }, { status: 400 });
    }

    if (provider === 'mercadopago') {
      const res = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await res.json();
      if (!res.ok) return NextResponse.json({ success: false, error: data?.message || 'Access Token inválido.' }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (provider === 'asaas') {
      const res = await fetch('https://api.asaas.com/v3/myAccount', {
        headers: { access_token: apiKey },
      });
      const data = await res.json();
      if (!res.ok) return NextResponse.json({ success: false, error: data?.errors?.[0]?.description || 'Chave de API inválida.' }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (provider === 'woovi') {
      const res = await fetch('https://api.woovi.com/api/v1/account', {
        headers: { Authorization: apiKey },
      });
      const data = await res.json();
      if (!res.ok) return NextResponse.json({ success: false, error: data?.error || 'AppID inválido.' }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (provider === 'stripe') {
      const res = await fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await res.json();
      if (!res.ok) return NextResponse.json({ success: false, error: data?.error?.message || 'Chave secreta inválida.' }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Provedor não suportado.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
