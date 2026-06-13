import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// Mapeia o Price ID do Stripe de volta para o valor de profiles.plan.
function planFromPriceId(priceId: string | undefined): string | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_BASICO) return 'basico';
  if (priceId === process.env.STRIPE_PRICE_PROFISSIONAL) return 'profissional';
  if (priceId === process.env.STRIPE_PRICE_AVANCADO) return 'avancado';
  return null;
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe não configurado (STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET).' }, { status: 500 });
  }

  const stripe = new Stripe(secret);
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);
  } catch (e: any) {
    return NextResponse.json({ error: `Assinatura inválida: ${e.message}` }, { status: 400 });
  }

  const supabase = getServiceSupabase();

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        const plan = planFromPriceId(sub.items.data[0]?.price?.id) || sub.metadata?.plan || null;
        const periodEnd = (sub as any).current_period_end;

        const update: Record<string, any> = {
          stripe_subscription_id: sub.id,
          subscription_status: sub.status,
          current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        };
        if (plan) update.plan = plan;

        if (userId) {
          await supabase.from('profiles').update(update).eq('id', userId);
        } else {
          await supabase.from('profiles').update(update).eq('stripe_customer_id', sub.customer as string);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await supabase.from('profiles').update({
          subscription_status: 'canceled',
          plan: 'basico',
        }).eq('stripe_customer_id', sub.customer as string);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
