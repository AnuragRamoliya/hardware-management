import React from "react";
import { cn } from "../../../lib/utils";

export interface SelectTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: React.ReactNode;
  hasValue: boolean;
  onToggle: () => void;
  placeholder?: string;
  sizeVariant?: "sm" | "md" | "lg";
  "data-hm"?: string;
}

const sizeClasses = {
  sm: "h-9 text-xs px-2.5",
  md: "h-10 text-base sm:text-sm px-3",
  lg: "h-12 text-base px-4",
};

export function SelectTrigger({
  className,
  children,
  hasValue,
  onToggle,
  placeholder = "Choose",
  sizeVariant = "md",
  "data-hm": dataHm,
  ...props
}: SelectTriggerProps) {
  return (
    <div
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={false}
      data-hm={dataHm || "select"}
      onClick={onToggle}
      className={cn(
        "w-full rounded-md border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        sizeClasses[sizeVariant],
        className,
      )}
      {...props}
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
