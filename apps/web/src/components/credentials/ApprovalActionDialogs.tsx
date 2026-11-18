import { useEffect } from "react";
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
import { RHFTextArea } from "@/components/hook-form/fields";
import { Badge } from "@/components/ui/badge";
import {
  useRejectCredential,
  useNeedsChangeCredential,
} from "@/hooks/queries/credentials";
import type { CredentialDto } from "@/api/credentials";
import { FORM_VALIDATION } from "@/utils/form-validation";

const feedbackSchema = yup.object({
  feedback: yup
    .string()
    .trim()
    .required(FORM_VALIDATION.REQUIRED)
    .min(3, "Please provide at least 3 characters of feedback."),
});

type FeedbackFormValues = yup.InferType<typeof feedbackSchema>;

export interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredentialDto | null;
}

function CredentialSummaryCard({ credential }: { credential: CredentialDto }) {
  return (
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
          <span>Submitted by:</span>
          <span className="font-medium text-foreground">
            {credential.employee.first_name} {credential.employee.last_name}
          </span>
        </div>
      )}
    </div>
  );
}

export function RejectCredentialDialog({
  open,
  onOpenChange,
  credential,
}: ApprovalDialogProps) {
  const rejectMutation = useRejectCredential();

  const methods = useForm<FeedbackFormValues>({
    resolver: yupResolver(feedbackSchema),
    defaultValues: { feedback: "" },
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (open) {
      reset({ feedback: "" });
    }
  }, [open, reset]);

  if (!credential) return null;

  const onSubmit = async (values: FeedbackFormValues) => {
    await rejectMutation.mutateAsync({
      id: credential.id,
      feedback: values.feedback,
    });
    onOpenChange(false);
  };

  return (
    <ActionDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Reject Credential Submission"
      description={`Decline ${credential.label}. Provide clear feedback so the employee understands why this account was declined.`}
      summaryCard={<CredentialSummaryCard credential={credential} />}
    >
      <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
        <FormGrid>
          <FormGridItem span={2}>
            <RHFTextArea
              name="feedback"
              label="Rejection Reason"
              placeholder="e.g. Account does not match company security requirements..."
              required
              rows={3}
              autoFocus
            />
          </FormGridItem>
        </FormGrid>

        <FormActions
          submitting={isSubmitting || rejectMutation.isPending}
          onCancel={() => onOpenChange(false)}
          submitLabel="Reject Submission"
        />
      </FormProvider>
    </ActionDialogLayout>
  );
}

export function NeedsChangeDialog({
  open,
  onOpenChange,
  credential,
}: ApprovalDialogProps) {
  const needsChangeMutation = useNeedsChangeCredential();

  const methods = useForm<FeedbackFormValues>({
    resolver: yupResolver(feedbackSchema),
    defaultValues: { feedback: "" },
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (open) {
      reset({ feedback: "" });
    }
  }, [open, reset]);

  if (!credential) return null;

  const onSubmit = async (values: FeedbackFormValues) => {
    await needsChangeMutation.mutateAsync({
      id: credential.id,
      feedback: values.feedback,
    });
    onOpenChange(false);
  };

  return (
    <ActionDialogLayout
      open={open}
      onOpenChange={onOpenChange}
      title="Request Changes"
      description={`Request modifications for ${credential.label}. The employee will see your feedback in their portal.`}
      summaryCard={<CredentialSummaryCard credential={credential} />}
    >
      <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
        <FormGrid>
          <FormGridItem span={2}>
            <RHFTextArea
              name="feedback"
              label="Feedback / Instructions"
              placeholder="e.g. Please update the username to your official work email address..."
              required
              rows={3}
              autoFocus
            />
          </FormGridItem>
        </FormGrid>

        <FormActions
          submitting={isSubmitting || needsChangeMutation.isPending}
          onCancel={() => onOpenChange(false)}
          submitLabel="Request Changes"
        />
      </FormProvider>
    </ActionDialogLayout>
  );
}
