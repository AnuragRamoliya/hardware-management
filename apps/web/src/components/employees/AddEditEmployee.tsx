import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
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
  RHFPasswordField,
  RHFAsyncSelect,
  RHFSelect,
} from "@/components/hook-form/fields";
import { Skeleton } from "@/components/ui/skeleton";
import { ENUMS } from "@/utils/constants";
import { employeeFormSchema, type EmployeeFormValues } from "./Employee.schema";
import {
  useCreateEmployee,
  useUpdateEmployee,
  type EmployeeRecord,
} from "@/hooks/queries/employee";

interface AddEditEmployeeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee?: EmployeeRecord | null;
  loading?: boolean;
}

const defaultValues: EmployeeFormValues = {
  employee_code: "",
  first_name: "",
  last_name: "",
  email: "",
  department_id: null,
  designation_id: null,
  location_id: null,
  manager_id: null,
  create_login: 0,
  login_password: "",
  employment_status: 1,
  status: 1,
};

export function AddEditEmployee({
  open,
  onOpenChange,
  employee,
  loading,
}: AddEditEmployeeProps) {
  const isEdit = Boolean(employee?.id);
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();

  const methods = useForm<EmployeeFormValues>({
    resolver: yupResolver(employeeFormSchema),
    defaultValues,
  });

  const {
    reset,
    watch,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = methods;

  const createLoginValue = watch("create_login");
  const isCreatingLogin = String(createLoginValue) === "1";

  useEffect(() => {
    if (employee && open) {
      reset({
        employee_code: employee.employee_code ?? "",
        first_name: employee.first_name ?? "",
        last_name: employee.last_name ?? "",
        email: employee.email ?? "",
        department_id: employee.department_id
          ? String(employee.department_id)
          : null,
        designation_id: employee.designation_id
          ? String(employee.designation_id)
          : null,
        location_id: employee.location_id ? String(employee.location_id) : null,
        manager_id: employee.manager_id ? String(employee.manager_id) : null,
        create_login: 0,
        login_password: "",
        employment_status: String(employee.employment_status ?? 1),
        status: String(employee.status ?? 1),
      });
    } else if (!open) {
      reset(defaultValues);
    }
  }, [employee, open, reset]);

  const onSubmit = async (values: EmployeeFormValues) => {
    const payload: Partial<EmployeeRecord> = {
      employee_code: values.employee_code.trim(),
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      email: values.email.trim(),
      department_id: values.department_id ? Number(values.department_id) : null,
      designation_id: values.designation_id
        ? Number(values.designation_id)
        : null,
      location_id: values.location_id ? Number(values.location_id) : null,
      manager_id: values.manager_id ? Number(values.manager_id) : null,
      employment_status: Number(values.employment_status),
      status: Number(values.status),
    };

    if (!isEdit && isCreatingLogin) {
      payload.create_login = 1;
      payload.login_password = values.login_password?.trim() || "";
    }

    if (isEdit && employee?.id) {
      await updateMutation.mutateAsync({ ...payload, id: employee.id });
    } else {
      await createMutation.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const requestClose = () => {
    if (isDirty) {
      setConfirmDiscard(true);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}
        title={
          isEdit
            ? `Edit employee: ${employee?.first_name} ${employee?.last_name || ""}`
            : "Add new employee"
        }
        description={
          isEdit
            ? "Update personal information, departmental assignment, and status."
            : "Register a team member into organizational records and IT equipment custody."
        }
      >
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-6">
              <FormSection
                title="Personal Details"
                description="Name, employee identifier, and official corporate email."
              >
                <FormGrid>
                  <FormGridItem span={1}>
                    <RHFTextField
                      name="employee_code"
                      label="Employee ID / Code"
                      placeholder="e.g. EMP-00124"
                      required
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFTextField
                      name="email"
                      label="Work email"
                      placeholder="user@company.com"
                      required
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFTextField
                      name="first_name"
                      label="First name"
                      placeholder="e.g. Jane"
                      required
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFTextField
                      name="last_name"
                      label="Last name"
                      placeholder="e.g. Doe"
                      required
                    />
                  </FormGridItem>
                </FormGrid>
              </FormSection>

              <FormSection
                title="Organization & Role"
                description="Department, title, office site, and reporting structure."
              >
                <FormGrid>
                  <FormGridItem span={1}>
                    <RHFAsyncSelect
                      name="department_id"
                      label="Department"
                      endpoint="department/options"
                      clearable
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFAsyncSelect
                      name="designation_id"
                      label="Designation"
                      endpoint="designation/options"
                      clearable
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFAsyncSelect
                      name="location_id"
                      label="Office Location"
                      endpoint="location/options"
                      clearable
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFAsyncSelect
                      name="manager_id"
                      label="Reporting Manager"
                      endpoint="employee/options"
                      clearable
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFSelect
                      name="employment_status"
                      label="Employment Status"
                      options={[...ENUMS.employmentStatus]}
                      required
                    />
                  </FormGridItem>
                  <FormGridItem span={1}>
                    <RHFSelect
                      name="status"
                      label="Record Status"
                      options={[...ENUMS.recordStatus]}
                      required
                    />
                  </FormGridItem>
                </FormGrid>
              </FormSection>

              {!isEdit && (
                <FormSection
                  title="System Login Account"
                  description="Optional portal access credentials for this employee."
                >
                  <FormGrid>
                    <FormGridItem span={1}>
                      <RHFSelect
                        name="create_login"
                        label="Create login account"
                        options={[...ENUMS.createLogin]}
                      />
                    </FormGridItem>
                    {isCreatingLogin && (
                      <FormGridItem span={1}>
                        <RHFPasswordField
                          name="login_password"
                          label="Password (min 12 characters)"
                          placeholder="••••••••••••"
                          required
                        />
                      </FormGridItem>
                    )}
                  </FormGrid>
                </FormSection>
              )}
            </div>
            <FormActions
              submitting={
                isSubmitting ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              submitLabel={isEdit ? "Save changes" : "Create employee"}
              onCancel={requestClose}
            />
          </FormProvider>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard unsaved changes?"
        description="You have unsaved changes in this employee form. If you close now, those changes will be lost."
        confirmText="Discard changes"
        variant="destructive"
        onConfirm={() => {
          setConfirmDiscard(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}
