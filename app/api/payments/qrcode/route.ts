import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

// GET /api/payments/qrcode?data=<código pix copia e cola>
// Gera uma imagem PNG do QR Code para o agente enviar no WhatsApp.
export async function GET(req: NextRequest) {
  const data = req.nextUrl.searchParams.get('data');
  if (!data) return NextResponse.json({ error: 'Parâmetro "data" é obrigatório.' }, { status: 400 });

  try {
    const buffer = await QRCode.toBuffer(data, { type: 'png', width: 512, margin: 1 });
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
