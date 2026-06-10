import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { instanceName, webhookUrl } = await req.json();
    const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
    const WINDMILL_WEBHOOK_URL = webhookUrl || process.env.WINDMILL_WEBHOOK_URL;

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !WINDMILL_WEBHOOK_URL) {
      return NextResponse.json({ error: "Missing Evolution API env variables" }, { status: 500 });
    }

    console.log(`[EVOLUTION CREATE] Initializing instance: ${instanceName}`);
    const createRes = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        instanceName: instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS"
      })
    });

    const createData = await createRes.json();
    
    const webhookEndpoints = [`/webhook/set/${instanceName}`, `/webhook/update/${instanceName}`];
    const flatPayload = { enabled: true, url: WINDMILL_WEBHOOK_URL, byEvents: false, base64: false, events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"] };
    const nestedPayload = { webhook: flatPayload };

    let webhookSuccess = false;
    let webhookResponseText = "";

    for (const endpoint of webhookEndpoints) {
      for (const payload of [flatPayload, nestedPayload]) {
        try {
          const r = await fetch(`${EVOLUTION_API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
            body: JSON.stringify(payload)
          });
          const text = await r.text();
          if (r.ok) {
            webhookSuccess = true;
            webhookResponseText = text;
            break;
          }
        } catch (e: any) {
          console.error(`Webhook err: ${e.message}`);
        }
      }
      if (webhookSuccess) break;
    }

    return NextResponse.json({ 
      success: true, 
      instance: createData,
      webhookConfigured: webhookSuccess,
      webhookLastResponse: webhookResponseText
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
