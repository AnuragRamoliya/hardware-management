import * as React from "react";
import { cn } from "@/lib/utils";

export type RadioProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className, ...props }, ref) => (
    <input
      type="radio"
      ref={ref}
      data-hm="radio"
      className={cn(
        "h-4 w-4 border-input text-primary focus:ring-primary focus:ring-offset-background",
        className,
      )}
      {...props}
    />
  ),
);
Radio.displayName = "Radio";
