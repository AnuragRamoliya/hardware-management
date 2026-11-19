import { useEffect, useState } from "react";
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
  RHFSelect,
  RHFSwitch,
  RHFTextArea,
} from "@/components/hook-form/fields";
import { Skeleton } from "@/components/ui/skeleton";
import { CREDENTIAL_CATEGORIES, type CredentialCategory } from "@hm/shared";
import {
  credentialTypeSchema,
  type CredentialTypeFormValues,
} from "./CredentialType.schema";
import {
  useAddCredentialType,
  useUpdateCredentialType,
} from "@/hooks/queries/credentials";
import type { CredentialTypeDto } from "@/api/credentials";

export interface AddEditCredentialTypeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialType?: CredentialTypeDto | null;
  loading?: boolean;
}

const categoryOptions = CREDENTIAL_CATEGORIES.map((cat) => ({
  value: cat,
  label: cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
}));

const defaultValues: CredentialTypeFormValues = {
  name: "",
  category: "other",
  expiry_days: null,
  min_length: 12,
  require_complexity: true,
  requires_approval: true,
  allow_employee_submit: true,
  notes: "",
};

export function AddEditCredentialType({
  open,
  onOpenChange,
  credentialType,
  loading = false,
}: AddEditCredentialTypeProps) {
  const isEditing = Boolean(credentialType?.id);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const addMutation = useAddCredentialType();
  const updateMutation = useUpdateCredentialType();

  const methods = useForm<CredentialTypeFormValues>({
    resolver: yupResolver(credentialTypeSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = methods;

  useEffect(() => {
    if (open) {
      if (credentialType) {
        reset({
          name: credentialType.name,
          category: credentialType.category,
          expiry_days: credentialType.expiry_days ?? null,
          min_length: credentialType.min_length ?? 12,
          require_complexity: Boolean(credentialType.require_complexity),
          requires_approval: Boolean(credentialType.requires_approval),
          allow_employee_submit: Boolean(credentialType.allow_employee_submit),
          notes: credentialType.notes || "",
        });
      } else {
        reset(defaultValues);
      }
    }
  }, [open, credentialType, reset]);

  const handleClose = () => {
    if (isDirty) {
      setConfirmDiscard(true);
    } else {
      onOpenChange(false);
    }
  };

  const onSubmit = async (values: CredentialTypeFormValues) => {
    const payload = {
      name: values.name.trim(),
      category: values.category as CredentialCategory,
      expiry_days: values.expiry_days ?? null,
      min_length: Number(values.min_length),
      require_complexity: Boolean(values.require_complexity),
      requires_approval: Boolean(values.requires_approval),
      allow_employee_submit: Boolean(values.allow_employee_submit),
      notes: values.notes?.trim() || null,
    };

    if (isEditing && credentialType) {
      await updateMutation.mutateAsync({ id: credentialType.id, ...payload });
    } else {
      await addMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={handleClose}
        title={isEditing ? "Edit Credential Type" : "Add Credential Type"}
        description={
          isEditing
            ? "Update policy settings, rotation intervals, and approval gates for this account type."
            : "Define a new credential classification, complexity policy, and approval requirements."
        }
      >
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-6">
              <FormSection
                title="Basic Information"
                description="Classification and identification details"
              >
                <FormGrid>
                  <FormGridItem span={1}>
                    <RHFTextField
                      name="name"
                      label="Type Name"
                      placeholder="e.g. AWS Production Console, GitHub Enterprise"
                      required
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFSelect
                      name="category"
                      label="Category"
                      options={categoryOptions}
                      required
                    />
                  </FormGridItem>
                </FormGrid>
              </FormSection>

              <FormSection
                title="Password Policy"
                description="Security requirements enforced on credentials of this type"
              >
                <FormGrid>
                  <FormGridItem span={1}>
                    <RHFTextField
                      name="min_length"
                      label="Minimum Length"
                      type="number"
                      required
                      helperText="Between 8 and 64 characters"
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFTextField
                      name="expiry_days"
                      label="Rotation Interval (Days)"
                      type="number"
                      placeholder="e.g. 90"
                      helperText="Leave empty for no expiry"
                    />
                  </FormGridItem>
                  <FormGridItem span={2}>
                    <RHFSwitch
                      name="require_complexity"
                      label="Require Complexity"
                      helperText="Enforces uppercase, lowercase, numbers, and symbols"
                    />
                  </FormGridItem>
                </FormGrid>
              </FormSection>

              <FormSection
                title="Governance & Submission Rules"
                description="Control how credentials of this type are managed"
              >
                <FormGrid>
                  <FormGridItem span={2}>
                    <RHFSwitch
                      name="requires_approval"
                      label="Requires Manager / Admin Approval"
                      helperText="Submissions must be reviewed before activation"
                    />
                  </FormGridItem>
                  <FormGridItem span={2}>
                    <RHFSwitch
                      name="allow_employee_submit"
                      label="Allow Employee Self-Submission"
                      helperText="Employees can register their own accounts of this type via the portal"
                    />
                  </FormGridItem>
                </FormGrid>
              </FormSection>

              <FormSection
                title="Documentation"
                description="Internal guidance and instructions for this account type"
              >
                <FormGrid>
                  <FormGridItem span={2}>
                    <RHFTextArea
                      name="notes"
                      label="Administrative Notes"
                      placeholder="e.g. Standard account provisioning workflow notes..."
                      rows={3}
                    />
                  </FormGridItem>
                </FormGrid>
              </FormSection>
            </div>

            <FormActions
              submitting={
                isSubmitting ||
                addMutation.isPending ||
                updateMutation.isPending
              }
              onCancel={handleClose}
              submitLabel={isEditing ? "Save Changes" : "Create Type"}
            />
          </FormProvider>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard Unsaved Changes?"
        description="You have unsaved changes. Closing will discard your changes."
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
