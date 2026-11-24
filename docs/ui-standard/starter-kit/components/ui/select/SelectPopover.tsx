import { Search } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Input } from "../Input";

interface SelectPopoverProps {
  className?: string;
  side?: "top" | "bottom";
}

export function SelectPopover({
  className,
  side = "bottom",
}: SelectPopoverProps) {
  return (
    <div
      className={cn(
        "z-50 rounded-md border border-input bg-card p-4 shadow-sm",
        side === "top" && "bottom-full",
        side === "bottom" && "top-full",
        className,
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <Search className="h-4 w-4 opacity-50" aria-hidden="true" />
        <Input
          placeholder="Type to search..."
          className="flex-1 pr-2"
          style={{ fontSize: "14px" }}
        />
      </div>
      <div className="max-h-64 overflow-y-auto" />
    </div>
  );
}
