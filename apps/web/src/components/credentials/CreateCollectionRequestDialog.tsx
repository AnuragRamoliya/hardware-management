import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { collectionRequestSchema } from "./Credential.schema";
import {
  useCreateCredentialRequest,
  useCredentialTypeOptions,
} from "@/hooks/queries/credentials";
import { SelectFilter } from "@/components/common/SelectFilter";

interface CreateCollectionRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmployeeId?: number;
}

export function CreateCollectionRequestDialog({
  open,
  onOpenChange,
  defaultEmployeeId,
}: CreateCollectionRequestDialogProps) {
  const createMutation = useCreateCredentialRequest();
  const { data: typeOptions = [] } = useCredentialTypeOptions();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(collectionRequestSchema),
    defaultValues: {
      employee_id: defaultEmployeeId || undefined,
      credential_type_id: undefined,
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      message: "",
    },
  });

  const onSubmit = async (values: Record<string, unknown>) => {
    try {
      await createMutation.mutateAsync(values);
      onOpenChange(false);
      reset();
    } catch {
      // toast in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            <DialogTitle>Request Employee Credential</DialogTitle>
          </div>
          <DialogDescription>
            Dispatch a formal request to an employee to submit their credentials
            (e.g. laptop BitLocker, GitHub, VPN).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {!defaultEmployeeId && (
            <div className="space-y-1.5">
              <Label htmlFor="req_employee_id">
                Target Employee <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="employee_id"
                control={control}
                render={({ field }) => (
                  <SelectFilter
                    endpoint="employee/options"
                    value={field.value ? String(field.value) : undefined}
                    onChange={(val?: string) =>
                      field.onChange(val ? Number(val) : undefined)
                    }
                    placeholder="Select employee..."
                  />
                )}
              />
              {errors.employee_id && (
                <p className="text-xs text-destructive">
                  {errors.employee_id.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="req_type_id">
              Requested Credential Type{" "}
              <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="credential_type_id"
              control={control}
              render={({ field }) => (
                <NativeSelect
                  id="req_type_id"
                  value={field.value || ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                >
                  <option value="">Select type...</option>
                  {typeOptions
                    .filter((t) => t.allow_employee_submit)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.category})
                      </option>
                    ))}
                </NativeSelect>
              )}
            />
            {errors.credential_type_id && (
              <p className="text-xs text-destructive">
                {errors.credential_type_id.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="due_date">
              Submission Due Date <span className="text-destructive">*</span>
            </Label>
            <Input id="due_date" type="date" {...register("due_date")} />
            {errors.due_date && (
              <p className="text-xs text-destructive">
                {errors.due_date.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="message">Instructions to Employee</Label>
            <Textarea
              id="message"
              {...register("message")}
              placeholder="e.g. Please provide your BitLocker recovery key or workstation credentials for the IT security audit..."
              rows={3}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Dispatching..." : "Send Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
