import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import FormProvider from "@/components/hook-form/form-provider";
import { FormActions } from "@/components/common/FormLayout";
import {
  RHFAsyncSelect,
  RHFDatePicker,
  RHFTextArea,
} from "@/components/hook-form/fields";
import {
  bulkAssignAssetSchema,
  type BulkAssignAssetValues,
} from "./AssetAction.schema";
import { useBulkAssignAssets } from "@/hooks/queries/assets";
import type { AssetRecord } from "@/api/assets";

interface BulkAssignAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: AssetRecord[];
  onComplete?: () => void;
}

export function BulkAssignAssetDialog({
  open,
  onOpenChange,
  assets,
  onComplete,
}: BulkAssignAssetDialogProps) {
  const bulkAssignMutation = useBulkAssignAssets();

  const methods = useForm<BulkAssignAssetValues>({
    resolver: yupResolver(bulkAssignAssetSchema),
    defaultValues: {
      employee_id: "",
      due_return_date: null,
      note: "",
    },
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (open) {
      reset({ employee_id: "", due_return_date: null, note: "" });
    }
  }, [open, reset]);

  if (!assets.length) return null;

  const onSubmit = async (values: BulkAssignAssetValues) => {
    const items = assets.map((a) => ({
      asset_id: Number(a.id),
      employee_id: Number(values.employee_id),
      due_return_date: values.due_return_date || undefined,
      note: values.note || undefined,
    }));

    await bulkAssignMutation.mutateAsync({ items });
    onOpenChange(false);
    onComplete?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Bulk assign assets ({assets.length})</DialogTitle>
        <p className="text-xs text-muted-foreground -mt-2">
          Assign all {assets.length} selected equipment items to an employee in
          a single transaction.
        </p>

        <Card className="p-3 bg-muted/40 border-dashed text-xs max-h-36 overflow-y-auto space-y-1">
          <p className="font-semibold text-muted-foreground">
            Selected Assets:
          </p>
          {assets.map((a) => (
            <div key={a.id} className="flex justify-between">
              <span className="font-medium">{a.asset_tag}</span>
              <span className="text-muted-foreground">
                {[a.brand, a.model].filter(Boolean).join(" ")}
              </span>
            </div>
          ))}
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
              helperText="Target date for loan or project allocation."
            />
            <RHFTextArea
              name="note"
              label="Assignment note"
              placeholder="Optional notes for this batch assignment..."
              rows={2}
            />
          </div>

          <FormActions
            submitting={isSubmitting || bulkAssignMutation.isPending}
            submitLabel={`Assign ${assets.length} items`}
            onCancel={() => onOpenChange(false)}
          />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
