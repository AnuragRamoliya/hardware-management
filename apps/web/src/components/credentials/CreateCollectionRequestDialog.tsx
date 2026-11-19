import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Drawer } from "@/components/common/Drawer";
import FormProvider from "@/components/hook-form/form-provider";
import {
  FormGrid,
  FormGridItem,
  FormActions,
} from "@/components/common/FormLayout";
import {
  RHFAsyncSelect,
  RHFSelect,
  RHFDatePicker,
  RHFTextArea,
} from "@/components/hook-form/fields";
import {
  collectionRequestSchema,
  type CollectionRequestFormValues,
} from "./Credential.schema";
import {
  useCreateCredentialRequest,
  useCredentialTypeOptions,
} from "@/hooks/queries/credentials";

export interface CreateCollectionRequestDialogProps {
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
  const { data: rawTypeOptions = [] } = useCredentialTypeOptions();

  const typeOptions = useMemo(
    () =>
      rawTypeOptions
        .filter((t) => t.allow_employee_submit !== false)
        .map((t) => ({
          value: String(t.id),
          label: `${t.name} (${t.category})`,
        })),
    [rawTypeOptions],
  );

  const defaultDueDate = useMemo(
    () => new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    [],
  );

  const methods = useForm<CollectionRequestFormValues>({
    resolver: yupResolver(collectionRequestSchema),
    defaultValues: {
      employee_id: defaultEmployeeId ? String(defaultEmployeeId) : "",
      credential_type_id: "",
      due_date: defaultDueDate,
      message: "",
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
        employee_id: defaultEmployeeId ? String(defaultEmployeeId) : "",
        credential_type_id: "",
        due_date: new Date(Date.now() + 7 * 86400000)
          .toISOString()
          .split("T")[0],
        message: "",
      });
    }
  }, [open, defaultEmployeeId, reset]);

  const onSubmit = async (values: CollectionRequestFormValues) => {
    await createMutation.mutateAsync({
      employee_id: Number(values.employee_id),
      credential_type_id: Number(values.credential_type_id),
      due_date: values.due_date,
      message: values.message?.trim() || null,
    });
    onOpenChange(false);
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      title="Request Employee Credential"
      description="Dispatch a formal request to an employee to submit their credentials (e.g. laptop BitLocker, GitHub, VPN)."
    >
      <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
        <FormGrid>
          {!defaultEmployeeId && (
            <FormGridItem span={2}>
              <RHFAsyncSelect
                name="employee_id"
                label="Target Employee"
                endpoint="employee/options"
                required
              />
            </FormGridItem>
          )}

          <FormGridItem span={1}>
            <RHFSelect
              name="credential_type_id"
              label="Requested Account Type"
              options={typeOptions}
              required
            />
          </FormGridItem>

          <FormGridItem span={1}>
            <RHFDatePicker
              name="due_date"
              label="Submission Due Date"
              required
            />
          </FormGridItem>

          <FormGridItem span={2}>
            <RHFTextArea
              name="message"
              label="Instructions / Purpose"
              placeholder="e.g. Please provide your BitLocker recovery key for corporate laptop inventory compliance."
              rows={3}
            />
          </FormGridItem>
        </FormGrid>

        <FormActions
          submitting={isSubmitting || createMutation.isPending}
          onCancel={() => onOpenChange(false)}
          submitLabel="Send Request"
        />
      </FormProvider>
    </Drawer>
  );
}
