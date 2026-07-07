"use client";
import { useEffect, useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { authFetch } from "@/lib/api-client";
import { CardBrandRow } from "./CardBrands";

interface Props {
  item: string;
  amountCents: number;
  onPaid: () => void;
  onPending: (chargeId: string) => void;
}

const inputCls = "flex h-11 w-full rounded-lg border border-input bg-background px-3.5 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500";
const labelCls = "block text-sm font-medium mb-1.5";

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

// Assinatura de cartão via Efí. O número do cartão NUNCA vai pro nosso
// servidor: vira payment_token no browser (payment-token-efi) e só o token
// é enviado pro /api/efi/checkout.
export function CardForm({ item, amountCents, onPaid, onPending }: Props) {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birth, setBirth] = useState("");
  const [phone, setPhone] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState(""); // MM/AA
  const [cvv, setCvv] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [detectedBrand, setDetectedBrand] = useState<string | null>(null);

  const price = `R$ ${(amountCents / 100).toFixed(2).replace(".", ",")}`;

  // Detecta a bandeira enquanto digita (destaca o logo, estilo Stripe).
  useEffect(() => {
    const digits = number.replace(/\D/g, "");
    if (digits.length < 6) { setDetectedBrand(null); return; }
    let stale = false;
    (async () => {
      try {
        const EfiPay = (await import("payment-token-efi")).default;
        const brand = await EfiPay.CreditCard.setCardNumber(digits).verifyCardBrand();
        if (!stale) setDetectedBrand(brand && brand !== "undefined" && brand !== "unsupported" ? brand : null);
      } catch { if (!stale) setDetectedBrand(null); }
    })();
    return () => { stale = true; };
  }, [number]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const [mm, aa] = expiry.split("/").map((s) => s?.trim());
    if (!mm || !aa || mm.length !== 2 || aa.length !== 2) {
      setError("Validade inválida — use o formato MM/AA.");
      return;
    }
    const payee = process.env.NEXT_PUBLIC_EFI_PAYEE_CODE;
    if (!payee) { setError("Pagamento com cartão indisponível no momento."); return; }

    setBusy(true);
    try {
      const EfiPay = (await import("payment-token-efi")).default;
      const cardNumber = number.replace(/\D/g, "");
      const brand = await EfiPay.CreditCard.setCardNumber(cardNumber).verifyCardBrand();
      if (!brand || brand === "undefined" || brand === "unsupported") {
        throw new Error("Bandeira do cartão não reconhecida.");
      }
      const sandbox = process.env.NEXT_PUBLIC_EFI_SANDBOX !== "false";
      const token = await EfiPay.CreditCard
        .setAccount(payee)
        .setEnvironment(sandbox ? "sandbox" : "production")
        .setCreditCardData({
          brand,
          number: cardNumber,
          cvv: cvv.trim(),
          expirationMonth: mm,
          expirationYear: `20${aa}`,
          holderName: name.trim(),
          holderDocument: cpf.replace(/\D/g, ""),
          reuse: true, // assinatura: o token precisa valer pras renovações
        })
        .getPaymentToken();

      const res = await authFetch("/api/efi/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item,
          method: "card",
          card: { paymentToken: token.payment_token, name, cpf, birth, phone },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Não foi possível processar o pagamento.");
      if (json.active) { onPaid(); return; }
      if (json.pending && json.chargeId) { onPending(json.chargeId); return; }
      throw new Error("Pagamento não aprovado. Verifique os dados do cartão.");
    } catch (err: any) {
      setError(err?.error_description || err?.message || "Erro ao processar o cartão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold">Dados do cartão</h2>
        <CardBrandRow active={detectedBrand} />
      </div>

      <div>
        <label className={labelCls}>Número do cartão</label>
        <input className={inputCls} placeholder="0000 0000 0000 0000" value={number} onChange={(e) => setNumber(formatCardNumber(e.target.value))} required inputMode="numeric" autoComplete="cc-number" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Validade</label>
          <input className={inputCls} placeholder="MM/AA" value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} required autoComplete="cc-exp" inputMode="numeric" />
        </div>
        <div>
          <label className={labelCls}>CVV</label>
          <input className={inputCls} placeholder="123" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} required inputMode="numeric" autoComplete="cc-csc" />
        </div>
      </div>

      <div>
        <label className={labelCls}>Nome impresso no cartão</label>
        <input className={inputCls} placeholder="Como está no cartão" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="cc-name" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>CPF do titular</label>
          <input className={inputCls} placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(e.target.value)} required inputMode="numeric" />
        </div>
        <div>
          <label className={labelCls}>Celular</label>
          <input className={inputCls} placeholder="(00) 90000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="numeric" />
        </div>
      </div>

      <div>
        <label className={labelCls}>Data de nascimento do titular</label>
        <input type="date" className={inputCls} value={birth} onChange={(e) => setBirth(e.target.value)} required />
        <p className="text-xs text-muted-foreground mt-1.5">Exigida pela operadora para validação antifraude.</p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button type="submit" disabled={busy} className="w-full h-12 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-colors">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
        Assinar por {price}/mês
      </button>
      <p className="text-xs text-muted-foreground text-center">
        Os dados do cartão são criptografados no seu navegador e não passam pelos nossos servidores.
      </p>
    </form>
  );
}
