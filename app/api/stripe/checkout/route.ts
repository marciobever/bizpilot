import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Mapeia o plano para o Price ID criado no Stripe.
// Aceita nomes novos (starter/pro/business) e antigos (basico/profissional/avancado).
const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  // Planos
  starter:      process.env.STRIPE_PRICE_STARTER,
  pro:          process.env.STRIPE_PRICE_PRO,
  business:     process.env.STRIPE_PRICE_BUSINESS,
  // aliases legados
  basico:       process.env.STRIPE_PRICE_STARTER,
  profissional: process.env.STRIPE_PRICE_PRO,
  avancado:     process.env.STRIPE_PRICE_BUSINESS,
  // Extras / add-ons
  addon_bot:      process.env.STRIPE_PRICE_EXTRA_BOT,
  addon_campaigns: process.env.STRIPE_PRICE_EXTRA_CAMPAIGNS,
  addon_voice:    process.env.STRIPE_PRICE_EXTRA_VOICE,
  addon_whatsapp_number: process.env.STRIPE_PRICE_EXTRA_WHATSAPP_NUMBER,
};

export async function POST(req: NextRequest) {
  const { plan, userId, email } = await req.json() as { plan?: string; userId?: string; email?: string };

  if (!plan || !PLAN_PRICE_IDS[plan]) {
    return NextResponse.json({ error: 'Plano inválido ou ainda não configurado (faltam as variáveis STRIPE_PRICE_*).' }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: 'userId é obrigatório.' }, { status: 400 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY não configurada.' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = getServiceSupabase();

  try {
    const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', userId).single();

    let customerId = profile?.stripe_customer_id as string | undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({ email, metadata: { user_id: userId } });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
    }

    const origin = req.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PLAN_PRICE_IDS[plan]!, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/app/settings?tab=plano&checkout=sucesso`,
      cancel_url: `${origin}/app/settings?tab=plano&checkout=cancelado`,
      client_reference_id: userId,
      subscription_data: { metadata: { user_id: userId, plan } },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
