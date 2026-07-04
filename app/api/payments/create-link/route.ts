import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { generatePixPayload } from '@/lib/pix';
import { requireInternalSecret } from '@/lib/api-auth';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function createMercadoPagoLink(apiKey: string, description: string, amount: number) {
  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ title: description.slice(0, 250), quantity: 1, unit_price: amount, currency_id: 'BRL' }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Erro ao criar preferência no Mercado Pago.');
  return data.init_point as string;
}

async function createAsaasLink(apiKey: string, description: string, amount: number) {
  const res = await fetch('https://api.asaas.com/v3/paymentLinks', {
    method: 'POST',
    headers: { access_token: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: description.slice(0, 250),
      description,
      billingType: 'UNDEFINED',
      chargeType: 'DETACHED',
      value: amount,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.errors?.[0]?.description || 'Erro ao criar link de pagamento no Asaas.');
  return data.url as string;
}

async function createWooviLink(apiKey: string, description: string, amount: number) {
  const res = await fetch('https://api.woovi.com/api/v1/charge', {
    method: 'POST',
    headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      correlationID: crypto.randomUUID(),
      value: Math.round(amount * 100), // reais -> centavos
      comment: description.slice(0, 250),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Erro ao criar cobrança na Woovi.');
  return (data.charge?.paymentLinkUrl || data.paymentLinkUrl) as string;
}

async function createStripeLink(apiKey: string, description: string, amount: number, origin: string) {
  const body = new URLSearchParams({
    mode: 'payment',
    'line_items[0][price_data][currency]': 'brl',
    'line_items[0][price_data][product_data][name]': description.slice(0, 250),
    'line_items[0][price_data][unit_amount]': String(Math.round(amount * 100)), // reais -> centavos
    'line_items[0][quantity]': '1',
    success_url: `${origin}/?pagamento=sucesso`,
    cancel_url: `${origin}/?pagamento=cancelado`,
  });
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Erro ao criar sessão de pagamento no Stripe.');
  return data.url as string;
}

// POST /api/payments/create-link
// Chamado pelo Windmill (tool `gerar_link_pagamento`) quando o agente decide
// gerar uma cobrança para o lead durante a conversa.
export async function POST(req: NextRequest) {
  const auth = requireInternalSecret(req);
  if (!auth.ok) return auth.response;

  const { agentId, description, amount } = await req.json();

  if (!agentId || !description || !amount) {
    return NextResponse.json({ error: 'agentId, description e amount são obrigatórios' }, { status: 400 });
  }
  const numericAmount = Number(amount);
  if (!numericAmount || numericAmount <= 0) {
    return NextResponse.json({ error: 'amount inválido' }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  const { data: agent, error: agentErr } = await supabase
    .from('agents').select('user_id').eq('id', agentId).single();
  if (agentErr || !agent) return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 });

  const { data: integration, error: intErr } = await supabase
    .from('integrations').select('status, config')
    .eq('user_id', agent.user_id).eq('provider', 'payments').maybeSingle();

  if (intErr || !integration || integration.status !== 'connected') {
    return NextResponse.json({ error: 'Provedor de pagamentos não conectado para este usuário.' }, { status: 400 });
  }

  const config = integration.config as any;
  const { provider, apiKey } = config as { provider: string; apiKey: string };

  if (provider !== 'pix' && !apiKey) {
    return NextResponse.json({ error: 'Provedor de pagamentos não conectado para este usuário.' }, { status: 400 });
  }

  try {
    if (provider === 'pix') {
      if (!config.pixKey || !config.merchantName || !config.merchantCity) {
        return NextResponse.json({ error: 'Chave Pix, nome e cidade do recebedor não configurados.' }, { status: 400 });
      }
      const pixCode = generatePixPayload({
        pixKey: config.pixKey,
        merchantName: config.merchantName,
        merchantCity: config.merchantCity,
        amount: numericAmount,
        description,
      });
      const qrCodeUrl = `${req.nextUrl.origin}/api/payments/qrcode?data=${encodeURIComponent(pixCode)}`;
      return NextResponse.json({ pixCode, qrCodeUrl });
    }

    let url: string | undefined;
    if (provider === 'mercadopago') url = await createMercadoPagoLink(apiKey, description, numericAmount);
    else if (provider === 'asaas') url = await createAsaasLink(apiKey, description, numericAmount);
    else if (provider === 'woovi') url = await createWooviLink(apiKey, description, numericAmount);
    else if (provider === 'stripe') url = await createStripeLink(apiKey, description, numericAmount, req.nextUrl.origin);
    else return NextResponse.json({ error: 'Provedor não suportado.' }, { status: 400 });

    if (!url) return NextResponse.json({ error: 'Provedor não retornou um link de pagamento.' }, { status: 502 });
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
