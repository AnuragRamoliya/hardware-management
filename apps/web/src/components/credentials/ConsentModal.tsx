import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock } from "lucide-react";
import { usePortalAcceptConsent } from "@/hooks/queries/credentials";

interface ConsentModalProps {
  open: boolean;
  onAccepted: () => void;
  policyText?: string;
}

export function ConsentModal({
  open,
  onAccepted,
  policyText,
}: ConsentModalProps) {
  const acceptMutation = usePortalAcceptConsent();

  const handleAccept = async () => {
    try {
      await acceptMutation.mutateAsync();
      onAccepted();
    } catch {
      // toast in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <DialogTitle>
              Credential Vault Privacy & Compliance Policy
            </DialogTitle>
          </div>
          <DialogDescription>
            Please review and acknowledge the corporate credential security
            policy before accessing your account vault.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3 text-sm text-foreground/90">
          <div className="rounded-lg border p-3 bg-muted/30 text-xs leading-relaxed space-y-2">
            <p className="font-semibold text-foreground">
              Corporate Authorization Statement:
            </p>
            <p>
              {policyText ||
                "Company IT administrators have authorized access to view, update, or revoke company-provided accounts. Your submitted credentials may be inspected for security compliance, disaster recovery, and audit purposes."}
            </p>
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                All secrets are encrypted with AES-256-GCM before database
                write.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>
                Every admin view requires re-authentication, mandatory reason,
                and notifies you.
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            className="w-full"
            onClick={handleAccept}
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending
              ? "Recording Acceptance..."
              : "I Acknowledge and Accept"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
