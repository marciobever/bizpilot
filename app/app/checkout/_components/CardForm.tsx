"use client";
import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { authFetch } from "@/lib/api-client";

interface Props {
  item: string;
  amountCents: number;
  onPaid: () => void;
  onPending: (chargeId: string) => void;
}

const inputCls = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

  const price = `R$ ${(amountCents / 100).toFixed(2).replace(".", ",")}`;

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
    <form onSubmit={submit} className="space-y-3 max-w-sm mx-auto">
      <div className="grid grid-cols-2 gap-3">
        <input className={`${inputCls} col-span-2`} placeholder="Nome impresso no cartão" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className={inputCls} placeholder="CPF do titular" value={cpf} onChange={(e) => setCpf(e.target.value)} required inputMode="numeric" />
        <input className={inputCls} placeholder="Celular (DDD)" value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="numeric" />
        <div className="col-span-2">
          <label className="text-[11px] text-muted-foreground">Data de nascimento do titular</label>
          <input type="date" className={inputCls} value={birth} onChange={(e) => setBirth(e.target.value)} required />
        </div>
        <input className={`${inputCls} col-span-2`} placeholder="Número do cartão" value={number} onChange={(e) => setNumber(e.target.value)} required inputMode="numeric" autoComplete="cc-number" />
        <input className={inputCls} placeholder="Validade (MM/AA)" value={expiry} onChange={(e) => setExpiry(e.target.value)} required autoComplete="cc-exp" />
        <input className={inputCls} placeholder="CVV" value={cvv} onChange={(e) => setCvv(e.target.value)} required inputMode="numeric" autoComplete="cc-csc" />
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button type="submit" disabled={busy} className="w-full h-11 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        Assinar por {price}/mês
      </button>
      <p className="text-[10px] text-muted-foreground text-center">
        Cobrança recorrente mensal via Efí Bank. Cancele quando quiser em Minha Conta.
        Os dados do cartão são criptografados e não passam pelos nossos servidores.
      </p>
    </form>
  );
}
