import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Drawer } from "@/components/common/Drawer";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import FormProvider from "@/components/hook-form/form-provider";
import {
  FormSection,
  FormGrid,
  FormGridItem,
  FormActions,
} from "@/components/common/FormLayout";
import {
  RHFTextField,
  RHFPasswordField,
  RHFSelect,
  RHFTextArea,
} from "@/components/hook-form/fields";
import {
  portalCredentialSchema,
  type PortalCredentialFormValues,
} from "./Credential.schema";
import {
  usePortalAddCredential,
  usePortalUpdateCredential,
  usePortalAllowedTypes,
} from "@/hooks/queries/credentials";
import type { CredentialDto } from "@/api/credentials";

export interface AddEditPortalAccountProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential?: CredentialDto | null;
  defaultTypeId?: number;
}

const defaultValues: PortalCredentialFormValues = {
  credential_type_id: "",
  label: "",
  username: "",
  password: "",
  url: "",
  notes: "",
};

export function AddEditPortalAccount({
  open,
  onOpenChange,
  credential,
  defaultTypeId,
}: AddEditPortalAccountProps) {
  const isEditing = Boolean(credential?.id);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const { data: allowedTypes = [] } = usePortalAllowedTypes();
  const addMutation = usePortalAddCredential();
  const updateMutation = usePortalUpdateCredential();

  const typeOptions = useMemo(
    () =>
      allowedTypes.map((t) => ({
        value: String(t.id),
        label: `${t.name} (${t.category})`,
      })),
    [allowedTypes],
  );

  const methods = useForm<PortalCredentialFormValues>({
    resolver: yupResolver(portalCredentialSchema),
    context: { isEditing },
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = methods;

  useEffect(() => {
    if (open) {
      if (credential) {
        reset({
          credential_type_id: String(credential.credential_type_id),
          label: credential.label,
          username: credential.username,
          password: "",
          url: credential.url || "",
          notes: credential.notes || "",
        });
      } else {
        reset({
          ...defaultValues,
          credential_type_id: defaultTypeId
            ? String(defaultTypeId)
            : allowedTypes[0]?.id
              ? String(allowedTypes[0].id)
              : "",
        });
      }
    }
  }, [open, credential, defaultTypeId, allowedTypes, reset]);

  const handleClose = () => {
    if (isDirty) {
      setConfirmDiscard(true);
    } else {
      onOpenChange(false);
    }
  };

  const onSubmit = async (values: PortalCredentialFormValues) => {
    if (isEditing && credential) {
      await updateMutation.mutateAsync({
        id: credential.id,
        label: values.label.trim(),
        username: values.username.trim(),
        url: values.url?.trim() || null,
        notes: values.notes?.trim() || null,
      });
    } else {
      await addMutation.mutateAsync({
        credential_type_id: Number(values.credential_type_id),
        label: values.label.trim(),
        username: values.username.trim(),
        password: values.password || "",
        url: values.url?.trim() || null,
        notes: values.notes?.trim() || null,
      });
    }
    onOpenChange(false);
  };

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={handleClose}
        title={isEditing ? "Edit Account Details" : "Submit Account to Vault"}
        description={
          isEditing
            ? "Update label, username, or portal access details for your registered account."
            : "Register your account. Credentials are encrypted client-side with AES-256-GCM and submitted for IT review."
        }
      >
        <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6 pb-6">
            <FormSection
              title="Account Details"
              description="Basic service and identity information"
            >
              <FormGrid>
                <FormGridItem span={2}>
                  <RHFSelect
                    name="credential_type_id"
                    label="Account Type"
                    options={typeOptions}
                    required
                  />
                </FormGridItem>

                <FormGridItem span={2}>
                  <RHFTextField
                    name="label"
                    label="Account / Service Name"
                    placeholder="e.g. GitHub Enterprise, AWS Production"
                    required
                  />
                </FormGridItem>

                <FormGridItem span={2}>
                  <RHFTextField
                    name="username"
                    label="Username / ID / Email"
                    placeholder="e.g. jdoe@company.com"
                    required
                  />
                </FormGridItem>
              </FormGrid>
            </FormSection>

            {!isEditing && (
              <FormSection
                title="Credential & Security"
                description="Secrets are encrypted at rest with AES-256-GCM before database write"
              >
                <FormGrid>
                  <FormGridItem span={2}>
                    <RHFPasswordField
                      name="password"
                      label="Password / Secret"
                      placeholder="Enter or generate a strong password"
                      required
                      showGenerator
                      showStrengthMeter
                      showCopy
                      policy={{ minLength: 12, requireComplexity: true }}
                    />
                  </FormGridItem>
                </FormGrid>
              </FormSection>
            )}

            <FormSection
              title="Additional Information"
              description="Optional access URL and notes"
            >
              <FormGrid>
                <FormGridItem span={2}>
                  <RHFTextField
                    name="url"
                    label="Access URL"
                    placeholder="https://console.example.com"
                    helperText="Direct link to the login page or portal"
                  />
                </FormGridItem>

                <FormGridItem span={2}>
                  <RHFTextArea
                    name="notes"
                    label="Notes / Instructions"
                    placeholder="e.g. Multi-factor authentication via Duo..."
                    rows={3}
                  />
                </FormGridItem>
              </FormGrid>
            </FormSection>
          </div>

          <FormActions
            submitting={
              isSubmitting || addMutation.isPending || updateMutation.isPending
            }
            onCancel={handleClose}
            submitLabel={isEditing ? "Save Changes" : "Submit Account"}
          />
        </FormProvider>
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard Unsaved Changes?"
        description="You have unsaved changes. Closing will discard your edits."
        confirmText="Discard Changes"
        variant="destructive"
        onConfirm={() => {
          setConfirmDiscard(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
