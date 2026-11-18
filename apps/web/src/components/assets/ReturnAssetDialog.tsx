import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import FormProvider from "@/components/hook-form/form-provider";
import { FormActions } from "@/components/common/FormLayout";
import { RHFSelect, RHFTextArea } from "@/components/hook-form/fields";
import {
  returnAssetSchema,
  type ReturnAssetValues,
} from "./AssetAction.schema";
import { useReturnAsset } from "@/hooks/queries/assets";
import { ASSET_CONDITIONS } from "@/utils/constants";
import type { AssetRecord } from "@/api/assets";

interface ReturnAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: AssetRecord | null;
}

const destinationStatusOptions = [
  { value: "1", label: "Available (Ready for redeployment)" },
  { value: "4", label: "In repair (Requires maintenance)" },
  { value: "5", label: "Retired (Decommission from inventory)" },
  { value: "6", label: "Lost / Damaged beyond repair" },
];

export function ReturnAssetDialog({
  open,
  onOpenChange,
  asset,
}: ReturnAssetDialogProps) {
  const returnMutation = useReturnAsset();

  const methods = useForm<ReturnAssetValues>({
    resolver: yupResolver(returnAssetSchema),
    defaultValues: {
      return_condition: "good",
      to_status: "1",
      notes: "",
    },
  });

  const {
    reset,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (open) {
      reset({
        return_condition:
          (asset?.condition as "new" | "good" | "fair" | "poor") ?? "good",
        to_status: "1",
        notes: "",
      });
    }
  }, [open, asset, reset]);

  if (!asset) return null;

  const currentEmployee = asset.current_assignment?.employee;

  const onSubmit = async (values: ReturnAssetValues) => {
    await returnMutation.mutateAsync({
      asset_id: Number(asset.id),
      return_condition: values.return_condition,
      to_status: values.to_status,
      notes: values.notes || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Return hardware asset</DialogTitle>
        <p className="text-xs text-muted-foreground -mt-2">
          Accept equipment check-in, inspect physical condition, and update
          inventory state.
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
              Currently held by: {currentEmployee.first_name}{" "}
              {currentEmployee.last_name} ({currentEmployee.employee_code})
            </div>
          )}
        </Card>

        <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 mt-2">
            <RHFSelect
              name="return_condition"
              label="Return condition"
              options={[...ASSET_CONDITIONS]}
              required
            />
            <RHFSelect
              name="to_status"
              label="Inventory status after return"
              options={destinationStatusOptions}
              required
            />
            <RHFTextArea
              name="notes"
              label="Inspection & return notes"
              placeholder="e.g. Returned with charger and mouse, light scratches on lid..."
              rows={2}
            />
          </div>

          <FormActions
            submitting={isSubmitting || returnMutation.isPending}
            submitLabel="Complete return"
            onCancel={() => onOpenChange(false)}
          />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
