import { useState } from "react";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionDialogLayout } from "@/components/common/ActionDialogLayout";
import {
  useImportEmployees,
  type EmployeeImportResult,
} from "@/hooks/queries/employee";

interface EmployeeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeImportDialog({
  open,
  onOpenChange,
}: EmployeeImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<EmployeeImportResult | null>(null);

  const importMutation = useImportEmployees();

  const handleClose = () => {
    setFile(null);
    setReport(null);
    onOpenChange(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      const res = await importMutation.mutateAsync(file);
      setReport(res);
    } catch {
      // toast is already handled by useImportEmployees mutation onError
    }
  };

  return (
    <ActionDialogLayout
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(next);
      }}
      title="Import Employees"
      description="Upload a CSV or XLSX spreadsheet containing employee records."
    >
      <div className="space-y-4">
        {!report ? (
          <div>
            <label
              htmlFor="employee-import-file"
              className="mb-2 block text-sm font-medium"
            >
              Select CSV or Excel file
            </label>
            <Input
              id="employee-import-file"
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Required columns: employee_code, first_name, last_name, email.
              Optional: department, designation, location.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-success/10 p-4 text-sm text-success">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              <span>
                Successfully imported <strong>{report.imported}</strong>{" "}
                employee records.
              </span>
            </div>

            {report.errors && report.errors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-danger">
                  <AlertCircle className="h-4 w-4" />
                  <span>Validation errors ({report.errors.length}):</span>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-md border p-2 text-xs text-muted-foreground">
                  <ul className="space-y-1">
                    {report.errors.map(
                      (err: { row: number; message: string }, i: number) => (
                        <li key={i} className="text-danger">
                          Row {err.row}: {err.message}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            {report ? "Close" : "Cancel"}
          </Button>
          {!report && (
            <Button
              disabled={!file || importMutation.isPending}
              loading={importMutation.isPending}
              onClick={handleUpload}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              Upload & Import
            </Button>
          )}
        </div>
      </div>
    </ActionDialogLayout>
  );
}
