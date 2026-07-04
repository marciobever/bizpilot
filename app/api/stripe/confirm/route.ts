import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireUser, getServiceSupabase } from '@/lib/api-auth';

function planFromPriceId(priceId: string | undefined): string | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_STARTER)  return 'starter';
  if (priceId === process.env.STRIPE_PRICE_PRO)      return 'pro';
  if (priceId === process.env.STRIPE_PRICE_BUSINESS) return 'business';
  return null;
}

function addonFromPriceId(priceId: string | undefined): string | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_EXTRA_BOT)             return 'addon_bot';
  if (priceId === process.env.STRIPE_PRICE_EXTRA_CAMPAIGNS)       return 'addon_campaigns';
  if (priceId === process.env.STRIPE_PRICE_EXTRA_VOICE)           return 'addon_voice';
  if (priceId === process.env.STRIPE_PRICE_EXTRA_WHATSAPP_NUMBER) return 'addon_whatsapp_number';
  return null;
}

// Confirma o pagamento na volta do Stripe, sem depender do webhook.
// Busca a sessão de checkout, valida que está paga e ativa a assinatura no perfil.
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

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
    // A sessão do Stripe precisa pertencer ao usuário logado (evita ativar/ler
    // a assinatura de outra conta passando um sessionId alheio).
    if (userId !== auth.user.id) {
      return NextResponse.json({ error: 'Esta sessão de pagamento não pertence à sua conta.' }, { status: 403 });
    }

    const sub = session.subscription as Stripe.Subscription | null;
    const status = sub?.status || 'active';
    const priceId = sub?.items?.data?.[0]?.price?.id;
    const purchased = (sub?.metadata?.plan as string) || planFromPriceId(priceId) || addonFromPriceId(priceId) || null;

    // ── Complemento (add-on): grava em tabela própria, sem mexer no plano ──────
    const isAddon = !!purchased && purchased.startsWith('addon_');
    if (isAddon) {
      const { error: addonError } = await supabase.from('user_addons').upsert({
        user_id: userId,
        addon_id: purchased,
        stripe_subscription_id: sub?.id ?? null,
        status,
      }, { onConflict: 'stripe_subscription_id' });
      if (addonError) {
        return NextResponse.json({ error: `Falha ao gravar complemento: ${addonError.message}` }, { status: 500 });
      }
      return NextResponse.json({ active: true, addon: purchased });
    }

    // ── Plano principal ───────────────────────────────────────────────────────
    const plan = planFromPriceId(priceId) || (sub?.metadata?.plan as string) || null;
    // current_period_end migrou do objeto subscription para o item nas versões novas da API.
    const periodEnd = sub
      ? ((sub as any).current_period_end ?? (sub.items?.data?.[0] as any)?.current_period_end ?? null)
      : null;

    const update: Record<string, any> = {
      subscription_status: status,
      stripe_customer_id: session.customer as string,
    };
    if (sub?.id) update.stripe_subscription_id = sub.id;
    if (plan) update.plan = plan;
    if (periodEnd) update.current_period_end = new Date(periodEnd * 1000).toISOString();

    const { error: updateError } = await supabase.from('profiles').update(update).eq('id', userId);
    if (updateError) {
      return NextResponse.json({ error: `Falha ao gravar assinatura: ${updateError.message}` }, { status: 500 });
    }

    const active = status === 'active' || status === 'trialing';
    return NextResponse.json({ active, status, plan });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
