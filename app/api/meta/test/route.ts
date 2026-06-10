import { NextResponse } from 'next/server';
import { graphUrl } from '../utils';

// Valida as credenciais do WhatsApp Cloud API (Meta Oficial) consultando
// os dados do número na Graph API. Usado pelo botão "Testar e Conectar".
export async function POST(req: Request) {
  try {
    const { phoneNumberId, accessToken } = await req.json();

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { success: false, error: 'Informe o Phone Number ID e o Token de Acesso.' },
        { status: 400 }
      );
    }

    const res = await fetch(
      graphUrl(`${phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status`),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const data = await res.json();

    if (!res.ok) {
      const message =
        data?.error?.message ||
        'Não foi possível validar. Verifique o Phone Number ID e o Token.';
      return NextResponse.json({ success: false, error: message, details: data }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      verifiedName: data.verified_name || null,
      displayPhoneNumber: data.display_phone_number || null,
      qualityRating: data.quality_rating || null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
