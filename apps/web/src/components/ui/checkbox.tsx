import * as React from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  "data-hm"?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, "data-hm": dataHm, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      data-hm={dataHm || "checkbox"}
      className={cn(
        "h-4 w-4 rounded border-input text-primary focus:ring-primary focus:ring-offset-background",
        className,
      )}
      {...props}
    />
  ),
);
Checkbox.displayName = "Checkbox";
