"use client";
import { useEffect } from "react";
import { reportError } from "@/lib/report-error";

// Error boundary raiz do App Router: captura erros de renderização no cliente,
// reporta pro Bugsink e mostra uma tela amigável (nunca uma tela branca/quebrada).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { digest: error.digest, where: "global-error" });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", margin: 0, background: "#0b0f0e", color: "#e8efeb" }}>
        <div style={{ textAlign: "center", maxWidth: 420, padding: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: ".5rem" }}>Algo deu errado por aqui</h2>
          <p style={{ color: "#8ba097", marginBottom: "1.5rem" }}>
            Já registramos o problema e vamos dar uma olhada. Tente recarregar.
          </p>
          <button
            onClick={() => reset()}
            style={{ background: "#0e8f6e", color: "#fff", border: "none", borderRadius: 8, padding: ".6rem 1.2rem", fontSize: ".95rem", cursor: "pointer" }}
          >
            Tentar de novo
          </button>
        </div>
      </body>
    </html>
  );
}
