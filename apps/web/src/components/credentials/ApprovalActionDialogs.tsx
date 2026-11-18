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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  useRejectCredential,
  useNeedsChangeCredential,
} from "@/hooks/queries/credentials";
import type { CredentialDto } from "@/api/credentials";

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredentialDto | null;
}

export function RejectCredentialDialog({
  open,
  onOpenChange,
  credential,
}: ApprovalDialogProps) {
  const [feedback, setFeedback] = useState("");
  const rejectMutation = useRejectCredential();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback || feedback.trim().length < 3) {
      toast.error("Please provide a rejection reason (minimum 3 characters)");
      return;
    }
    if (!credential) return;

    try {
      await rejectMutation.mutateAsync({
        id: credential.id,
        feedback: feedback.trim(),
      });
      onOpenChange(false);
      setFeedback("");
    } catch {
      // toast in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Credential Submission</DialogTitle>
          <DialogDescription>
            Reject {credential?.label || "account"}. Provide clear feedback so
            the employee knows why this account was declined.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="reject-reason">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. Account does not match company security requirements..."
              rows={3}
              required
              autoFocus
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Submission"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NeedsChangeDialog({
  open,
  onOpenChange,
  credential,
}: ApprovalDialogProps) {
  const [feedback, setFeedback] = useState("");
  const needsChangeMutation = useNeedsChangeCredential();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback || feedback.trim().length < 3) {
      toast.error(
        "Please provide instructions on what changes are needed (min 3 chars)",
      );
      return;
    }
    if (!credential) return;

    try {
      await needsChangeMutation.mutateAsync({
        id: credential.id,
        feedback: feedback.trim(),
      });
      onOpenChange(false);
      setFeedback("");
    } catch {
      // toast in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request Changes</DialogTitle>
          <DialogDescription>
            Request modifications for {credential?.label || "account"}. The
            employee will see your feedback in their portal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="needs-change-feedback">
              Feedback / Instructions{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="needs-change-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. Please update the username to your official work email address..."
              rows={3}
              required
              autoFocus
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={needsChangeMutation.isPending}>
              {needsChangeMutation.isPending ? "Sending..." : "Request Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
