import { NextResponse } from 'next/server';
import { resolveInstanceToken, authorizeInstanceRoute } from '../../../utils';

export async function GET(req: Request, context: any) {
  try {
    const { instanceName } = await context.params;
    const denied = await authorizeInstanceRoute(req, instanceName);
    if (denied) return denied;

    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;

    const creds = await resolveInstanceToken(instanceName);
    if (!creds) return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });

    const res = await fetch(`${EVOLUTION_API_URL}/instance/qr`, {
      headers: { apikey: creds.token },
    });
    const data = await res.json();
    const qrcode: string = data?.data?.Qrcode ?? '';
    // base64 é um data URI completo (data:image/png;base64,...) — o frontend usa direto como src
    return NextResponse.json({ base64: qrcode, instance: { state: 'connecting', qr: qrcode } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
