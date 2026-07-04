import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireUser, getServiceSupabase } from '@/lib/api-auth';

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
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;
  const email = auth.user.email;

  const { plan } = await req.json() as { plan?: string };

  if (!plan || !PLAN_PRICE_IDS[plan]) {
    return NextResponse.json({ error: 'Plano inválido ou ainda não configurado (faltam as variáveis STRIPE_PRICE_*).' }, { status: 400 });
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
      success_url: `${origin}/app/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app/checkout?canceled=1`,
      client_reference_id: userId,
      subscription_data: { metadata: { user_id: userId, plan } },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
