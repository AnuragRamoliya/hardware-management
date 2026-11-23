import type { HTMLAttributes, ReactNode } from "react";
import { Button } from "@/components/ui/button";

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
    <section className={`space-y-4 ${className}`} aria-labelledby={`section-${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}>
      <header className="space-y-1 border-b pb-3">
        <h2 id={`section-${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`} className="text-sm font-semibold">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </header>
      {children}
    </section>
  );
}

export function FormGrid({
  children,
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 ${className}`} {...props}>{children}</div>;
}

export function FormGridItem({
  span = 1,
  children,
  className = "",
}: {
  span?: 1 | 2 | 3;
  children: ReactNode;
  className?: string;
}) {
  const width = span === 3 ? "md:col-span-2 xl:col-span-3" : span === 2 ? "md:col-span-2 xl:col-span-2" : "";
  return <div className={`${width} ${className}`}>{children}</div>;
}

export function FormActions({
  submitting = false,
  submitLabel = "Save changes",
  cancelLabel = "Cancel",
  onCancel,
  disabled = false,
}: {
  submitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel: () => void;
  disabled?: boolean;
}) {
  return (
    <footer className="sticky bottom-0 z-10 -mx-6 mt-6 flex justify-end gap-2 border-t bg-card/95 px-6 py-4 backdrop-blur">
      <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>{cancelLabel}</Button>
      <Button type="submit" loading={submitting} disabled={disabled}>{submitLabel}</Button>
    </footer>
  );
}
