"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { authFetch } from "@/lib/api-client";

export interface WhatsappAlert {
  agent_id: string;
  instance_name: string;
  dropped_at: string;
}

const THROTTLE_MS = 5 * 60 * 1000; // 5 min — evita martelar a Evolution a cada navegação
const THROTTLE_KEY = "bp_wa_last_check";

// Camada B: lê alertas ativos (barato, direto do Supabase) em toda
// navegação, e dispara a checagem ATIVA (que bate na Evolution de verdade)
// no máximo 1x a cada 5 min por aba. A Camada A (webhook em tempo real) é
// quem resolve a maioria dos casos antes mesmo disso rodar.
export function useWhatsappConnectionAlerts(userId: string | undefined): WhatsappAlert[] {
  const [alerts, setAlerts] = useState<WhatsappAlert[]>([]);

  useEffect(() => {
    if (!userId) return;

    const load = () => {
      supabase.from("whatsapp_connection_alerts")
        .select("agent_id, instance_name, dropped_at")
        .eq("user_id", userId).eq("status", "down")
        .then(({ data }) => setAlerts(data ?? []));
    };
    load();

    const last = Number(sessionStorage.getItem(THROTTLE_KEY) || 0);
    if (Date.now() - last < THROTTLE_MS) return;
    sessionStorage.setItem(THROTTLE_KEY, String(Date.now()));

    authFetch("/api/whatsapp/check-connections", { method: "POST" })
      .then(load)
      .catch(() => {});
  }, [userId]);

  return alerts;
}
