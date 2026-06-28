import { NextResponse } from 'next/server';
import { resolveInstanceToken } from '../../../utils';

export async function POST(req: Request, context: any) {
  try {
    const { instanceName } = await context.params;
    const { number, text } = await req.json();
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;

    const creds = await resolveInstanceToken(instanceName);
    if (!creds) return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 });

    const res = await fetch(`${EVOLUTION_API_URL}/send/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: creds.token },
      body: JSON.stringify({ number, text, delay: 0 }),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
