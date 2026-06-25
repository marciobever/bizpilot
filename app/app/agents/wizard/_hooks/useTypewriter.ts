"use client";
import { useState, useEffect, useRef } from "react";

export type ChatMsg = { id: string; role: "bot" | "user"; text: string };

export function useTypewriter() {
  const messagesRef = useRef<ChatMsg[]>([]);
  const [revealedChars, setRevealedChars] = useState<Record<string, number>>({ intro: 0 });
  const [typewritingId, setTypewritingId] = useState<string | null>("intro");

  useEffect(() => {
    if (!typewritingId) return;
    const interval = setInterval(() => {
      const msg = messagesRef.current.find((m) => m.id === typewritingId);
      if (!msg) return;
      setRevealedChars((prev) => {
        const current = prev[typewritingId] ?? 0;
        if (current >= msg.text.length) return prev;
        return { ...prev, [typewritingId]: Math.min(current + 3, msg.text.length) };
      });
    }, 16);
    return () => clearInterval(interval);
  }, [typewritingId]);

  useEffect(() => {
    if (!typewritingId) return;
    const msg = messagesRef.current.find((m) => m.id === typewritingId);
    if (msg && (revealedChars[typewritingId] ?? 0) >= msg.text.length) {
      setTypewritingId(null);
    }
  }, [revealedChars, typewritingId]);

  const startTypewriting = (id: string) => {
    setRevealedChars((prev) => ({ ...prev, [id]: 0 }));
    setTypewritingId(id);
  };

  const getDisplayText = (msg: ChatMsg) => {
    if (msg.role === "bot" && revealedChars[msg.id] !== undefined) {
      const chars = revealedChars[msg.id];
      const displayed = msg.text.slice(0, chars);
      return typewritingId === msg.id ? displayed + "▋" : displayed;
    }
    return msg.text;
  };

  return { messagesRef, revealedChars, typewritingId, startTypewriting, getDisplayText };
}
