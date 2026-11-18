import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { FormActions } from "@/components/common/FormLayout";
import FormProvider from "@/components/hook-form/form-provider";
import { RHFAsyncSelect } from "@/components/hook-form/fields";
import {
  assignSoftwareSchema,
  type AssignSoftwareValues,
} from "./SoftwareAction.schema";
import { useAssignSoftware } from "@/hooks/queries/software";
import type { SoftwareRecord } from "@/api/software";

interface AssignSoftwareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  software?: SoftwareRecord | null;
}

export function AssignSoftwareDialog({
  open,
  onOpenChange,
  software,
}: AssignSoftwareDialogProps) {
  const assignMutation = useAssignSoftware();

  const methods = useForm<AssignSoftwareValues>({
    resolver: yupResolver(assignSoftwareSchema),
    defaultValues: {
      employee_id: undefined,
      license_id: null,
    },
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = methods;

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const onSubmit = async (values: AssignSoftwareValues) => {
    if (!software) return;
    try {
      await assignMutation.mutateAsync({
        software_id: Number(software.id),
        employee_id: Number(values.employee_id),
        license_id: values.license_id ? Number(values.license_id) : undefined,
      });
      toast.success(`Access to ${software.name} assigned successfully`);
      handleClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to assign software license",
      );
    }
  };

  if (!software) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogTitle>Assign Software Access</DialogTitle>
        <p className="text-xs text-muted-foreground">
          Allocate a software seat or license key to an employee.
        </p>

        <Card className="p-3 bg-muted/40 mt-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">{software.name}</p>
            <span className="text-xs text-muted-foreground capitalize">
              {software.category}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>License: {software.license_type.replaceAll("_", " ")}</span>
            <span>
              Seat usage:{" "}
              {software.seats_total
                ? `${software.seats_used} / ${software.seats_total}`
                : "Unlimited"}
            </span>
          </div>
        </Card>

        <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 mt-2">
            <RHFAsyncSelect
              name="employee_id"
              label="Assign to Employee"
              endpoint="employee/options"
              required
            />

            <RHFAsyncSelect
              name="license_id"
              label="Specific License Key (Optional)"
              endpoint="software/license/options"
              filters={{
                software_id: Number(software.id),
                has_available_seats: true,
              }}
              clearable
              helperText="Only licenses with available seats for this application are listed."
            />
          </div>

          <FormActions
            submitting={isSubmitting || assignMutation.isPending}
            submitLabel="Grant Access"
            onCancel={handleClose}
          />
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
