"use client";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

interface FeedbackBannerProps {
  type: "success" | "error";
  message: string;
}

function FeedbackBanner({ type, message }: FeedbackBannerProps) {
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>
      {message}
    </div>
  );
}

interface Props {
  user: { email?: string; user_metadata?: { full_name?: string } } | null;
  fullName: string;
  setFullName: (v: string) => void;
  savingProfile: boolean;
  profileFeedback: { type: "success" | "error"; message: string } | null;
  onSave: () => void;
}

export function PerfilTab({ user, fullName, setFullName, savingProfile, profileFeedback, onSave }: Props) {
  const initials = user?.user_metadata?.full_name?.substring(0, 2)?.toUpperCase() || user?.email?.substring(0, 2)?.toUpperCase() || "??";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Perfil</CardTitle>
        <CardDescription>Atualize seu nome e veja os dados associados à sua conta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-brand-500 flex items-center justify-center text-xl font-bold text-white uppercase shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-foreground">{user?.user_metadata?.full_name || "Usuário"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 max-w-xl">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={user?.email || ""} disabled readOnly />
            <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado por aqui.</p>
          </div>
        </div>
        {profileFeedback && <FeedbackBanner type={profileFeedback.type} message={profileFeedback.message} />}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button onClick={onSave} disabled={savingProfile}>
          {savingProfile ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar alterações
        </Button>
      </CardFooter>
    </Card>
  );
}
