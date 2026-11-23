import React from "react";
import { cn } from "@/lib/utils";

interface SelectTriggerProps {
  className?: string;
  children?: React.ReactNode;
  hasValue: boolean;
  onToggle: () => void;
  placeholder?: string;
}

export function SelectTrigger({
  className,
  children,
  hasValue,
  onToggle,
  placeholder = "Choose",
}: SelectTriggerProps) {
  return (
    <div
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={false}
      onClick={onToggle}
      className={cn(
        "h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        className,
      )}
    >
      {children}
      {hasValue ? null : (
        <span className="text-muted-foreground cursor-default placeholder-select">
          {placeholder}
        </span>
      )}
    </div>
  );
}
