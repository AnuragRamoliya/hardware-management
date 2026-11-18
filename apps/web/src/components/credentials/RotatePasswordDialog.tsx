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
import { RHFPasswordField } from "@/components/hook-form/fields";
import { Badge } from "@/components/ui/badge";
import { useChangeCredentialPassword } from "@/hooks/queries/credentials";
import type { CredentialDto } from "@/api/credentials";
import { FORM_VALIDATION } from "@/utils/form-validation";

const rotatePasswordSchema = yup.object({
  password: yup
    .string()
    .trim()
    .required(FORM_VALIDATION.REQUIRED)
    .min(8, "Password must be at least 8 characters long"),
});

type RotatePasswordValues = yup.InferType<typeof rotatePasswordSchema>;

export interface RotatePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential: CredentialDto | null;
}

export function RotatePasswordDialog({
  open,
  onOpenChange,
  credential,
}: RotatePasswordDialogProps) {
  const changeMutation = useChangeCredentialPassword();

  const methods = useForm<RotatePasswordValues>({
    resolver: yupResolver(rotatePasswordSchema),
    defaultValues: { password: "" },
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (open) {
      reset({ password: "" });
    }
  }, [open, reset]);

  if (!credential) return null;

  const onSubmit = async (values: RotatePasswordValues) => {
    await changeMutation.mutateAsync({
      id: credential.id,
      password: values.password,
    });
    onOpenChange(false);
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
      title="Rotate Account Password"
      description={`Set a new encrypted password for ${credential.label}.`}
      summaryCard={summaryCard}
    >
      <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
        <FormGrid>
          <FormGridItem span={2}>
            <RHFPasswordField
              name="password"
              label="New Password"
              placeholder="Enter or generate new password"
              required
              showGenerator
              showStrengthMeter
              showCopy
              policy={{ minLength: 12, requireComplexity: true }}
              autoFocus
            />
          </FormGridItem>
        </FormGrid>

        <FormActions
          submitting={isSubmitting || changeMutation.isPending}
          onCancel={() => onOpenChange(false)}
          submitLabel="Rotate & Encrypt"
        />
      </FormProvider>
    </ActionDialogLayout>
  );
}
