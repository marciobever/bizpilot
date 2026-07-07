"use client";

// Bandeiras aceitas (SVG inline — sem asset externo, funciona nos 2 temas).
// `active` destaca a bandeira detectada enquanto o número é digitado.

function Badge({ children, dim }: { children: React.ReactNode; dim: boolean }) {
  return (
    <span className={`inline-flex transition-all duration-200 ${dim ? "opacity-30 grayscale" : "opacity-100"}`}>
      {children}
    </span>
  );
}

const W = 40, H = 26;

function VisaSvg() {
  return (
    <svg width={W} height={H} viewBox="0 0 40 26" className="rounded border border-border bg-white">
      <rect width="40" height="26" rx="3" fill="#fff" />
      <text x="20" y="17.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="bold" fontStyle="italic" fill="#1A1F71">VISA</text>
    </svg>
  );
}

function MastercardSvg() {
  return (
    <svg width={W} height={H} viewBox="0 0 40 26" className="rounded border border-border bg-white">
      <rect width="40" height="26" rx="3" fill="#fff" />
      <circle cx="16" cy="13" r="7.5" fill="#EB001B" />
      <circle cx="24" cy="13" r="7.5" fill="#F79E1B" fillOpacity="0.9" />
    </svg>
  );
}

function EloSvg() {
  return (
    <svg width={W} height={H} viewBox="0 0 40 26" className="rounded border border-border">
      <rect width="40" height="26" rx="3" fill="#000" />
      <text x="20" y="17.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold" fill="#fff">elo</text>
      <circle cx="30.5" cy="9" r="2" fill="#FFCB05" />
    </svg>
  );
}

function AmexSvg() {
  return (
    <svg width={W} height={H} viewBox="0 0 40 26" className="rounded border border-border">
      <rect width="40" height="26" rx="3" fill="#2E77BC" />
      <text x="20" y="16.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="7.5" fontWeight="bold" fill="#fff">AMEX</text>
    </svg>
  );
}

function HipercardSvg() {
  return (
    <svg width={W} height={H} viewBox="0 0 40 26" className="rounded border border-border bg-white">
      <rect width="40" height="26" rx="3" fill="#fff" />
      <text x="20" y="16.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="7" fontWeight="bold" fill="#B3131B">Hipercard</text>
    </svg>
  );
}

const BRANDS: { id: string; el: React.ReactNode }[] = [
  { id: "visa", el: <VisaSvg /> },
  { id: "mastercard", el: <MastercardSvg /> },
  { id: "elo", el: <EloSvg /> },
  { id: "amex", el: <AmexSvg /> },
  { id: "hipercard", el: <HipercardSvg /> },
];

export function CardBrandRow({ active }: { active: string | null }) {
  return (
    <div className="flex items-center gap-1.5">
      {BRANDS.map((b) => (
        <Badge key={b.id} dim={!!active && active !== b.id}>{b.el}</Badge>
      ))}
    </div>
  );
}
