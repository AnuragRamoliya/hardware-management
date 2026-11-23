import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  sizeVariant?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-9 text-xs px-2.5",
  md: "h-10 text-base sm:text-sm px-3",
  lg: "h-12 text-base px-4",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, sizeVariant = "md", ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-md border border-input bg-card placeholder:text-muted-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60",
        "aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger",
        sizeClasses[sizeVariant],
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
