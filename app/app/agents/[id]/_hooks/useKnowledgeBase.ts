"use client";
import { useState, useEffect } from "react";
import { authFetch } from "@/lib/api-client";
import type { KnowledgeEntry } from "../_types";

export function useKnowledgeBase(id: string, activeTab: string, isNew: boolean) {
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [addingKnowledge, setAddingKnowledge] = useState(false);
  const [showKnowledgeForm, setShowKnowledgeForm] = useState(false);
  const [knowledgeForm, setKnowledgeForm] = useState({
    title: "",
    content: "",
    sourceType: "text",
    sourceUrl: "",
  });
  const [sitemapForm, setSitemapForm] = useState({
    sitemapUrl: "",
    urlFilter: "",
    maxItems: "20",
  });
  const [importingSitemap, setImportingSitemap] = useState(false);
  const [sitemapResult, setSitemapResult] = useState<{
    imported: number;
    total: number;
    errors: { url: string; error: string }[];
  } | null>(null);

  useEffect(() => {
    if (activeTab === "knowledge" && !isNew) fetchKnowledge();
  }, [activeTab, id]);

  const fetchKnowledge = async () => {
    if (!id || id === "new") return;
    setLoadingKnowledge(true);
    try {
      const res = await authFetch(`/api/knowledge?agentId=${id}`);
      if (res.ok) {
        const d = await res.json();
        setKnowledgeEntries(d.entries || []);
      }
    } finally {
      setLoadingKnowledge(false);
    }
  };

  const handleAddKnowledge = async () => {
    if (!knowledgeForm.title.trim()) return;
    if (knowledgeForm.sourceType === "text" && !knowledgeForm.content.trim()) return;
    if (knowledgeForm.sourceType === "url" && !knowledgeForm.sourceUrl.trim()) return;
    setAddingKnowledge(true);
    try {
      const res = await authFetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: id,
          title: knowledgeForm.title,
          content: knowledgeForm.content,
          sourceType: knowledgeForm.sourceType,
          sourceUrl: knowledgeForm.sourceUrl,
        }),
      });
      if (res.ok) {
        setKnowledgeForm({ title: "", content: "", sourceType: "text", sourceUrl: "" });
        setShowKnowledgeForm(false);
        fetchKnowledge();
      } else {
        const d = await res.json();
        alert(d.error || "Erro ao salvar.");
      }
    } finally {
      setAddingKnowledge(false);
    }
  };

  const handleImportSitemap = async () => {
    if (!sitemapForm.sitemapUrl.trim()) return;
    setImportingSitemap(true);
    setSitemapResult(null);
    try {
      const res = await authFetch("/api/knowledge/import-sitemap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: id,
          sitemapUrl: sitemapForm.sitemapUrl,
          urlFilter: sitemapForm.urlFilter,
          maxItems: sitemapForm.maxItems,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setSitemapResult(d);
        fetchKnowledge();
      } else {
        alert(d.error || "Erro ao importar sitemap.");
      }
    } finally {
      setImportingSitemap(false);
    }
  };

  const handleDeleteKnowledge = async (entryId: string) => {
    if (!confirm("Remover este conhecimento?")) return;
    await authFetch(`/api/knowledge/${entryId}`, { method: "DELETE" });
    setKnowledgeEntries((prev) => prev.filter((e) => e.id !== entryId));
  };

  return {
    knowledgeEntries,
    loadingKnowledge,
    addingKnowledge,
    showKnowledgeForm,
    setShowKnowledgeForm,
    knowledgeForm,
    setKnowledgeForm,
    sitemapForm,
    setSitemapForm,
    importingSitemap,
    sitemapResult,
    handleAddKnowledge,
    handleImportSitemap,
    handleDeleteKnowledge,
  };
}
