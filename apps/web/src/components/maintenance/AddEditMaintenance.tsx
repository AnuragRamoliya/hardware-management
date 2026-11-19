import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Drawer } from "@/components/common/Drawer";
import FormProvider from "@/components/hook-form/form-provider";
import {
  FormSection,
  FormGrid,
  FormGridItem,
  FormActions,
} from "@/components/common/FormLayout";
import {
  RHFAsyncSelect,
  RHFCurrencyField,
  RHFDatePicker,
  RHFTextArea,
} from "@/components/hook-form/fields";
import {
  maintenanceFormSchema,
  type MaintenanceFormValues,
} from "./Maintenance.schema";
import { useCreateMaintenance } from "@/hooks/queries/maintenance";

interface AddEditMaintenanceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialAssetId?: number;
}

const defaultValues: MaintenanceFormValues = {
  asset_id: "",
  issue: "",
  vendor_id: null,
  cost: null,
  sent_at: new Date().toISOString().split("T")[0],
};

export function AddEditMaintenance({
  open,
  onOpenChange,
  initialAssetId,
}: AddEditMaintenanceProps) {
  const createMutation = useCreateMaintenance();

  const methods = useForm<MaintenanceFormValues>({
    resolver: yupResolver(maintenanceFormSchema),
    defaultValues,
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (open) {
      reset({
        ...defaultValues,
        asset_id: initialAssetId ? String(initialAssetId) : "",
        sent_at: new Date().toISOString().split("T")[0],
      });
    }
  }, [open, initialAssetId, reset]);

  const onSubmit = async (values: MaintenanceFormValues) => {
    await createMutation.mutateAsync({
      asset_id: Number(values.asset_id),
      issue: values.issue,
      vendor_id: values.vendor_id ? Number(values.vendor_id) : undefined,
      cost: values.cost ?? undefined,
      sent_at: values.sent_at,
    });
    onOpenChange(false);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Send hardware to maintenance"
      description="Record a repair or servicing dispatch. The asset status will update to 'In repair'."
    >
      <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-6">
          <FormSection
            title="Service Request"
            description="Identify the faulty asset and describe the malfunction or requested service."
          >
            <FormGrid>
              <FormGridItem span={1}>
                <RHFAsyncSelect
                  name="asset_id"
                  label="Hardware Asset"
                  endpoint="asset/options"
                  required
                />
              </FormGridItem>
              <FormGridItem span={1}>
                <RHFDatePicker name="sent_at" label="Dispatch Date" required />
              </FormGridItem>
              <FormGridItem span={1}>
                <RHFAsyncSelect
                  name="vendor_id"
                  label="Servicing Vendor / Shop"
                  endpoint="vendor/options"
                  clearable
                />
              </FormGridItem>
              <FormGridItem span={1}>
                <RHFCurrencyField name="cost" label="Estimated Repair Cost" />
              </FormGridItem>
              <FormGridItem span={2}>
                <RHFTextArea
                  name="issue"
                  label="Issue / Problem Description"
                  placeholder="Describe screen flicker, broken hinge, overheating, RAM failure..."
                  rows={3}
                  required
                />
              </FormGridItem>
            </FormGrid>
          </FormSection>
        </div>

        <FormActions
          submitting={isSubmitting || createMutation.isPending}
          submitLabel="Dispatch to maintenance"
          onCancel={() => onOpenChange(false)}
        />
      </FormProvider>
    </Drawer>
  );
}
