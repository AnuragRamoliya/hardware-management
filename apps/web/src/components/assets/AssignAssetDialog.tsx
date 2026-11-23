import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import FormProvider from "@/components/hook-form/form-provider";
import { FormActions } from "@/components/common/FormLayout";
import { RHFAsyncSelect, RHFDatePicker, RHFTextArea } from "@/components/hook-form/fields";
import { assignAssetSchema, type AssignAssetValues } from "./AssetAction.schema";
import { useAssignAsset } from "@/hooks/queries/assets";
import type { AssetRecord } from "@/api/assets";

interface AssignAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: AssetRecord | null;
}

export function AssignAssetDialog({ open, onOpenChange, asset }: AssignAssetDialogProps) {
  const assignMutation = useAssignAsset();

  const methods = useForm<AssignAssetValues>({
    resolver: yupResolver(assignAssetSchema),
    defaultValues: {
      employee_id: "",
      due_return_date: null,
      note: "",
    },
  });

  const { reset, handleSubmit, formState: { isSubmitting } } = methods;

  useEffect(() => {
    if (open) {
      reset({ employee_id: "", due_return_date: null, note: "" });
    }
  }, [open, reset]);

  if (!asset) return null;

  const onSubmit = async (values: AssignAssetValues) => {
    await assignMutation.mutateAsync({
      asset_id: Number(asset.id),
      employee_id: Number(values.employee_id),
      due_return_date: values.due_return_date || undefined,
      note: values.note || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Assign hardware asset</DialogTitle>
        <p className="text-xs text-muted-foreground -mt-2">
          Check out equipment to an employee and record the expected return date.
        </p>

        <Card className="p-3 bg-muted/40 border-dashed text-xs space-y-1">
          <div className="flex justify-between font-medium">
            <span>{asset.asset_tag}</span>
            <span className="text-muted-foreground">{[asset.brand, asset.model].filter(Boolean).join(" ")}</span>
          </div>
          {asset.serial_no && <div className="text-muted-foreground">SN: {asset.serial_no}</div>}
        </Card>

        <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 mt-2">
            <RHFAsyncSelect
              name="employee_id"
              label="Assign to employee"
              endpoint="employee/options"
              required
            />
            <RHFDatePicker
              name="due_return_date"
              label="Expected return date"
              helperText="Optional target date for temporary loan or project assignment."
            />
            <RHFTextArea
              name="note"
              label="Assignment note"
              placeholder="e.g. Workstation setup, temporary loaner, desk location..."
              rows={2}
            />
          </div>

          <FormActions
            submitting={isSubmitting || assignMutation.isPending}
            submitLabel="Assign asset"
            onCancel={() => onOpenChange(false)}
          />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
