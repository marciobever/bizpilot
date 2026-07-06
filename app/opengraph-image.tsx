import { ImageResponse } from "next/og";

// Imagem de compartilhamento (og:image) — 1200x630, gerada em build.
// Visual: conversa de WhatsApp resolvida pelo bot, sobre o navy da marca.
export const alt = "BizPilot — Funcionários Virtuais de IA para WhatsApp";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const navy = "#0B1F3A";
const blue = "#1E88FF";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: `linear-gradient(135deg, ${navy} 0%, #0e2a52 60%, #123a75 100%)`,
          color: "#fff",
          fontFamily: "sans-serif",
          padding: 72,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Texto */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: blue,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34,
                fontWeight: 800,
              }}
            >
              B
            </div>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>BizPilot</div>
          </div>
          <div
            style={{
              marginTop: 40,
              fontSize: 58,
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: -1.5,
            }}
          >
            Funcionários de IA que atendem seu WhatsApp 24h
          </div>
          <div style={{ marginTop: 24, fontSize: 28, color: "#9db8dd", lineHeight: 1.4 }}>
            Atendimento, agendamento, cobrança e vendas — no automático.
          </div>
        </div>

        {/* Mock de conversa */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, width: 380 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-end",
              background: "#dcf8c6",
              color: "#111",
              borderRadius: 18,
              padding: "16px 22px",
              fontSize: 24,
              maxWidth: 330,
            }}
          >
            Vocês atendem agora?
          </div>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: "#ffffff",
              color: "#111",
              borderRadius: 18,
              padding: "16px 22px",
              fontSize: 24,
              maxWidth: 340,
            }}
          >
            Sim! Funcionamos 24h 😊 Posso agendar seu horário?
          </div>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-end",
              background: "#dcf8c6",
              color: "#111",
              borderRadius: 18,
              padding: "16px 22px",
              fontSize: 24,
            }}
          >
            Pode! Amanhã às 10h
          </div>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              alignItems: "center",
              gap: 10,
              background: blue,
              color: "#fff",
              borderRadius: 18,
              padding: "14px 22px",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                background: "#4ade80",
                display: "flex",
              }}
            />
            Agendamento confirmado
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
