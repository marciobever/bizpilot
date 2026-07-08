"use client";
import { useState, useEffect, useRef } from "react";
import { authFetch } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";

export function useWhatsappChannel(id: string, agentName: string, isNew: boolean) {
  const [whatsappProvider, setWhatsappProvider] = useState<"evolution" | "meta">("evolution");
  const [metaPhoneNumberId, setMetaPhoneNumberId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaWabaId, setMetaWabaId] = useState("");
  const [metaVerifyToken, setMetaVerifyToken] = useState("");
  const [metaConnected, setMetaConnected] = useState(false);
  const [metaTesting, setMetaTesting] = useState(false);
  const [metaTestMsg, setMetaTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [metaCostAck, setMetaCostAck] = useState(false);
  const [instanceToken, setInstanceToken] = useState("");
  const [instanceId, setInstanceId] = useState("");
  const [instanceNameSaved, setInstanceNameSaved] = useState("");
  const [webhookOrigin, setWebhookOrigin] = useState("");
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [customInstanceName, setCustomInstanceName] = useState("");
  const [waLoading, setWaLoading] = useState(false);
  const [waConnected, setWaConnected] = useState(false);
  const [waQrCode, setWaQrCode] = useState("");
  const [checkingWa, setCheckingWa] = useState(false);
  // true quando a instância já esteve conectada e a sessão caiu (deslogou do
  // WhatsApp) — distinto de "nunca conectada", pra avisar que precisa reescanear.
  const [sessionDropped, setSessionDropped] = useState(false);
  const waConnectedRef = useRef(false);
  useEffect(() => { waConnectedRef.current = waConnected; }, [waConnected]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWebhookOrigin(window.location.origin);
    }
    setMetaVerifyToken((prev) => prev || `bizpilot_${Math.random().toString(36).slice(2, 10)}`);
  }, []);

  useEffect(() => {
    if (agentName && !showInstanceModal) {
      setCustomInstanceName(agentName.toLowerCase().replace(/[^a-z0-9]/g, ""));
    }
  }, [agentName, showInstanceModal]);

  const webhookUrl = webhookOrigin ? `${webhookOrigin}/api/meta/webhook` : "/api/meta/webhook";

  const copyToClipboard = (value: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value).catch(() => {});
    }
  };

  // retriesLeft: "connecting" pode ser só o instante da troca de estado —
  // tenta mais algumas vezes antes de assumir que caiu de vez.
  const checkWhatsappStatus = async (retriesLeft = 3) => {
    if (!id || id === "new") return;
    try {
      const res = await authFetch(`/api/evolution/instances/agent_${id}/connectionState`);
      if (!res.ok) return;
      const data = await res.json();
      const state = data.instance?.state;

      if (state === "open") {
        setWaConnected(true);
        setSessionDropped(false);
        return;
      }
      if (state === "connecting" && retriesLeft > 0) {
        setTimeout(() => checkWhatsappStatus(retriesLeft - 1), 5000);
        return;
      }

      // Sessão realmente caiu (deslogou do WhatsApp) — corrige aqui E no
      // banco, senão a lista de agentes continua achando que está tudo bem.
      if (waConnectedRef.current) {
        setSessionDropped(true);
        await persistEvolutionConnected(`agent_${id}`, false);
      }
      setWaConnected(false);
    } catch (e) {
      console.log("Instance not found or error", e);
    }
  };

  const handleConnectWhatsapp = async (bypassModal = false) => {
    if (isNew) {
      alert("Salve o agente primeiro antes de conectar canais!");
      return;
    }
    if (!bypassModal && !showInstanceModal) {
      setShowInstanceModal(true);
      return;
    }
    setWaLoading(true);
    setShowInstanceModal(false);
    setSessionDropped(false);
    const finalInstanceName = customInstanceName.trim()
      ? `agent_${id}_${customInstanceName.trim().replace(/\s+/g, "")}`
      : `agent_${id}`;
    try {
      const res = await authFetch("/api/evolution/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName: finalInstanceName, agentId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Instância já existe no servidor (ex: sessão anterior que só caiu) —
        // o token salvo continua válido, só falta um QR novo. Não precisa recriar.
        const alreadyExists = /already exists/i.test(data.error || "");
        if (!alreadyExists) throw new Error(data.error || "Erro desconhecido ao criar instância");
      }
      setCheckingWa(true);
      fetchQrCode(finalInstanceName);
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao conectar Whatsapp: ${e.message}`);
      setWaLoading(false);
    }
  };

  const pollConnectionState = async (instName: string) => {
    try {
      const res = await authFetch(`/api/evolution/instances/${instName}/connectionState`);
      if (res.ok) {
        const data = await res.json();
        if (data.instance?.state === "open") {
          setWaConnected(true);
          setWaQrCode("");
          setCheckingWa(false);
          await persistEvolutionConnected(instName, true);
          return;
        }
      }
    } catch (e) {
      console.log(e);
    }
    setTimeout(() => {
      setCheckingWa((current) => {
        if (current) pollConnectionState(instName);
        return current;
      });
    }, 3000);
  };

  const fetchQrCode = async (instName: string = `agent_${id}`) => {
    try {
      const res = await authFetch(`/api/evolution/instances/${instName}/connect`);
      if (res.ok) {
        const data = await res.json();
        if (data.instance?.state === "open") {
          setWaConnected(true);
          setWaQrCode("");
          setWaLoading(false);
          setCheckingWa(false);
          await persistEvolutionConnected(instName, true);
          return;
        }
        if (data.base64) {
          setWaQrCode(data.base64);
          setWaLoading(false);
        } else if (data.instance?.qr) {
          setWaQrCode(data.instance.qr);
          setWaLoading(false);
        } else if (data.instance?.qrcode?.base64) {
          setWaQrCode(data.instance.qrcode.base64);
          setWaLoading(false);
        }
      }
    } catch (e) {
      console.log(e);
      setWaLoading(false);
    }
    // After displaying QR, poll /connectionState to detect when phone scans it
    setTimeout(() => {
      setCheckingWa((current) => {
        if (current) pollConnectionState(instName);
        return current;
      });
    }, 3000);
  };

  // Persiste no config.whatsapp do agente o estado de conexão do Evolution,
  // para que a lista de agentes saiba que existe (ou não) um número conectado.
  const persistEvolutionConnected = async (instName: string, connected: boolean) => {
    try {
      const { data: existing } = await supabase.from("agents").select("config").eq("id", id).single();
      const cfg = existing?.config && typeof existing.config === "object" ? existing.config : {};
      cfg.whatsapp = {
        ...(cfg.whatsapp || {}),
        provider: "evolution",
        evolution: { ...(cfg.whatsapp?.evolution || {}), connected, instanceName: instName },
      };
      await supabase.from("agents").update({
        config: cfg,
        status: connected ? "online" : "offline",
      }).eq("id", id);
    } catch (e) {
      console.error("Erro ao persistir estado da conexão Evolution:", e);
    }
  };

  const handleDisconnectWhatsapp = async () => {
    if (!confirm("Tem certeza que deseja desconectar?")) return;
    setWaLoading(true);
    try {
      await authFetch(`/api/evolution/instances/agent_${id}`, { method: "DELETE" });
      setWaConnected(false);
      setWaQrCode("");
      setCheckingWa(false);
      await persistEvolutionConnected(`agent_${id}`, false);
    } catch (e) {
      alert("Erro ao desconectar");
    } finally {
      setWaLoading(false);
    }
  };

  const handleSwitchToMeta = async () => {
    if (whatsappProvider === "evolution" && waConnected) {
      const ok = confirm(
        "Você está migrando do Evolution para o WhatsApp Oficial (Meta).\n\nIsso irá desconectar sua instância Evolution atual. Deseja continuar?"
      );
      if (!ok) return;
      try {
        await authFetch(`/api/evolution/instances/agent_${id}`, { method: "DELETE" });
        setWaConnected(false);
        setWaQrCode("");
        setCheckingWa(false);
      } catch (e) {
        console.error("Erro ao remover instância Evolution:", e);
      }
    }
    setWhatsappProvider("meta");
  };

  const handleTestMeta = async () => {
    if (isNew) {
      alert("Salve o agente primeiro antes de conectar canais!");
      return;
    }
    if (!metaCostAck) {
      setMetaTestMsg({
        ok: false,
        text: "Confirme que entendeu a cobrança por mensagem da Meta antes de conectar.",
      });
      return;
    }
    if (!metaPhoneNumberId.trim() || !metaAccessToken.trim()) {
      setMetaTestMsg({ ok: false, text: "Preencha o Phone Number ID e o Token de Acesso." });
      return;
    }
    setMetaTesting(true);
    setMetaTestMsg(null);
    try {
      const res = await authFetch("/api/meta/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberId: metaPhoneNumberId.trim(),
          accessToken: metaAccessToken.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setMetaConnected(false);
        setMetaTestMsg({ ok: false, text: data.error || "Não foi possível validar as credenciais." });
        return;
      }
      const { data: existing } = await supabase
        .from("agents")
        .select("config")
        .eq("id", id)
        .single();
      const cfg =
        existing?.config && typeof existing.config === "object" ? existing.config : {};
      cfg.whatsapp = {
        provider: "meta",
        meta: {
          phoneNumberId: metaPhoneNumberId.trim(),
          accessToken: metaAccessToken.trim(),
          wabaId: metaWabaId.trim(),
          verifyToken: metaVerifyToken.trim(),
          connected: true,
          costAcknowledged: metaCostAck,
        },
      };
      await supabase.from("agents").update({ config: cfg, status: "online" }).eq("id", id);
      setWhatsappProvider("meta");
      setMetaConnected(true);
      const numLabel = data.displayPhoneNumber ? ` (${data.displayPhoneNumber})` : "";
      const nameLabel = data.verifiedName ? `${data.verifiedName}` : "Número verificado";
      setMetaTestMsg({
        ok: true,
        text: `Conectado: ${nameLabel}${numLabel}. Cadastre o webhook na Meta para começar a receber mensagens.`,
      });
    } catch (e: any) {
      setMetaConnected(false);
      setMetaTestMsg({ ok: false, text: e.message || "Erro ao testar conexão." });
    } finally {
      setMetaTesting(false);
    }
  };

  const handleDisconnectMeta = async () => {
    if (!confirm("Desconectar o WhatsApp Oficial (Meta) deste agente?")) return;
    try {
      const { data: existing } = await supabase
        .from("agents")
        .select("config")
        .eq("id", id)
        .single();
      const cfg =
        existing?.config && typeof existing.config === "object" ? existing.config : {};
      if (cfg.whatsapp?.meta) cfg.whatsapp.meta.connected = false;
      await supabase.from("agents").update({ config: cfg, status: "offline" }).eq("id", id);
      setMetaConnected(false);
      setMetaTestMsg(null);
    } catch (e) {
      alert("Erro ao desconectar.");
    }
  };

  return {
    whatsappProvider, setWhatsappProvider,
    metaPhoneNumberId, setMetaPhoneNumberId,
    metaAccessToken, setMetaAccessToken,
    metaWabaId, setMetaWabaId,
    metaVerifyToken, setMetaVerifyToken,
    metaConnected, setMetaConnected,
    metaTesting,
    metaTestMsg, setMetaTestMsg,
    metaCostAck, setMetaCostAck,
    instanceToken, setInstanceToken,
    instanceId, setInstanceId,
    instanceNameSaved, setInstanceNameSaved,
    webhookOrigin,
    webhookUrl,
    showInstanceModal, setShowInstanceModal,
    customInstanceName, setCustomInstanceName,
    waLoading, setWaLoading,
    waConnected, setWaConnected,
    waQrCode, setWaQrCode,
    checkingWa, setCheckingWa,
    sessionDropped, setSessionDropped,
    copyToClipboard,
    checkWhatsappStatus,
    handleConnectWhatsapp,
    fetchQrCode,
    handleDisconnectWhatsapp,
    handleSwitchToMeta,
    handleTestMeta,
    handleDisconnectMeta,
  };
}
