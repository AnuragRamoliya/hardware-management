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
  RHFTextArea,
  RHFSelect,
  RHFPhoneInput,
} from "@/components/hook-form/fields";
import { Skeleton } from "@/components/ui/skeleton";
import { ENUMS } from "@/utils/constants";
import { vendorFormSchema, type VendorFormValues } from "./Vendor.schema";
import {
  useCreateVendor,
  useUpdateVendor,
  type VendorRecord,
} from "@/hooks/queries/vendors";

interface AddEditVendorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: VendorRecord | null;
  loading?: boolean;
}

const defaultValues: VendorFormValues = {
  name: "",
  contact_name: "",
  email: null,
  phone: "",
  address: "",
  status: "1",
};

export function AddEditVendor({
  open,
  onOpenChange,
  vendor,
  loading,
}: AddEditVendorProps) {
  const isEdit = Boolean(vendor?.id);
  const createMutation = useCreateVendor();
  const updateMutation = useUpdateVendor();

  const methods = useForm<VendorFormValues>({
    resolver: yupResolver(vendorFormSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = methods;

  useEffect(() => {
    if (vendor && open) {
      reset({
        name: vendor.name ?? "",
        contact_name: vendor.contact_name ?? "",
        email: vendor.email ?? null,
        phone: vendor.phone ?? "",
        address: vendor.address ?? "",
        status: String(vendor.status ?? "1"),
      });
    } else if (!open) {
      reset(defaultValues);
    }
  }, [vendor, open, reset]);

  const onSubmit = async (values: VendorFormValues) => {
    const payload: Partial<VendorRecord> = {
      name: values.name.trim(),
      contact_name: values.contact_name ? values.contact_name.trim() : null,
      email: values.email ? values.email.trim() : null,
      phone: values.phone ? values.phone.trim() : null,
      address: values.address ? values.address.trim() : null,
      status: Number(values.status),
    };

    if (isEdit && vendor?.id) {
      await updateMutation.mutateAsync({ ...payload, id: vendor.id });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const requestClose = () => {
    if (isDirty) {
      setConfirmDiscard(true);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}
        title={isEdit ? `Edit vendor: ${vendor?.name}` : "Add new vendor"}
        description={
          isEdit
            ? "Update vendor supplier profile, contact details, and address."
            : "Register a hardware manufacturer or software license supplier."
        }
      >
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-6">
              <FormSection
                title="Vendor Information"
                description="Supplier company name and primary point of contact."
              >
                <FormGrid>
                  <FormGridItem span={2}>
                    <RHFTextField
                      name="name"
                      label="Vendor / Supplier name"
                      placeholder="e.g. Dell Enterprise, Apple India, CDW"
                      required
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFTextField
                      name="contact_name"
                      label="Contact person"
                      placeholder="Name of account manager or representative"
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFTextField
                      name="email"
                      label="Contact email"
                      placeholder="support@vendor.com"
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFPhoneInput name="phone" label="Contact phone" />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFSelect
                      name="status"
                      label="Status"
                      options={[...ENUMS.recordStatus]}
                      required
                    />
                  </FormGridItem>
                  <FormGridItem span={2}>
                    <RHFTextArea
                      name="address"
                      label="Office address"
                      placeholder="Supplier headquarters or warehouse address"
                    />
                  </FormGridItem>
                </FormGrid>
              </FormSection>
            </div>
            <FormActions
              submitting={
                isSubmitting ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              submitLabel={isEdit ? "Save changes" : "Create vendor"}
              onCancel={requestClose}
            />
          </FormProvider>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard unsaved changes?"
        description="You have unsaved changes in this vendor form. If you close now, those changes will be lost."
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
