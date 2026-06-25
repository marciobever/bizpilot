"use client";
import { useState } from "react";
import type { AgentTool } from "../_types";

export function useAgentTools() {
  const [tools, setTools] = useState<AgentTool[]>([]);
  const [showToolForm, setShowToolForm] = useState(false);
  const [showToolsManager, setShowToolsManager] = useState(false);
  const [toolForm, setToolForm] = useState<Partial<AgentTool>>({ method: "GET", headers: {}, parameters: {}, required_params: [] });
  const [toolParamKey, setToolParamKey] = useState("");
  const [toolParamDesc, setToolParamDesc] = useState("");
  const [toolHeaderKey, setToolHeaderKey] = useState("");
  const [toolHeaderVal, setToolHeaderVal] = useState("");

  const handleAddTool = () => {
    if (!toolForm.name?.trim() || !toolForm.description?.trim() || !toolForm.url?.trim()) {
      alert("Nome, descrição e URL são obrigatórios.");
      return;
    }
    const newTool: AgentTool = {
      id: crypto.randomUUID(),
      name: toolForm.name.trim().toLowerCase().replace(/\s+/g, "_"),
      description: toolForm.description.trim(),
      url: toolForm.url.trim(),
      method: toolForm.method || "GET",
      headers: toolForm.headers || {},
      parameters: toolForm.parameters || {},
      required_params: toolForm.required_params || [],
    };
    setTools((prev) => [...prev, newTool]);
    setToolForm({ method: "GET", headers: {}, parameters: {}, required_params: [] });
    setShowToolForm(false);
  };

  const handleDeleteTool = (toolId: string) =>
    setTools((prev) => prev.filter((t) => t.id !== toolId));

  return {
    tools,
    setTools,
    showToolForm,
    setShowToolForm,
    showToolsManager,
    setShowToolsManager,
    toolForm,
    setToolForm,
    toolParamKey,
    setToolParamKey,
    toolParamDesc,
    setToolParamDesc,
    toolHeaderKey,
    setToolHeaderKey,
    toolHeaderVal,
    setToolHeaderVal,
    handleAddTool,
    handleDeleteTool,
  };
}
