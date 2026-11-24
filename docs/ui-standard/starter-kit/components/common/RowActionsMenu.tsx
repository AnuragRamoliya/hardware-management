import React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "../ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/DropdownMenu";

export interface RowAction {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

export function RowActionsMenu({ actions }: { actions: RowAction[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((act, idx) => (
          <DropdownMenuItem
            key={idx}
            onClick={act.onSelect}
            className={
              act.destructive ? "text-destructive focus:text-destructive" : ""
            }
          >
            {act.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
