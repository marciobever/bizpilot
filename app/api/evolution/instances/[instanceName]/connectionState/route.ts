import { NextResponse } from 'next/server';
import { resolveInstanceToken } from '../../../utils';

export async function GET(req: Request, context: any) {
  try {
    const { instanceName } = await context.params;
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;

    const creds = await resolveInstanceToken(instanceName);
    if (!creds) return NextResponse.json({ instance: { state: 'close' } });

    const res = await fetch(`${EVOLUTION_API_URL}/instance/status`, {
      headers: { apikey: creds.token },
    });
    const data = await res.json();
    const loggedIn: boolean = data?.data?.LoggedIn ?? false;
    const connected: boolean = data?.data?.Connected ?? false;
    const state = loggedIn ? 'open' : connected ? 'connecting' : 'close';
    return NextResponse.json({ instance: { state } });
  } catch {
    return NextResponse.json({ instance: { state: 'close' } });
  }
}
