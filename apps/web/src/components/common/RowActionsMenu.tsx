import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu } from "@/components/common/DropdownMenu";

export type RowAction = {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

export function RowActionsMenu({
  label = "Row actions",
  actions,
}: {
  label?: string;
  actions: RowAction[];
}) {
  return (
      <DropdownMenu label={label} trigger={<MoreHorizontal aria-hidden="true" className="h-4 w-4" />}>
        {actions.map((action) => <Button
          key={action.label}
          role="menuitem"
          type="button"
          variant="ghost"
          className={action.destructive ? "text-danger" : ""}
          disabled={action.disabled}
          onClick={(event) => {
            event.currentTarget.closest("details")?.removeAttribute("open");
            action.onSelect();
          }}
        >{action.label}</Button>)}
      </DropdownMenu>
  );
}
