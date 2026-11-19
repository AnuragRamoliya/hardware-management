import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Drawer } from "@/components/common/Drawer";
import {
  FormSection,
  FormGrid,
  FormActions,
  FormGridItem,
} from "@/components/common/FormLayout";
import FormProvider from "@/components/hook-form/form-provider";
import {
  RHFTextField,
  RHFSelect,
  RHFAsyncSelect,
  RHFCurrencyField,
  RHFDatePicker,
  RHFTextArea,
} from "@/components/hook-form/fields";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { SOFTWARE_CATEGORIES, SOFTWARE_LICENSE_TYPES } from "@/utils/constants";
import { softwareFormSchema, type SoftwareFormValues } from "./Software.schema";
import { useCreateSoftware, useUpdateSoftware } from "@/hooks/queries/software";
import type { SoftwareRecord } from "@/api/software";

interface AddEditSoftwareProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  software?: SoftwareRecord | null;
  loading?: boolean;
}

const defaultValues: SoftwareFormValues = {
  name: "",
  category: "productivity",
  license_type: "per_user",
  vendor_id: null,
  cost: null,
  billing_cycle: "annual",
  renewal_date: null,
  notes: "",
};

export function AddEditSoftware({
  open,
  onOpenChange,
  software,
  loading = false,
}: AddEditSoftwareProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const isEditing = Boolean(software?.id);

  const createMutation = useCreateSoftware();
  const updateMutation = useUpdateSoftware();

  const methods = useForm<SoftwareFormValues>({
    resolver: yupResolver(softwareFormSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = methods;

  useEffect(() => {
    if (software && open) {
      reset({
        name: software.name ?? "",
        category: software.category ?? "productivity",
        license_type: software.license_type ?? "per_user",
        vendor_id:
          software.vendor_id != null ? Number(software.vendor_id) : null,
        cost: software.cost != null ? Number(software.cost) : null,
        billing_cycle: software.billing_cycle ?? "annual",
        renewal_date: software.renewal_date ?? null,
        notes: software.notes ?? "",
      });
    } else if (!open) {
      reset(defaultValues);
    }
  }, [software, open, reset]);

  const handleClose = () => {
    if (isDirty) {
      setConfirmDiscard(true);
    } else {
      onOpenChange(false);
    }
  };

  const onSubmit = async (values: SoftwareFormValues) => {
    try {
      if (isEditing && software) {
        await updateMutation.mutateAsync({
          id: software.id,
          name: values.name,
          category: values.category,
          license_type: values.license_type,
          vendor_id: values.vendor_id ?? undefined,
          cost: values.cost ?? undefined,
          billing_cycle: values.billing_cycle ?? undefined,
          renewal_date: values.renewal_date ?? undefined,
          notes: values.notes ?? undefined,
        });
        toast.success("Software application updated successfully");
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          category: values.category,
          license_type: values.license_type,
          vendor_id: values.vendor_id ?? undefined,
          cost: values.cost ?? undefined,
          billing_cycle: values.billing_cycle ?? undefined,
          renewal_date: values.renewal_date ?? undefined,
          notes: values.notes ?? undefined,
        });
        toast.success("Software registered successfully");
      }
      reset(values);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save software application",
      );
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) handleClose();
          else onOpenChange(true);
        }}
        title={isEditing ? `Edit ${software?.name}` : "Add Software"}
        description={
          isEditing
            ? "Update software license details, vendor, renewal and billing schedule."
            : "Register a software application, license tier, and procurement information."
        }
      >
        {loading ? (
          <div className="space-y-6 p-6">
            <Skeleton className="h-6 w-32" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
            <FormSection
              title="Application Information"
              description="Core software identity, categorization, and license structure."
            >
              <FormGrid>
                <FormGridItem span={2}>
                  <RHFTextField
                    name="name"
                    label="Software / App Name"
                    placeholder="e.g. Figma Organization, Slack Pro, JetBrains All Products"
                    required
                  />
                </FormGridItem>

                <RHFSelect
                  name="category"
                  label="Category"
                  options={[...SOFTWARE_CATEGORIES]}
                  required
                />

                <RHFSelect
                  name="license_type"
                  label="License Type"
                  options={[...SOFTWARE_LICENSE_TYPES]}
                  required
                />
              </FormGrid>
            </FormSection>

            <FormSection
              title="Vendor & Subscription"
              description="Supplier vendor, subscription billing cycle, and renewal scheduling."
            >
              <FormGrid>
                <FormGridItem span={2}>
                  <RHFAsyncSelect
                    name="vendor_id"
                    label="Software Vendor / Reseller"
                    endpoint="vendor/options"
                    clearable
                  />
                </FormGridItem>

                <RHFCurrencyField
                  name="cost"
                  label="Subscription / Seat Cost"
                />

                <RHFTextField
                  name="billing_cycle"
                  label="Billing Cycle"
                  placeholder="e.g. monthly, annual, perpetual"
                />

                <FormGridItem span={2}>
                  <RHFDatePicker
                    name="renewal_date"
                    label="Upcoming Renewal Date"
                  />
                </FormGridItem>
              </FormGrid>
            </FormSection>

            <FormSection
              title="Additional Notes"
              description="Internal administrative guidelines, provisioning notes, or procurement contracts."
            >
              <RHFTextArea
                name="notes"
                label="Notes & Terms"
                placeholder="e.g. Single Sign-On configured via Okta; license keys stored in security vault..."
                rows={3}
              />
            </FormSection>

            <FormActions
              submitting={
                isSubmitting ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              submitLabel={isEditing ? "Save changes" : "Create software"}
              onCancel={handleClose}
            />
          </FormProvider>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard unsaved changes?"
        description="You have unsaved form entries. If you leave now, your software changes will be lost."
        confirmText="Discard changes"
        variant="destructive"
        onConfirm={() => {
          setConfirmDiscard(false);
          reset(defaultValues);
          onOpenChange(false);
        }}
      />
    </>
  );
}
