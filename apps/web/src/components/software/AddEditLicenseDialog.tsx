import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Drawer } from "@/components/common/Drawer";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { FormActions } from "@/components/common/FormLayout";
import FormProvider from "@/components/hook-form/form-provider";
import {
  RHFPasswordField,
  RHFNumberField,
  RHFDatePicker,
} from "@/components/hook-form/fields";
import { licenseFormSchema, type LicenseFormValues } from "./License.schema";
import { useCreateLicense } from "@/hooks/queries/software";

interface AddEditLicenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  softwareId: number;
  softwareName?: string;
}

export function AddEditLicenseDialog({
  open,
  onOpenChange,
  softwareId,
  softwareName,
}: AddEditLicenseDialogProps) {
  const createMutation = useCreateLicense();

  const methods = useForm<LicenseFormValues>({
    resolver: yupResolver(licenseFormSchema),
    defaultValues: {
      license_key: "",
      seats_total: 1,
      purchase_date: null,
      expiry_date: null,
    },
  });

  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = methods;

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const requestClose = () => {
    if (isDirty) {
      setConfirmDiscard(true);
    } else {
      handleClose();
    }
  };

  const onSubmit = async (values: LicenseFormValues) => {
    try {
      await createMutation.mutateAsync({
        software_id: softwareId,
        license_key: values.license_key || undefined,
        seats_total: Number(values.seats_total),
        purchase_date: values.purchase_date || undefined,
        expiry_date: values.expiry_date || undefined,
      });
      toast.success("Software license tier added");
      handleClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add license",
      );
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}
        title="Add Software License Tier"
        description={
          softwareName
            ? `Register new seats or license keys for ${softwareName}.`
            : "Register new seats or license keys."
        }
      >
        <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <RHFPasswordField
              name="license_key"
              label="License Key / Serial"
              helperText="Encrypted at rest in the credential vault; never exposed in plain text."
            />

            <RHFNumberField
              name="seats_total"
              label="Total Available Seats"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <RHFDatePicker name="purchase_date" label="Purchase Date" />
              <RHFDatePicker name="expiry_date" label="Expiry Date" />
            </div>
          </div>

          <FormActions
            submitting={isSubmitting || createMutation.isPending}
            submitLabel="Save License"
            onCancel={requestClose}
          />
        </FormProvider>
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard unsaved changes?"
        description="You have unsaved changes in this license form. If you close now, those changes will be lost."
        confirmText="Discard changes"
        variant="destructive"
        onConfirm={() => {
          setConfirmDiscard(false);
          handleClose();
        }}
      />
    </>
  );
}

export const AddEditLicenseDrawer = AddEditLicenseDialog;
