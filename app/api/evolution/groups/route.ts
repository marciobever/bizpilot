import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agentId');
    if (!agentId) return NextResponse.json({ error: 'agentId obrigatório' }, { status: 400 });

    const supabase = createClient(
      (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: agent } = await supabase.from('agents').select('config').eq('id', agentId).single();
    const instanceToken = agent?.config?.whatsapp?.instanceToken;
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

    const apiKey = instanceToken || EVOLUTION_API_KEY;
    if (!apiKey || !EVOLUTION_API_URL) {
      return NextResponse.json({ error: 'WhatsApp não conectado para este agente' }, { status: 400 });
    }

    const res = await fetch(`${EVOLUTION_API_URL}/group/list`, {
      headers: { apikey: apiKey },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `Evolution API: ${text.slice(0, 200)}` }, { status: res.status });
    }

    const data = await res.json();
    // evolution-go retorna { groups: [{ JID, Name, ... }] }
    const groups = (data.groups || []).map((g: any) => ({
      id: g.JID || g.jid || '',
      name: g.Name || g.name || g.Subject || g.subject || g.JID || '',
      participants: g.ParticipantCount || 0,
    })).filter((g: any) => g.id && g.id.includes('@g.us'));

    return NextResponse.json({ groups });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
