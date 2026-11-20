import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Laptop, KeyRound, Command as CommandIcon, Inbox } from "lucide-react";
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
  RHFAsyncSelect,
  RHFSelect,
  RHFTextArea,
} from "@/components/hook-form/fields";
import { Card } from "@/components/ui/card";
import {
  initiateOffboardingSchema,
  type InitiateOffboardingFormValues,
} from "./InitiateOffboarding.schema";
import {
  useInitiateOffboarding,
  useOffboardingPreview,
} from "@/hooks/queries/offboarding";
import { OFFBOARDING_EXIT_TYPE } from "@hm/shared";

export interface InitiateOffboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmployeeId?: number;
}

const defaultValues: InitiateOffboardingFormValues = {
  employee_id: "",
  last_working_day: "",
  reason: String(OFFBOARDING_EXIT_TYPE.RESIGNATION),
  notes: "",
  template_id: "",
  handover_user_id: "",
};

const reasonOptions = [
  { value: String(OFFBOARDING_EXIT_TYPE.RESIGNATION), label: "Resignation" },
  { value: String(OFFBOARDING_EXIT_TYPE.TERMINATION), label: "Termination" },
  { value: String(OFFBOARDING_EXIT_TYPE.RETIREMENT), label: "Retirement" },
  { value: String(OFFBOARDING_EXIT_TYPE.CONTRACT_END), label: "Contract End" },
  { value: String(OFFBOARDING_EXIT_TYPE.OTHER), label: "Other" },
];

export function InitiateOffboardingDialog({
  open,
  onOpenChange,
  defaultEmployeeId,
}: InitiateOffboardingDialogProps) {
  const [confirmClose, setConfirmClose] = useState(false);
  const initiateMutation = useInitiateOffboarding();

  const methods = useForm<InitiateOffboardingFormValues>({
    resolver: yupResolver(initiateOffboardingSchema),
    defaultValues: {
      ...defaultValues,
      employee_id: defaultEmployeeId ? String(defaultEmployeeId) : "",
    },
  });

  const {
    handleSubmit,
    reset,
    watch,
    formState: { isDirty, isSubmitting },
  } = methods;

  const watchedEmployeeId = watch("employee_id");
  const selectedEmpId = watchedEmployeeId
    ? Number(watchedEmployeeId)
    : undefined;
  const { data: previewData, isLoading: previewLoading } =
    useOffboardingPreview(selectedEmpId);

  const handleClose = () => {
    if (isDirty) {
      setConfirmClose(true);
    } else {
      reset(defaultValues);
      onOpenChange(false);
    }
  };

  const onSubmit = async (values: InitiateOffboardingFormValues) => {
    await initiateMutation.mutateAsync({
      employee_id: Number(values.employee_id),
      last_working_day: values.last_working_day,
      reason: values.reason || undefined,
      notes: values.notes || undefined,
      template_id: values.template_id ? Number(values.template_id) : undefined,
      handover_user_id: values.handover_user_id
        ? Number(values.handover_user_id)
        : undefined,
    });
    reset(defaultValues);
    onOpenChange(false);
  };

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(next) => {
          if (!next) handleClose();
        }}
        title="Initiate Offboarding"
        description="Begin the offboarding lifecycle, generate return tasks, and notify handover assignees."
      >
        <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6 pb-20">
            <FormSection
              title="Employee & Schedule"
              description="Select the exiting employee and their agreed last working day."
            >
              <FormGrid cols={2}>
                <FormGridItem span={2}>
                  <RHFAsyncSelect
                    name="employee_id"
                    label="Employee"
                    endpoint="employee/options"
                    required
                  />
                </FormGridItem>
                <FormGridItem>
                  <RHFTextField
                    name="last_working_day"
                    label="Last Working Day"
                    type="date"
                    required
                  />
                </FormGridItem>
                <FormGridItem>
                  <RHFSelect
                    name="reason"
                    label="Reason for Departure"
                    options={reasonOptions}
                  />
                </FormGridItem>
              </FormGrid>
            </FormSection>

            {/* Live Resource Allocation Preview */}
            {selectedEmpId && (
              <FormSection
                title="Resource Allocation Summary"
                description="Live snapshot of resources currently assigned to this employee."
              >
                {previewLoading ? (
                  <div className="animate-pulse rounded-lg border bg-muted/40 p-4 text-xs text-muted-foreground">
                    Calculating assigned hardware, software licenses,
                    credentials...
                  </div>
                ) : previewData ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Card className="flex flex-col items-center justify-center p-3 text-center">
                      <Laptop className="mb-1 h-5 w-5 text-primary" />
                      <div className="text-xl font-bold">
                        {previewData.assets?.length ?? 0}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Hardware Assets
                      </div>
                    </Card>
                    <Card className="flex flex-col items-center justify-center p-3 text-center">
                      <CommandIcon className="mb-1 h-5 w-5 text-info" />
                      <div className="text-xl font-bold">
                        {previewData.software?.length ?? 0}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Software Licenses
                      </div>
                    </Card>
                    <Card className="flex flex-col items-center justify-center p-3 text-center">
                      <KeyRound className="mb-1 h-5 w-5 text-warning" />
                      <div className="text-xl font-bold">
                        {previewData.credentials?.length ?? 0}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Credentials
                      </div>
                    </Card>
                    <Card className="flex flex-col items-center justify-center p-3 text-center">
                      <Inbox className="mb-1 h-5 w-5 text-muted-foreground" />
                      <div className="text-xl font-bold">
                        {previewData.openRequests?.length ?? 0}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Open Requests
                      </div>
                    </Card>
                  </div>
                ) : null}
              </FormSection>
            )}

            <FormSection
              title="Handover & Templates"
              description="Customize the offboarding checklist and specify the receiving staff member."
            >
              <FormGrid cols={2}>
                <FormGridItem>
                  <RHFAsyncSelect
                    name="template_id"
                    label="Offboarding Checklist Template"
                    endpoint="offboarding/template/options"
                  />
                </FormGridItem>
                <FormGridItem>
                  <RHFAsyncSelect
                    name="handover_user_id"
                    label="Assigned Handover Specialist"
                    endpoint="user/options"
                  />
                </FormGridItem>
                <FormGridItem span={2}>
                  <RHFTextArea
                    name="notes"
                    label="Internal Notes / Departure Instructions"
                    rows={3}
                    placeholder="Provide any additional handover guidelines, return addresses, or special clearance requirements..."
                  />
                </FormGridItem>
              </FormGrid>
            </FormSection>
          </div>

          <FormActions
            isSubmitting={isSubmitting || initiateMutation.isPending}
            submitLabel="Initiate Offboarding"
            onCancel={handleClose}
          />
        </FormProvider>
      </Drawer>

      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Discard changes?"
        description="You have unsaved changes. Are you sure you want to close this form?"
        confirmText="Discard"
        variant="destructive"
        onConfirm={() => {
          setConfirmClose(false);
          reset(defaultValues);
          onOpenChange(false);
        }}
      />
    </>
  );
}
