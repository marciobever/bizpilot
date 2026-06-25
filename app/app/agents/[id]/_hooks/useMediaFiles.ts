"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import type { MediaFile } from "../_types";

export function useMediaFiles() {
  const { user } = useAuth();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [mediaFileForm, setMediaFileForm] = useState<Partial<MediaFile>>({});
  const [showMediaFileForm, setShowMediaFileForm] = useState(false);
  const [showMediaManager, setShowMediaManager] = useState(false);
  const [uploadingMediaFile, setUploadingMediaFile] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState("");

  const handleAddMediaFile = () => {
    if (!mediaFileForm.name?.trim() || !mediaFileForm.url?.trim()) {
      alert("Nome e URL do arquivo são obrigatórios.");
      return;
    }
    const newFile: MediaFile = {
      id: crypto.randomUUID(),
      name: mediaFileForm.name.trim(),
      description: mediaFileForm.description?.trim() || "",
      url: mediaFileForm.url.trim(),
    };
    setMediaFiles((prev) => [...prev, newFile]);
    setMediaFileForm({});
    setShowMediaFileForm(false);
  };

  const handleDeleteMediaFile = (fileId: string) =>
    setMediaFiles((prev) => prev.filter((f) => f.id !== fileId));

  const handleUploadMediaFile = async (file: File) => {
    if (!user) return;
    setUploadingMediaFile(true);
    setMediaUploadError("");
    try {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "";
      const path = `${user.id}/${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
      const { error } = await supabase.storage.from("agent-media").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("agent-media").getPublicUrl(path);
      setMediaFileForm((p) => ({
        ...p,
        url: data.publicUrl,
        name: p.name?.trim() ? p.name : file.name.replace(/\.[^.]+$/, ""),
      }));
    } catch (e: any) {
      setMediaUploadError(e.message || "Erro ao enviar arquivo.");
    } finally {
      setUploadingMediaFile(false);
    }
  };

  return {
    mediaFiles,
    setMediaFiles,
    mediaFileForm,
    setMediaFileForm,
    showMediaFileForm,
    setShowMediaFileForm,
    showMediaManager,
    setShowMediaManager,
    uploadingMediaFile,
    mediaUploadError,
    handleAddMediaFile,
    handleDeleteMediaFile,
    handleUploadMediaFile,
  };
}
