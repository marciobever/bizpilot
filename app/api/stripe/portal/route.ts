import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireUser, getServiceSupabase } from '@/lib/api-auth';

// Abre o Portal do Cliente Stripe (gerenciar forma de pagamento, cancelar, ver faturas).
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

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
