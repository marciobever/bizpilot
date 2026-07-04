import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireUser, userOwnsAgent } from '@/lib/api-auth';

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    if (!agentId) return NextResponse.json({ error: 'agentId obrigatório' }, { status: 400 });
    if (!(await userOwnsAgent(agentId, auth.user.id))) {
      return NextResponse.json({ error: 'Agente não pertence à sua conta.' }, { status: 403 });
    }

    const supabase = createClient(
      (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: agent } = await supabase.from('agents').select('config').eq('id', agentId).single();
    let instanceToken: string = agent?.config?.whatsapp?.instanceToken || '';
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return NextResponse.json({ error: 'Configuração do servidor incompleta' }, { status: 500 });
    }

    // Se não tem instanceToken salvo, tenta recuperar via /instance/list com global key
    if (!instanceToken) {
      const instanceName = agent?.config?.whatsapp?.instanceName || `agent_${agentId}`;
      const listRes = await fetch(`${EVOLUTION_API_URL}/instance/list`, {
        headers: { apikey: EVOLUTION_API_KEY },
      }).catch(() => null);

      if (listRes?.ok) {
        const listData = await listRes.json().catch(() => null);
        const instances: any[] = listData?.data ?? listData ?? [];
        const found = instances.find(
          (i: any) => (i.name || i.Name || i.instanceName) === instanceName
        );
        const recoveredToken: string = found?.token || found?.Token || found?.apikey || '';
        if (recoveredToken) {
          instanceToken = recoveredToken;
          // Salva de volta no config para não precisar recuperar novamente
          const cfg: any = agent?.config && typeof agent.config === 'object' ? { ...agent.config } : {};
          if (!cfg.whatsapp) cfg.whatsapp = {};
          cfg.whatsapp.instanceToken = recoveredToken;
          cfg.whatsapp.instanceName = instanceName;
          await supabase.from('agents').update({ config: cfg }).eq('id', agentId);
        }
      }
    }

    if (!instanceToken) {
      return NextResponse.json(
        { error: 'Token da instância não encontrado. Reconecte o WhatsApp nas configurações do agente.' },
        { status: 400 }
      );
    }

    const res = await fetch(`${EVOLUTION_API_URL}/group/list`, {
      headers: { apikey: instanceToken },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Evolution API: ${text.slice(0, 200)}` }, { status: res.status });
    }

    const data = await res.json();
    // evolution-go retorna { data: [...], message: "success" }
    const raw: any[] = data.data || data.groups || [];
    const groups = raw.map((g: any) => ({
      id: g.JID || g.jid || '',
      name: g.Name || g.name || g.Subject || g.subject || g.JID || '',
      participants: g.ParticipantCount || g.participantCount || 0,
    })).filter((g: any) => g.id && g.id.includes('@g.us'));

    return NextResponse.json({ groups });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
