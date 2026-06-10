import { NextResponse } from 'next/server';
import { findFullInstanceName } from '../../../utils';

export async function GET(req: Request, context: any) {
  try {
    const { instanceName } = await context.params;
    const resolvedInstanceName = await findFullInstanceName(instanceName);
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

    const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${resolvedInstanceName}`, {
      headers: { 'apikey': EVOLUTION_API_KEY || '' }
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
