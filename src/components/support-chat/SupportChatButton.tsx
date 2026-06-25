"use client";
import { MessageCircle, X } from "lucide-react";

interface Props {
  open: boolean;
  onClick: () => void;
}

export function SupportChatButton({ open, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full bg-brand-600 hover:bg-brand-700 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      aria-label={open ? "Fechar suporte" : "Abrir suporte"}
    >
      {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
    </button>
  );
}
