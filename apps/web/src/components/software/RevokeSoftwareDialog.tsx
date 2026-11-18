import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useRevokeSoftware } from "@/hooks/queries/software";
import { toast } from "sonner";
import type { SoftwareAssignment } from "@/api/software";

interface RevokeSoftwareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment?: SoftwareAssignment | null;
}

export function RevokeSoftwareDialog({
  open,
  onOpenChange,
  assignment,
}: RevokeSoftwareDialogProps) {
  const revokeMutation = useRevokeSoftware();

  const handleConfirm = async () => {
    if (!assignment) return;
    try {
      await revokeMutation.mutateAsync(Number(assignment.id));
      toast.success("Software license access revoked");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to revoke software access",
      );
    }
  };

  const employeeName = assignment?.employee
    ? `${assignment.employee.first_name} ${assignment.employee.last_name}`
    : "this employee";

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Revoke Software Access?"
      description={`Are you sure you want to revoke software access for ${employeeName}? This will immediately free up an allocated seat.`}
      confirmText="Revoke access"
      variant="destructive"
      onConfirm={handleConfirm}
    />
  );
}
