"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2, RefreshCw } from "lucide-react";
import { authFetch } from "@/lib/api-client";

interface Props {
  chargeId: string;
  qrImage: string;      // data:image/png;base64
  copiaECola: string;
  amountCents: number;
  onPaid: () => void;
  onRegenerate: () => void;
}

// QR Pix na tela + polling do /api/efi/confirm até o pagamento cair.
export function PixPanel({ chargeId, qrImage, copiaECola, amountCents, onPaid, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);
  const stopped = useRef(false);

  useEffect(() => {
    stopped.current = false;
    const timer = setInterval(async () => {
      if (stopped.current) return;
      try {
        const res = await authFetch("/api/efi/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chargeId }),
        });
        const json = await res.json();
        if (json.active) {
          stopped.current = true;
          clearInterval(timer);
          onPaid();
        } else if (json.expired) {
          stopped.current = true;
          clearInterval(timer);
          setExpired(true);
        }
      } catch { /* tenta de novo no próximo tick */ }
    }, 4000);
    return () => { stopped.current = true; clearInterval(timer); };
  }, [chargeId, onPaid]);

  const copy = () => {
    navigator.clipboard?.writeText(copiaECola).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  const price = `R$ ${(amountCents / 100).toFixed(2).replace(".", ",")}`;

  if (expired) {
    return (
      <div className="flex flex-col items-center text-center gap-5 py-10">
        <p className="text-base text-muted-foreground">Este QR Code expirou (válido por 1 hora).</p>
        <button onClick={onRegenerate} className="h-12 px-6 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-base font-semibold flex items-center gap-2">
          <RefreshCw className="h-5 w-5" /> Gerar novo QR Code
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center gap-5">
      <h2 className="text-xl font-bold">Pague {price} com Pix</h2>
      <p className="text-base text-muted-foreground -mt-3">Escaneie o QR Code no app do seu banco</p>
      <div className="bg-white p-4 rounded-2xl border shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrImage} alt="QR Code Pix" className="w-60 h-60" />
      </div>
      <div className="w-full max-w-sm">
        <p className="text-sm text-muted-foreground mb-2">Ou copie o código Pix (copia e cola):</p>
        <button onClick={copy} className="w-full flex items-center gap-2 border border-border rounded-lg px-3.5 py-3 text-sm font-mono text-left hover:bg-secondary/50 transition-colors">
          <span className="truncate flex-1">{copiaECola}</span>
          {copied ? <Check className="h-5 w-5 text-emerald-500 shrink-0" /> : <Copy className="h-5 w-5 shrink-0" />}
        </button>
        {copied && <p className="text-sm text-emerald-500 mt-1.5">Código copiado!</p>}
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Aguardando pagamento — a confirmação é automática.
      </div>
    </div>
  );
}
