import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function planFromPriceId(priceId: string | undefined): string | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_STARTER)  return 'starter';
  if (priceId === process.env.STRIPE_PRICE_PRO)      return 'pro';
  if (priceId === process.env.STRIPE_PRICE_BUSINESS) return 'business';
  return null;
}

// Confirma o pagamento na volta do Stripe, sem depender do webhook.
// Busca a sessão de checkout, valida que está paga e ativa a assinatura no perfil.
export async function POST(req: NextRequest) {
  const { sessionId } = await req.json() as { sessionId?: string };
  if (!sessionId) return NextResponse.json({ error: 'sessionId obrigatório.' }, { status: 400 });
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY não configurada.' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = getServiceSupabase();

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    const paid = session.payment_status === 'paid' || session.status === 'complete';
    if (!paid) {
      return NextResponse.json({ active: false, error: 'Pagamento ainda não confirmado.' }, { status: 402 });
    }

    const userId = (session.client_reference_id as string) || (session.metadata?.user_id as string);
    if (!userId) {
      return NextResponse.json({ error: 'Sessão sem usuário vinculado.' }, { status: 400 });
    }

    const sub = session.subscription as Stripe.Subscription | null;
    const status = sub?.status || 'active';
    const priceId = sub?.items?.data?.[0]?.price?.id;
    const plan = planFromPriceId(priceId) || (sub?.metadata?.plan as string) || null;
    const periodEnd = sub ? (sub as any).current_period_end : null;

    const update: Record<string, any> = {
      subscription_status: status,
      stripe_customer_id: session.customer as string,
    };
    if (sub?.id) update.stripe_subscription_id = sub.id;
    if (plan) update.plan = plan;
    if (periodEnd) update.current_period_end = new Date(periodEnd * 1000).toISOString();

    await supabase.from('profiles').update(update).eq('id', userId);

    const active = status === 'active' || status === 'trialing';
    return NextResponse.json({ active, status, plan });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
