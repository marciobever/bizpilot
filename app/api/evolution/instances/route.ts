import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export async function POST(req: Request) {
  try {
    const { instanceName, agentId } = await req.json();
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
    const WINDMILL_WEBHOOK_URL = process.env.WINDMILL_WEBHOOK_URL;

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !WINDMILL_WEBHOOK_URL) {
      return NextResponse.json({ error: 'Missing Evolution API env variables' }, { status: 500 });
    }

    const token = randomUUID();

    // 1. Cria a instância no evolution-go (token definido por nós)
    const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_API_KEY },
      body: JSON.stringify({ name: instanceName, token }),
    });
    const createData = await createRes.json();
    if (!createRes.ok) throw new Error(createData.error || 'Falha ao criar instância');

    const instanceId: string = createData.data?.id ?? '';

    // 2. Conecta (inicia QR) e configura webhook — tudo em um único POST
    // subscribe: nomes dos eventos no evolution-go (CONNECTION, não CONNECTION_UPDATE)
    await fetch(`${EVOLUTION_API_URL}/instance/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: token },
      body: JSON.stringify({ webhookUrl: WINDMILL_WEBHOOK_URL, subscribe: ['MESSAGE', 'CONNECTION'] }),
    });

    // 3. Persiste token + instanceId no config do agente (Supabase)
    if (agentId) {
      const supabase = createClient(
        (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: existing } = await supabase.from('agents').select('config').eq('id', agentId).single();
      const cfg: any = existing?.config && typeof existing.config === 'object' ? existing.config : {};
      cfg.whatsapp = { ...(cfg.whatsapp ?? {}), instanceToken: token, instanceId, instanceName };
      await supabase.from('agents').update({ config: cfg }).eq('id', agentId);
    }

    return NextResponse.json({ success: true, instanceToken: token, instanceId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
