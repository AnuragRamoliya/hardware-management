import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { CommonTable, type TableColumn } from "@/components/common/CommonTable";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/common/Drawer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  RHFSelect,
  RHFPasswordField,
  RHFTextArea,
  RHFTextField,
  RHFNumberField,
  RHFAsyncSelect,
} from "@/components/hook-form/fields";
import FormProvider from "@/components/hook-form/form-provider";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useTableState } from "@/hooks/use-tableState";
import {
  listResource,
  saveResource,
  deleteResource,
  getResource,
} from "@/api/services";
import { PATHS } from "@/routes/paths";
import useAuthStore from "@/zustand/user-store";
import { useNavigate } from "react-router-dom";
import usePermissionStore from "@/zustand/permission-store";
import { getUserRole } from "@/lib/roles";
import { importEmployeesApi, type EmployeeImportResult } from "@/api/employees";
import type { FilterField } from "@/components/common/TableFilters/types";
import { ReferenceLabel } from "@/components/common/ReferenceLabel";

export interface ResourceConfig {
  key: string;
  title: string;
  singular: string;
  description: string;
  endpoint: string;
  module: string;
  fields: Array<{
    name: string;
    label: string;
    type?:
      "email" | "number" | "select" | "async-select" | "textarea" | "password";
    options?: Array<{ value: string; label: string }>;
    optionsResource?: string;
    dependsOn?: string;
    clearable?: boolean;
    required?: boolean;
    requiredOnAdd?: boolean;
    onlyOnAdd?: boolean;
    minLength?: number;
  }>;
  columns: Array<{
    id: string;
    label: string;
    type?: "status";
    displayField?: string;
    displayResource?: string;
  }>;
  filters?: FilterField[];
  employee?: boolean;
}

type Row = { id: string | number; name?: string; [key: string]: unknown };

export function ResourcePage({ config }: { config: ResourceConfig }) {
  const { tableState, setTableState } = useTableState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importReport, setImportReport] = useState<EmployeeImportResult | null>(
    null,
  );
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const role = useAuthStore((state) => getUserRole(state.user));
  const permissions = usePermissionStore(
    (state) => state.modulePermissions[config.module],
  );
  const queryKey = [config.key, tableState];
  const listQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const result = await listResource<Row>(
        `${config.endpoint}/list`,
        tableState,
      );
      if (!result.ok)
        throw new Error(result.message || "Unable to load records");
      return result.data ?? { rows: [], count: 0 };
    },
  });
  const rowQuery = useQuery({
    queryKey: [config.key, "detail", editing?.id],
    queryFn: async () => {
      if (!editing) return null;
      const response = await getResource<Row>(
        `${config.endpoint}/get/${editing.id}`,
      );
      if (!response.ok) throw new Error(response.message);
      return response.data;
    },
    enabled: Boolean(editing),
  });
  const canWrite = role === "admin" || permissions?.write_access === true;
  const canDelete = role === "admin" || permissions?.delete_access === true;
  const schema = useMemo(
    () =>
      yup.object(
        Object.fromEntries(
          config.fields
            .filter((field) => !editing || !field.onlyOnAdd)
            .map((field) => {
              const isRequired =
                field.required || (!editing && field.requiredOnAdd);
              let validator = yup
                .string()
                .trim()
                .test(
                  "required",
                  `${field.label} is required`,
                  (value) => !isRequired || Boolean(value),
                );
              const minLength = field.minLength;
              if (minLength) {
                validator = validator.test(
                  "min-length",
                  `${field.label} must be at least ${minLength} characters`,
                  (value) => !value || value.length >= minLength,
                );
              }
              return [field.name, validator];
            }),
        ),
      ),
    [config.fields, editing],
  );
  const methods = useForm<Record<string, string | undefined>>({
    mode: "onTouched",
    resolver: yupResolver(schema),
    defaultValues: config.fields.reduce<Record<string, string>>(
      (values, field) => ({
        ...values,
        [field.name]:
          field.type === "select" ? (field.options?.[0]?.value ?? "") : "",
      }),
      {},
    ),
  });
  useEffect(() => {
    if (rowQuery.data)
      methods.reset(
        Object.fromEntries(
          config.fields.map((field) => [
            field.name,
            String(rowQuery.data?.[field.name] ?? ""),
          ]),
        ),
      );
  }, [config.fields, methods, rowQuery.data]);
  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, string | undefined>) => {
      const url = editing
        ? `${config.endpoint}/update`
        : `${config.endpoint}/add`;
      const response = await saveResource(
        url,
        editing ? { ...payload, id: editing.id } : payload,
        editing ? "PUT" : "POST",
      );
      if (!response.ok) throw new Error(response.message);
      return response;
    },
    onSuccess: async (result) => {
      toast.success(result.message || `${config.singular} saved`);
      setDialogOpen(false);
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: [config.key] });
    },
    onError: (error) => toast.error(error.message),
  });
  const deleteMutation = useMutation({
    mutationFn: async (row: Row) => {
      const result = await deleteResource(
        `${config.endpoint}/delete/${row.id}`,
      );
      if (!result.ok) throw new Error(result.message);
      return result;
    },
    onSuccess: async (result) => {
      toast.success(result.message || `${config.singular} deleted`);
      setDeleting(null);
      await queryClient.invalidateQueries({ queryKey: [config.key] });
    },
    onError: (error) => toast.error(error.message),
  });
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!importFile) throw new Error("Choose a CSV or XLSX file first.");
      const result = await importEmployeesApi(importFile);
      if (!result.ok || !result.data) throw new Error(result.message);
      return result.data;
    },
    onSuccess: async (report) => {
      setImportReport(report);
      toast.success(`${report.imported} employee records imported`);
      await queryClient.invalidateQueries({ queryKey: [config.key] });
    },
    onError: (error) => toast.error(error.message),
  });
  const columns = useMemo<TableColumn<Row>[]>(
    () => [
      ...config.columns.map((column) => ({
        id: column.id,
        label: column.label,
        render:
          column.type === "status"
            ? (row: Row) => (
                <StatusBadge status={String(row[column.id] ?? "")} />
              )
            : column.displayField
              ? (row: Row) => {
                  const relation = row[column.displayField!] as
                    { name?: string; label?: string } | null | undefined;
                  return (
                    <ReferenceLabel
                      id={row[column.id] as string | number | null | undefined}
                      endpoint={`${column.displayResource}/options`}
                      relation={relation}
                    />
                  );
                }
              : undefined,
      })),
      {
        id: "actions",
        label: "Actions",
        sortable: false,
        render: (row) => (
          <div className="flex justify-end gap-1">
            {canWrite && (
              <button
                aria-label={`Edit ${String(row.name ?? config.singular)}`}
                className="rounded px-2 py-1 text-xs text-primary hover:bg-accent"
                onClick={(event) => {
                  event.stopPropagation();
                  setEditing(row);
                  methods.reset(
                    Object.fromEntries(
                      config.fields.map((field) => [
                        field.name,
                        String(row[field.name] ?? ""),
                      ]),
                    ),
                  );
                  setDialogOpen(true);
                }}
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                aria-label={`Delete ${String(row.name ?? config.singular)}`}
                className="rounded px-2 py-1 text-xs text-danger hover:bg-danger/10"
                onClick={(event) => {
                  event.stopPropagation();
                  setDeleting(row);
                }}
              >
                Delete
              </button>
            )}
          </div>
        ),
      },
    ],
    [canDelete, canWrite, config, methods],
  );
  const formSubmit = methods.handleSubmit((data) => saveMutation.mutate(data));
  const requestClose = () => {
    if (methods.formState.isDirty) setConfirmDiscard(true);
    else setDialogOpen(false);
  };

  return (
    <>
      <PageHeader
        title={`${config.title}`}
        description={config.description}
        breadcrumbs={[{ label: config.title }]}
        action={
          <>
            {config.employee && (
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4" />
                Import
              </Button>
            )}
            {canWrite && (
              <Button
                onClick={() => {
                  setEditing(null);
                  methods.reset();
                  setDialogOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add {config.singular}
              </Button>
            )}
          </>
        }
      />
      <CommonTable<Row>
        columns={columns}
        filterFields={config.filters}
        rows={listQuery.data?.rows ?? []}
        count={listQuery.data?.count ?? 0}
        query={tableState}
        onQueryChange={setTableState}
        loading={listQuery.isLoading}
        error={listQuery.error?.message}
        onRetry={() => void listQuery.refetch()}
        emptyTitle={`No ${config.title.toLowerCase()} yet`}
        onRowClick={
          config.employee
            ? (row) =>
                navigate(PATHS.EMPLOYEE_DETAIL.replace(":id", String(row.id)))
            : undefined
        }
      />
      <Drawer
        open={dialogOpen}
        onOpenChange={(open) => {
          if (open) setDialogOpen(true);
          else requestClose();
        }}
        title={editing ? `Edit ${config.singular}` : `Add ${config.singular}`}
        description="Fields marked with * are required."
      >
        <div>
          {rowQuery.isLoading && editing ? (
            <div className="mb-4 animate-pulse rounded bg-muted p-5 text-sm">
              Loading record…
            </div>
          ) : null}
          <FormProvider
            methods={methods}
            onSubmit={formSubmit}
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {config.fields
                .filter((field) => !editing || !field.onlyOnAdd)
                .map((field) =>
                  field.type === "textarea" ? (
                    <div className="sm:col-span-2" key={field.name}>
                      <RHFTextArea
                        name={field.name}
                        label={field.label}
                        required={field.required}
                      />
                    </div>
                  ) : field.type === "select" ? (
                    <RHFSelect
                      key={field.name}
                      name={field.name}
                      label={field.label}
                      options={field.options ?? []}
                      required={field.required}
                    />
                  ) : field.type === "async-select" ? (
                    <RHFAsyncSelect
                      key={field.name}
                      name={field.name}
                      label={field.label}
                      endpoint={`${field.optionsResource}/options`}
                      required={field.required}
                      clearable={field.clearable}
                      filters={
                        field.dependsOn
                          ? {
                              [field.dependsOn]: methods.watch(field.dependsOn),
                            }
                          : undefined
                      }
                    />
                  ) : field.type === "number" ? (
                    <RHFNumberField
                      key={field.name}
                      name={field.name}
                      label={field.label}
                      required={field.required}
                    />
                  ) : field.type === "password" ? (
                    <RHFPasswordField
                      key={field.name}
                      name={field.name}
                      label={field.label}
                      required={
                        field.required || (!editing && field.requiredOnAdd)
                      }
                    />
                  ) : (
                    <RHFTextField
                      key={field.name}
                      name={field.name}
                      label={field.label}
                      type={field.type ?? "text"}
                      required={field.required}
                    />
                  ),
                )}
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" onClick={requestClose}>
                Cancel
              </Button>
              <Button type="submit" loading={saveMutation.isPending}>
                {editing
                  ? "Save changes"
                  : `Create ${config.singular.toLowerCase()}`}
              </Button>
            </div>
          </FormProvider>
        </div>
      </Drawer>
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
        title={`Delete ${config.singular.toLowerCase()}?`}
        description={`This will mark this ${config.singular.toLowerCase()} record as deleted.`}
        confirmText="Delete"
        variant="destructive"
      />
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        onConfirm={() => {
          setConfirmDiscard(false);
          setDialogOpen(false);
          methods.reset();
        }}
        title="Discard unsaved changes?"
        description="Your changes will be lost if you close this form."
        confirmText="Discard changes"
        variant="destructive"
      />
      {config.employee && (
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogContent>
            <DialogTitle className="text-lg font-semibold">
              Import employees
            </DialogTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload a CSV or XLSX file with employee_code, first_name,
              last_name, and email columns.
            </p>
            <input
              aria-label="Select employee CSV or XLSX"
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="mt-5 block w-full text-sm"
              onChange={(event) => {
                setImportFile(event.target.files?.[0] ?? null);
                setImportReport(null);
              }}
            />
            {importReport && (
              <div className="mt-4 text-sm">
                <p>Imported: {importReport.imported}</p>
                {importReport.errors.length > 0 && (
                  <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-danger">
                    {importReport.errors.map((error) => (
                      <li key={`${error.row}-${error.message}`}>
                        Row {error.row}: {error.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setImportOpen(false)}>
                Close
              </Button>
              <Button
                disabled={!importFile}
                loading={importMutation.isPending}
                onClick={() => importMutation.mutate()}
              >
                Import file
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
