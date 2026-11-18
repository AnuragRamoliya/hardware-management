import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { ActionDialogLayout } from "@/components/common/ActionDialogLayout";
import FormProvider from "@/components/hook-form/form-provider";
import {
  FormGrid,
  FormGridItem,
  FormActions,
} from "@/components/common/FormLayout";
import { RHFPasswordField, RHFTextArea } from "@/components/hook-form/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Copy, Check, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { credentialsApi, type CredentialDto } from "@/api/credentials";
import { FORM_VALIDATION } from "@/utils/form-validation";

export interface RevealSecretDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredentialDto | null;
  isPortal?: boolean;
}

interface ReauthFormValues {
  password: string;
  reason?: string;
}

export function RevealSecretDialog({
  open,
  onOpenChange,
  credential,
  isPortal = false,
}: RevealSecretDialogProps) {
  const [step, setStep] = useState<"reauth" | "revealed">("reauth");

  // Revealed secret local state ONLY (never store in store/cache/logs)
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [showPlaintext, setShowPlaintext] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoCloseSeconds, setAutoCloseSeconds] = useState(60);
  const [copyTtlSeconds, setCopyTtlSeconds] = useState<number | null>(null);

  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const copyTtlTimerRef = useRef<NodeJS.Timeout | null>(null);

  const reauthSchema = yup.object({
    password: yup.string().required(FORM_VALIDATION.REQUIRED),
    reason: isPortal
      ? yup.string().optional()
      : yup
          .string()
          .trim()
          .required("Mandatory justification is required for audit compliance")
          .min(5, "Minimum 5 characters required for audit trail"),
  });

  const methods = useForm<ReauthFormValues>({
    resolver: yupResolver(reauthSchema),
    defaultValues: { password: "", reason: "" },
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const resetState = useCallback(() => {
    setStep("reauth");
    setRevealedPassword(null);
    setShowPlaintext(false);
    setCopied(false);
    setAutoCloseSeconds(60);
    setCopyTtlSeconds(null);
    reset({ password: "", reason: "" });
    if (autoCloseTimerRef.current) clearInterval(autoCloseTimerRef.current);
    if (copyTtlTimerRef.current) clearInterval(copyTtlTimerRef.current);
  }, [reset]);

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open, resetState]);

  // Memory wipe and timer cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearInterval(autoCloseTimerRef.current);
      if (copyTtlTimerRef.current) clearInterval(copyTtlTimerRef.current);
    };
  }, []);

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

  if (!credential) return null;

  // Handle re-authentication & reveal
  const onReauthSubmit = async (values: ReauthFormValues) => {
    try {
      // 1. Re-authenticate
      const reauthRes = await credentialsApi.reauth({
        password: values.password,
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
          reason: values.reason!.trim(),
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

  const summaryCard = (
    <div className="space-y-1.5 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-foreground text-sm">
          {credential.label}
        </span>
        {credential.credential_type && (
          <Badge variant="outline">{credential.credential_type.name}</Badge>
        )}
      </div>
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Username / ID:</span>
        <span className="font-mono text-foreground">{credential.username}</span>
      </div>
      {credential.employee && (
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Assigned to:</span>
          <span className="font-medium text-foreground">
            {credential.employee.first_name} {credential.employee.last_name}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <ActionDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title={
        step === "reauth" ? "Vault Re-Authentication Gate" : "Secret Credential"
      }
      description={
        step === "reauth"
          ? `Accessing secret credentials for ${credential.label}. Re-authentication and justification are required.`
          : "Secret is decrypted and visible. Auto-closing securely."
      }
      summaryCard={summaryCard}
    >
      {step === "reauth" ? (
        <FormProvider methods={methods} onSubmit={handleSubmit(onReauthSubmit)}>
          <FormGrid>
            <FormGridItem span={2}>
              <RHFPasswordField
                name="password"
                label="Your Current Password"
                placeholder="Enter your current login password"
                required
                autoFocus
              />
            </FormGridItem>

            {!isPortal && (
              <FormGridItem span={2}>
                <RHFTextArea
                  name="reason"
                  label="Access Reason"
                  placeholder="Mandatory justification (e.g., ticket #102, hardware maintenance, incident response)..."
                  helperText="Minimum 5 characters. Permanently recorded in the tamper-evident audit log."
                  required
                  rows={3}
                />
              </FormGridItem>
            )}

            <FormGridItem span={2}>
              <div className="rounded-md bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  Every access attempt is rate-limited (max 10/hour), chained
                  with SHA-256 integrity, and notifications are dispatched to
                  the credential owner.
                </span>
              </div>
            </FormGridItem>
          </FormGrid>

          <FormActions
            submitting={isSubmitting}
            onCancel={() => onOpenChange(false)}
            submitLabel="Verify & Reveal"
          />
        </FormProvider>
      ) : (
        <div className="space-y-4 py-2">
          <div className="space-y-2">
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

          <div className="pt-2">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Done & Lock Vault
            </Button>
          </div>
        </div>
      )}
    </ActionDialogLayout>
  );
}
