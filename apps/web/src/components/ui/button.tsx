import { forwardRef, type ButtonHTMLAttributes } from "react";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant =
  "primary" | "secondary" | "outline" | "ghost" | "destructive" | "link";
type Size = "default" | "sm" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:brightness-95",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/75",
  outline: "border border-input bg-card hover:bg-muted",
  ghost: "hover:bg-muted",
  destructive: "bg-danger text-danger-foreground hover:brightness-95",
  link: "text-primary underline-offset-4 hover:underline",
};
const sizes: Record<Size, string> = {
  default: "h-10 px-4",
  sm: "h-9 px-3 text-[13px]",
  icon: "h-10 w-10 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "default",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex min-w-0 items-center justify-center gap-2 rounded-md font-medium transition duration-180 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
