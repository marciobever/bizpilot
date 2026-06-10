"use client";
import React from "react";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
          <p className="text-muted-foreground">Ajuste as preferências do seu projeto e da sua conta.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-12 text-muted-foreground bg-card rounded-xl border border-border">
        <div className="flex flex-col items-center gap-2">
          <SettingsIcon className="h-8 w-8 animate-spin-slow" />
          <p>Página de configurações em construção.</p>
        </div>
      </div>
    </div>
  );
}
