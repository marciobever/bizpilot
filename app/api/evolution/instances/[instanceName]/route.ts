import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveInstanceToken, authorizeInstanceRoute } from '../../utils';

export async function DELETE(req: Request, context: any) {
  try {
    const { instanceName } = await context.params;
    const denied = await authorizeInstanceRoute(req, instanceName);
    if (denied) return denied;

    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

    const creds = await resolveInstanceToken(instanceName);
    if (creds?.token) {
      // Desconecta a sessão WhatsApp
      await fetch(`${EVOLUTION_API_URL}/instance/logout`, {
        method: 'DELETE',
        headers: { apikey: creds.token },
      }).catch(() => {});

      // Remove a instância do servidor (requer admin key + id)
      if (creds.instanceId) {
        await fetch(`${EVOLUTION_API_URL}/instance/delete/${creds.instanceId}`, {
          method: 'DELETE',
          headers: { apikey: EVOLUTION_API_KEY || '' },
        }).catch(() => {});
      }

      // Limpa token + instanceId do config do agente
      const supabase = createClient(
        (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: existing } = await supabase
        .from('agents')
        .select('config')
        .eq('id', creds.agentId)
        .single();
      const cfg: any = existing?.config ?? {};
      if (cfg.whatsapp) {
        delete cfg.whatsapp.instanceToken;
        delete cfg.whatsapp.instanceId;
      }
      await supabase.from('agents').update({ config: cfg }).eq('id', creds.agentId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
