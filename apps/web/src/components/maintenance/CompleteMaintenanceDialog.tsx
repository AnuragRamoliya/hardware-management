import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import FormProvider from "@/components/hook-form/form-provider";
import { FormActions } from "@/components/common/FormLayout";
import { RHFDatePicker, RHFCurrencyField, RHFTextArea } from "@/components/hook-form/fields";
import { completeMaintenanceSchema, type CompleteMaintenanceValues } from "./Maintenance.schema";
import { useCompleteMaintenance, type MaintenanceRecord } from "@/hooks/queries/maintenance";

interface CompleteMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: MaintenanceRecord | null;
}

export function CompleteMaintenanceDialog({
  open,
  onOpenChange,
  record,
}: CompleteMaintenanceDialogProps) {
  const completeMutation = useCompleteMaintenance();

  const methods = useForm<CompleteMaintenanceValues>({
    resolver: yupResolver(completeMaintenanceSchema),
    defaultValues: {
      returned_at: new Date().toISOString().split("T")[0],
      resolution: "",
      cost: null,
    },
  });

  const { reset, handleSubmit, formState: { isSubmitting } } = methods;

  useEffect(() => {
    if (open && record) {
      reset({
        returned_at: new Date().toISOString().split("T")[0],
        resolution: record.resolution ?? "",
        cost: record.cost != null ? Number(record.cost) : null,
      });
    }
  }, [open, record, reset]);

  if (!record) return null;

  const onSubmit = async (values: CompleteMaintenanceValues) => {
    await completeMutation.mutateAsync({
      id: record.id,
      returned_at: values.returned_at,
      resolution: values.resolution,
      cost: values.cost ?? undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Complete maintenance #{record.id}</DialogTitle>
        <p className="text-xs text-muted-foreground -mt-2">
          Confirm that the hardware repair is completed and return the asset to available inventory.
        </p>

        <Card className="p-3 bg-muted/40 border-dashed text-xs space-y-1">
          <div className="font-medium text-foreground">Reported issue: {record.issue}</div>
          <div className="text-muted-foreground">
            Sent: {new Date(record.sent_at).toLocaleDateString()}
          </div>
        </Card>

        <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 mt-2">
            <RHFDatePicker
              name="returned_at"
              label="Return / completion date"
              required
            />
            <RHFCurrencyField
              name="cost"
              label="Final invoice / repair cost"
            />
            <RHFTextArea
              name="resolution"
              label="Resolution summary"
              placeholder="e.g. Replaced SSD, formatted OS, cleaned cooling fan, passed stress test..."
              rows={3}
              required
            />
          </div>

          <FormActions
            submitting={isSubmitting || completeMutation.isPending}
            submitLabel="Mark as completed"
            onCancel={() => onOpenChange(false)}
          />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
