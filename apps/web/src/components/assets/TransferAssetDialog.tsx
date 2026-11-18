import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import FormProvider from "@/components/hook-form/form-provider";
import { FormActions } from "@/components/common/FormLayout";
import { RHFAsyncSelect, RHFTextArea } from "@/components/hook-form/fields";
import {
  transferAssetSchema,
  type TransferAssetValues,
} from "./AssetAction.schema";
import { useTransferAsset } from "@/hooks/queries/assets";
import type { AssetRecord } from "@/api/assets";

interface TransferAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: AssetRecord | null;
}

export function TransferAssetDialog({
  open,
  onOpenChange,
  asset,
}: TransferAssetDialogProps) {
  const transferMutation = useTransferAsset();

  const methods = useForm<TransferAssetValues>({
    resolver: yupResolver(transferAssetSchema),
    defaultValues: {
      to_employee_id: "",
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
      reset({ to_employee_id: "", note: "" });
    }
  }, [open, reset]);

  if (!asset) return null;

  const currentEmployee = asset.current_assignment?.employee;

  const onSubmit = async (values: TransferAssetValues) => {
    await transferMutation.mutateAsync({
      asset_id: Number(asset.id),
      to_employee_id: Number(values.to_employee_id),
      note: values.note || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Transfer hardware asset</DialogTitle>
        <p className="text-xs text-muted-foreground -mt-2">
          Reassign equipment directly from one employee to another.
        </p>

        <Card className="p-3 bg-muted/40 border-dashed text-xs space-y-1">
          <div className="flex justify-between font-medium">
            <span>
              {asset.asset_tag} —{" "}
              {[asset.brand, asset.model].filter(Boolean).join(" ")}
            </span>
          </div>
          {currentEmployee && (
            <div className="text-muted-foreground">
              Transferring from:{" "}
              <span className="font-medium text-foreground">
                {currentEmployee.first_name} {currentEmployee.last_name}
              </span>{" "}
              ({currentEmployee.employee_code})
            </div>
          )}
        </Card>

        <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 mt-2">
            <RHFAsyncSelect
              name="to_employee_id"
              label="Transfer to employee"
              endpoint="employee/options"
              required
            />
            <RHFTextArea
              name="note"
              label="Transfer note"
              placeholder="e.g. Department transfer, desk move, hardware handover..."
              rows={2}
            />
          </div>

          <FormActions
            submitting={isSubmitting || transferMutation.isPending}
            submitLabel="Complete transfer"
            onCancel={() => onOpenChange(false)}
          />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
