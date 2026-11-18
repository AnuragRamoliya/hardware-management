import { ActionDialogLayout } from "@/components/common/ActionDialogLayout";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock } from "lucide-react";
import { usePortalAcceptConsent } from "@/hooks/queries/credentials";

export interface ConsentModalProps {
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

  const summaryCard = (
    <div className="space-y-2 text-xs leading-relaxed">
      <p className="font-semibold text-foreground">
        Corporate Authorization Statement:
      </p>
      <p className="text-muted-foreground">
        {policyText ||
          "Company IT administrators have authorized access to view, update, or revoke company-provided accounts. Your submitted credentials may be inspected for security compliance, disaster recovery, and audit purposes."}
      </p>
    </div>
  );

  return (
    <ActionDialogLayout
      open={open}
      onOpenChange={() => {}}
      title="Credential Vault Compliance Policy"
      description="Review and acknowledge corporate security policies before accessing your credential vault."
      summaryCard={summaryCard}
    >
      <div className="space-y-4 py-2">
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary shrink-0" />
            <span>
              All secrets are encrypted at rest with AES-256-GCM before database
              write.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>
              Every administrative reveal requires re-authentication, mandatory
              justification reason, and creates an immutable audit trail.
            </span>
          </div>
        </div>

        <div className="pt-2">
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
        </div>
      </div>
    </ActionDialogLayout>
  );
}
