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
  RHFAsyncSelect,
  RHFSelect,
  RHFDatePicker,
  RHFSwitch,
  RHFTextArea,
} from "@/components/hook-form/fields";
import { Skeleton } from "@/components/ui/skeleton";
import {
  credentialFormSchema,
  type CredentialFormValues,
} from "./Credential.schema";
import {
  useAddCredential,
  useUpdateCredential,
  useCredentialTypeOptions,
} from "@/hooks/queries/credentials";
import type { CredentialDto } from "@/api/credentials";

export interface AddEditCredentialProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential?: CredentialDto | null;
  defaultEmployeeId?: number;
  loading?: boolean;
}

const defaultValues: CredentialFormValues = {
  employee_id: "",
  credential_type_id: "",
  label: "",
  username: "",
  password: "",
  url: "",
  software_id: null,
  asset_id: null,
  expires_at: null,
  must_change_on_first_use: false,
  notes: "",
};

export function AddEditCredential({
  open,
  onOpenChange,
  credential,
  defaultEmployeeId,
  loading = false,
}: AddEditCredentialProps) {
  const isEditing = Boolean(credential?.id);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const { data: rawTypeOptions = [] } = useCredentialTypeOptions();
  const addMutation = useAddCredential();
  const updateMutation = useUpdateCredential();

  const typeOptions = useMemo(
    () =>
      rawTypeOptions.map((t) => ({
        value: String(t.id),
        label: t.name,
      })),
    [rawTypeOptions],
  );

  const methods = useForm<CredentialFormValues>({
    resolver: yupResolver(credentialFormSchema),
    context: { isEditing },
    defaultValues,
  });

  const {
    reset,
    watch,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = methods;

  const selectedEmployeeId = watch("employee_id");
  const selectedTypeId = watch("credential_type_id");

  // Lookup chosen type policy for password helper
  const selectedType = useMemo(
    () => rawTypeOptions.find((t) => String(t.id) === String(selectedTypeId)),
    [rawTypeOptions, selectedTypeId],
  );

  useEffect(() => {
    if (credential && open) {
      reset({
        employee_id: credential.employee_id
          ? String(credential.employee_id)
          : "",
        credential_type_id: credential.credential_type_id
          ? String(credential.credential_type_id)
          : "",
        label: credential.label ?? "",
        username: credential.username ?? "",
        password: "",
        url: credential.url ?? "",
        software_id: credential.software_id
          ? String(credential.software_id)
          : null,
        asset_id: credential.asset_id ? String(credential.asset_id) : null,
        expires_at: credential.expires_at
          ? credential.expires_at.split("T")[0]
          : null,
        must_change_on_first_use: credential.must_change_on_first_use ?? false,
        notes: credential.notes ?? "",
      });
    } else if (!open) {
      reset(defaultValues);
    } else if (defaultEmployeeId && !isEditing) {
      reset({
        ...defaultValues,
        employee_id: String(defaultEmployeeId),
      });
    }
  }, [credential, open, defaultEmployeeId, isEditing, reset]);

  const requestClose = () => {
    if (isDirty) {
      setConfirmDiscard(true);
    } else {
      onOpenChange(false);
    }
  };

  const onSubmit = async (values: CredentialFormValues) => {
    const employeeId = Number(values.employee_id);
    const typeId = Number(values.credential_type_id);

    if (isEditing && credential) {
      await updateMutation.mutateAsync({
        id: credential.id,
        employee_id: employeeId,
        credential_type_id: typeId,
        label: values.label.trim(),
        username: values.username.trim(),
        url: values.url?.trim() || undefined,
        software_id: values.software_id ? Number(values.software_id) : null,
        asset_id: values.asset_id ? Number(values.asset_id) : null,
        expires_at: values.expires_at || null,
        must_change_on_first_use: values.must_change_on_first_use ?? false,
        notes: values.notes?.trim() || undefined,
      });
    } else {
      await addMutation.mutateAsync({
        employee_id: employeeId,
        credential_type_id: typeId,
        label: values.label.trim(),
        username: values.username.trim(),
        password: values.password || "",
        url: values.url?.trim() || undefined,
        software_id: values.software_id
          ? Number(values.software_id)
          : undefined,
        asset_id: values.asset_id ? Number(values.asset_id) : undefined,
        expires_at: values.expires_at || undefined,
        must_change_on_first_use: values.must_change_on_first_use || false,
        notes: values.notes?.trim() || undefined,
      });
    }

    onOpenChange(false);
  };

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}
        title={isEditing ? "Edit Credential" : "Add Company Credential"}
        description={
          isEditing
            ? `Update account details for ${credential?.label || "account"}.`
            : "Provision a corporate account or corporate credential for an employee."
        }
      >
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-6 w-1/3" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24" />
          </div>
        ) : (
          <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-6">
              {/* 1. Account Details */}
              <FormSection
                title="Account details"
                description="Target employee, account category, service label, and login identifiers."
              >
                <FormGrid>
                  <FormGridItem span={1}>
                    <RHFAsyncSelect
                      name="employee_id"
                      label="Assigned Employee"
                      endpoint="employee/options"
                      required
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFSelect
                      name="credential_type_id"
                      label="Credential Type"
                      options={typeOptions}
                      required
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFTextField
                      name="label"
                      label="Account / Service Label"
                      placeholder="e.g. Corporate Google Workspace"
                      required
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFTextField
                      name="username"
                      label="Username or Email"
                      placeholder="e.g. user@company.com"
                      required
                    />
                  </FormGridItem>
                  <FormGridItem span={2}>
                    <RHFTextField
                      name="url"
                      label="Login Portal URL"
                      placeholder="https://accounts.google.com"
                    />
                  </FormGridItem>
                </FormGrid>
              </FormSection>

              {/* 2. Credentials & Security */}
              {!isEditing && (
                <FormSection
                  title="Credentials & Security"
                  description="Initial corporate password with generator and strength verification."
                >
                  <FormGrid>
                    <FormGridItem span={2}>
                      <RHFPasswordField
                        name="password"
                        label="Password"
                        required
                        showGenerator
                        showStrengthMeter
                        showCopy
                        policy={{
                          minLength: selectedType?.min_length || 12,
                          requireComplexity:
                            selectedType?.require_complexity ?? true,
                        }}
                      />
                    </FormGridItem>
                    <FormGridItem span={2}>
                      <RHFSwitch
                        name="must_change_on_first_use"
                        label="Require password rotation on first login"
                        helperText="Prompts the employee to set their own confidential password upon first access."
                      />
                    </FormGridItem>
                  </FormGrid>
                </FormSection>
              )}

              {/* 3. Linked items */}
              <FormSection
                title="Linked items"
                description="Optionally bind this credential to a specific hardware laptop or software license."
              >
                <FormGrid>
                  <FormGridItem span={1}>
                    <RHFAsyncSelect
                      name="asset_id"
                      label="Linked Hardware Asset"
                      endpoint="asset/options"
                      filters={
                        selectedEmployeeId
                          ? { employee_id: selectedEmployeeId }
                          : undefined
                      }
                      clearable
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFAsyncSelect
                      name="software_id"
                      label="Linked Software"
                      endpoint="software/options"
                      clearable
                    />
                  </FormGridItem>
                </FormGrid>
              </FormSection>

              {/* 4. Expiry & Policy */}
              <FormSection
                title="Expiry and policy"
                description="Credential expiration lifecycle and rotation schedule."
              >
                <FormGrid>
                  <FormGridItem span={1}>
                    <RHFDatePicker
                      name="expires_at"
                      label="Account Expiry Date"
                      helperText="Optional scheduled expiration or renewal deadline."
                    />
                  </FormGridItem>
                </FormGrid>
              </FormSection>

              {/* 5. Notes */}
              <FormSection
                title="Notes"
                description="Internal vault notes and recovery instructions."
              >
                <RHFTextArea
                  name="notes"
                  label="Administrative Notes"
                  placeholder="Recovery codes, multi-factor backup instructions, or notes for IT administrators..."
                  rows={3}
                />
              </FormSection>
            </div>

            <FormActions
              submitting={isSubmitting}
              onCancel={requestClose}
              submitLabel={isEditing ? "Save changes" : "Create credential"}
            />
          </FormProvider>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard unsaved changes?"
        description="You have unsaved changes in this credential form. If you close now, those changes will be lost."
        confirmText="Discard changes"
        variant="destructive"
        onConfirm={() => {
          setConfirmDiscard(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}

// Backwards-compatible export
export const AddEditCredentialDialog = AddEditCredential;
