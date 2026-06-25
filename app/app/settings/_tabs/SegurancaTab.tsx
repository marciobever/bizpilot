"use client";
import { KeyRound, LogOut, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface Props {
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  savingPassword: boolean;
  passwordFeedback: { type: "success" | "error"; message: string } | null;
  onChangePassword: () => void;
  onSignOut: () => void;
}

export function SegurancaTab({ newPassword, setNewPassword, confirmPassword, setConfirmPassword, savingPassword, passwordFeedback, onChangePassword, onSignOut }: Props) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Alterar Senha</CardTitle>
          <CardDescription>Use uma senha forte, com pelo menos 6 caracteres.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="new_password">Nova senha</Label>
            <Input id="new_password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirmar nova senha</Label>
            <Input id="confirm_password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {passwordFeedback && (
            <div className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium", passwordFeedback.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500" : "border-red-500/30 bg-red-500/10 text-red-400")}>
              {passwordFeedback.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
              {passwordFeedback.message}
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-end">
          <Button onClick={onChangePassword} disabled={savingPassword}>
            {savingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <KeyRound className="h-4 w-4 mr-2" />}
            Alterar senha
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-red-500/20">
        <CardHeader>
          <CardTitle>Sessão</CardTitle>
          <CardDescription>Encerre sua sessão atual neste dispositivo.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={onSignOut} variant="destructive">
            <LogOut className="h-4 w-4 mr-2" /> Sair da conta
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
