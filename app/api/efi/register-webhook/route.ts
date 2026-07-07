import { NextRequest, NextResponse } from "next/server";
import { requireInternalSecret } from "@/lib/api-auth";
import { isEfiPixConfigured } from "@/lib/billing/efi";
import EfiPay from "sdk-node-apis-efi";

// Registra na Efí o webhook de Pix da chave EFI_PIX_KEY. Rodar UMA vez por
// ambiente (homologação/produção) após setar as envs:
//   curl -X POST https://www.bizpilot.com.br/api/efi/register-webhook \
//     -H "x-internal-secret: $INTERNAL_API_SECRET"
// O segredo do webhook vai no PATH da URL (a Efí anexa "/pix" ao fim).
export async function POST(req: NextRequest) {
  const auth = requireInternalSecret(req);
  if (!auth.ok) return auth.response;

  if (!isEfiPixConfigured()) {
    return NextResponse.json({ error: "Envs EFI_* incompletas." }, { status: 501 });
  }
  const secret = process.env.EFI_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "EFI_WEBHOOK_SECRET não configurada." }, { status: 501 });
  }

  // validateMtls: false — a Vercel não expõe o certificado de cliente da Efí
  // no handshake; a autenticação do webhook fica por conta do segredo no path.
  const efi = new EfiPay({
    sandbox: process.env.EFI_SANDBOX !== "false",
    client_id: process.env.EFI_CLIENT_ID!,
    client_secret: process.env.EFI_CLIENT_SECRET!,
    certificate: process.env.EFI_CERT_BASE64,
    cert_base64: true,
    validateMtls: false,
  });

  const webhookUrl = `${req.nextUrl.origin}/api/efi/webhook/${secret}`;
  try {
    const res = await efi.pixConfigWebhook({ chave: process.env.EFI_PIX_KEY! }, { webhookUrl });
    return NextResponse.json({ ok: true, webhookUrl, efi: res ?? null });
  } catch (e: any) {
    const detail = e?.error_description || e?.mensagem || e?.message || e;
    return NextResponse.json({ error: typeof detail === "string" ? detail : JSON.stringify(detail) }, { status: 500 });
  }
}
