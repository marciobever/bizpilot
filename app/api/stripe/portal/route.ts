import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Abre o Portal do Cliente Stripe (gerenciar forma de pagamento, cancelar, ver faturas).
export async function POST(req: NextRequest) {
  const { userId } = await req.json() as { userId?: string };
  if (!userId) return NextResponse.json({ error: 'userId é obrigatório.' }, { status: 400 });
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'STRIPE_SECRET_KEY não configurada.' }, { status: 500 });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = getServiceSupabase();

  try {
    const { data: profile } = await supabase.from('profiles').select('stripe_customer_id').eq('id', userId).single();
    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'Esta conta ainda não possui assinatura no Stripe.' }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${req.nextUrl.origin}/app/settings?tab=plano`,
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
