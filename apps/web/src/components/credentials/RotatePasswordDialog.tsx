import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, RefreshCw, Key } from "lucide-react";
import { toast } from "sonner";
import { useChangeCredentialPassword } from "@/hooks/queries/credentials";
import type { CredentialDto } from "@/api/credentials";

interface RotatePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredentialDto | null;
}

function generateSecureRandomPassword(length = 16): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~|}{[]:;?><,./-=";
  let result = "";
  const cryptoObj =
    window.crypto || (window as unknown as { msCrypto: Crypto }).msCrypto;
  const values = new Uint32Array(length);
  cryptoObj.getRandomValues(values);
  for (let i = 0; i < length; i++) {
    result += chars.charAt(values[i]! % chars.length);
  }
  return result;
}

export function RotatePasswordDialog({
  open,
  onOpenChange,
  credential,
}: RotatePasswordDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const changeMutation = useChangeCredentialPassword();

  const handleGenerate = () => {
    setNewPassword(generateSecureRandomPassword(16));
    setShowPassword(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }
    if (!credential) return;

    try {
      await changeMutation.mutateAsync({
        id: credential.id,
        password: newPassword,
      });
      onOpenChange(false);
      setNewPassword("");
    } catch {
      // toast in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <DialogTitle>Rotate Password</DialogTitle>
          </div>
          <DialogDescription>
            Encrypt and rotate the password for {credential?.label || "account"}
            .
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rotate-password">New Password</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs flex items-center gap-1 text-primary"
                onClick={handleGenerate}
              >
                <RefreshCw className="h-3.5 w-3.5" /> Generate
              </Button>
            </div>

            <div className="relative flex items-center">
              <Input
                id="rotate-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter or generate new password"
                className="pr-10 font-mono"
                required
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 h-8 w-8"
                onClick={() => setShowPassword((p) => !p)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={changeMutation.isPending}>
              {changeMutation.isPending
                ? "Re-encrypting..."
                : "Rotate & Encrypt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
