import { NextResponse } from 'next/server';
import { findFullInstanceName } from '../../../utils';

export async function POST(req: Request, context: any) {
  try {
    const { instanceName } = await context.params;
    const resolvedInstanceName = await findFullInstanceName(instanceName);
    const { number, text } = await req.json();
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${resolvedInstanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY || ''
      },
      body: JSON.stringify({
         number: number,
         text: text,
         textMessage: { text: text },
         options: { delay: 0, presence: "composing" }
      })
    });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
