import { useState, useEffect, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldAlert,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { credentialsApi, type CredentialDto } from "@/api/credentials";

interface RevealSecretDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredentialDto | null;
  isPortal?: boolean;
}

export function RevealSecretDialog({
  open,
  onOpenChange,
  credential,
  isPortal = false,
}: RevealSecretDialogProps) {
  const [step, setStep] = useState<"reauth" | "revealed">("reauth");
  const [currentPassword, setCurrentPassword] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Revealed secret local state ONLY
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [showPlaintext, setShowPlaintext] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoCloseSeconds, setAutoCloseSeconds] = useState(60);
  const [copyTtlSeconds, setCopyTtlSeconds] = useState<number | null>(null);

  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const copyTtlTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetState = () => {
    setStep("reauth");
    setCurrentPassword("");
    setReason("");
    setSubmitting(false);
    setRevealedPassword(null);
    setShowPlaintext(false);
    setCopied(false);
    setAutoCloseSeconds(60);
    setCopyTtlSeconds(null);
    if (autoCloseTimerRef.current) clearInterval(autoCloseTimerRef.current);
    if (copyTtlTimerRef.current) clearInterval(copyTtlTimerRef.current);
  };

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  // Auto-close timer when in revealed step
  useEffect(() => {
    if (step === "revealed") {
      setAutoCloseSeconds(60);
      autoCloseTimerRef.current = setInterval(() => {
        setAutoCloseSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(autoCloseTimerRef.current!);
            onOpenChange(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (autoCloseTimerRef.current) clearInterval(autoCloseTimerRef.current);
    };
  }, [step, onOpenChange]);

  // Handle re-authentication & reveal
  const handleReauthAndReveal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error(
        "Please enter your current account password to re-authenticate",
      );
      return;
    }

    if (!isPortal && (!reason || reason.trim().length < 5)) {
      toast.error(
        "A mandatory reason of at least 5 characters is required for audit compliance",
      );
      return;
    }

    if (!credential) return;

    try {
      setSubmitting(true);
      // 1. Re-authenticate
      const reauthRes = await credentialsApi.reauth({
        password: currentPassword,
      });
      if (!reauthRes.ok || !reauthRes.data?.reauth_token) {
        throw new Error(
          reauthRes.message || "Re-authentication failed. Incorrect password.",
        );
      }

      const reauthToken = reauthRes.data.reauth_token;

      // 2. Reveal secret
      let revealRes;
      if (isPortal) {
        revealRes = await credentialsApi.portalReveal(credential.id, {
          reauth_token: reauthToken,
          reason: "Self-view via employee portal",
        });
      } else {
        revealRes = await credentialsApi.reveal(credential.id, {
          reauth_token: reauthToken,
          reason: reason.trim(),
        });
      }

      const secret = revealRes.data?.secret || revealRes.data?.password;
      if (!revealRes.ok || !secret) {
        throw new Error(revealRes.message || "Failed to reveal secret.");
      }

      setRevealedPassword(secret);
      setStep("revealed");
      toast.success(
        "Secret revealed. The view has been logged to the immutable audit trail.",
      );
    } catch (err: unknown) {
      toast.error((err as Error).message || "Authentication or reveal failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Copy to clipboard with 30s auto-clear TTL
  const handleCopy = async () => {
    if (!revealedPassword) return;

    try {
      await navigator.clipboard.writeText(revealedPassword);
      setCopied(true);
      setCopyTtlSeconds(30);
      toast.info(
        "Password copied. Clipboard will be automatically cleared in 30 seconds.",
      );

      if (copyTtlTimerRef.current) clearInterval(copyTtlTimerRef.current);

      copyTtlTimerRef.current = setInterval(() => {
        setCopyTtlSeconds((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(copyTtlTimerRef.current!);
            navigator.clipboard.writeText("");
            setCopied(false);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } catch {
      toast.error("Failed to copy password to clipboard");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            <DialogTitle>
              {step === "reauth"
                ? "Vault Re-Authentication Gate"
                : "Secret Credential"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {step === "reauth"
              ? `Accessing secret credentials for ${credential?.label || "account"}. Re-authentication and justification are required.`
              : "Secret is decrypted and visible. Auto-closing securely."}
          </DialogDescription>
        </DialogHeader>

        {step === "reauth" ? (
          <form onSubmit={handleReauthAndReveal} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="current-password">Your Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current login password"
                autoFocus
                required
              />
            </div>

            {!isPortal && (
              <div className="space-y-2">
                <Label htmlFor="access-reason">
                  Access Reason <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="access-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Mandatory justification (e.g., ticket #102, hardware maintenance, incident response)..."
                  rows={3}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 5 characters. This justification is permanently
                  recorded in the tamper-evident audit log.
                </p>
              </div>
            )}

            <div className="rounded-md bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Every access attempt is rate-limited (max 10/hour), chained with
                SHA-256 integrity, and notifications are dispatched to the
                credential owner.
              </span>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Verifying..." : "Verify & Reveal"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>Account: {credential?.label}</span>
                <span>User: {credential?.username}</span>
              </div>

              <div className="relative flex items-center">
                <Input
                  type={showPlaintext ? "text" : "password"}
                  value={revealedPassword || ""}
                  readOnly
                  className="font-mono pr-20 text-base tracking-wider bg-muted/40"
                />
                <div className="absolute right-1 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowPlaintext((prev) => !prev)}
                    title={showPlaintext ? "Hide" : "Show"}
                  >
                    {showPlaintext ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleCopy}
                    title="Copy to clipboard"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {copyTtlSeconds !== null && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Clipboard clears automatically in {copyTtlSeconds}s
                </p>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>Auto-closing in {autoCloseSeconds}s</span>
              </div>
              <span className="font-mono text-[10px]">SHA-256 Chained</span>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                Done & Lock Vault
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
