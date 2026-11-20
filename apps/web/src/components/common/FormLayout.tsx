import type { HTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FormSection({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`space-y-4 ${className}`}
      aria-labelledby={`section-${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}
    >
      <header className="space-y-1 border-b pb-3">
        <h2
          id={`section-${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}
          className="text-sm font-semibold"
        >
          {title}
        </h2>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </header>
      {children}
    </section>
  );
}

export function FormGrid({
  cols = 2,
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement> & { cols?: 1 | 2 | 3 }) {
  const gridCols =
    cols === 1
      ? "grid-cols-1"
      : cols === 3
        ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2";

  return (
    <div className={cn("grid gap-4", gridCols, className)} {...props}>
      {children}
    </div>
  );
}

export function FormGridItem({
  span = 1,
  children,
  className = "",
}: {
  span?: 1 | 2 | 3 | "full";
  children: ReactNode;
  className?: string;
}) {
  const width =
    span === "full" || span === 3
      ? "col-span-full"
      : span === 2
        ? "col-span-full sm:col-span-2"
        : "col-span-1";
  return <div className={cn(width, className)}>{children}</div>;
}

export function FormActions({
  submitting = false,
  isSubmitting,
  submitLabel = "Save changes",
  cancelLabel = "Cancel",
  onCancel,
  disabled = false,
}: {
  submitting?: boolean;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  disabled?: boolean;
}) {
  const isPending = isSubmitting ?? submitting;
  return (
    <footer className="sticky bottom-0 z-10 -mx-6 mt-6 flex justify-end gap-2 border-t bg-card/95 px-6 py-4 backdrop-blur">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isPending}
      >
        {cancelLabel}
      </Button>
      <Button type="submit" loading={isPending} disabled={disabled}>
        {submitLabel}
      </Button>
    </footer>
  );
}
