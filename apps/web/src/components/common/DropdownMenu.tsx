import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DropdownMenu({
  label,
  trigger,
  children,
  className,
}: {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("group relative", className)}>
      <summary
        aria-label={label}
        className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-md px-3 hover:bg-muted"
      >
        {trigger}
      </summary>
      <div
        role="menu"
        aria-label={label}
        className="absolute right-0 top-full z-30 mt-1 min-w-44 rounded-lg border bg-card p-1 shadow-xl [&>button]:flex [&>button]:min-h-10 [&>button]:w-full [&>button]:items-center [&>button]:rounded-md [&>button]:px-3 [&>button]:text-left [&>button]:text-sm [&>button]:hover:bg-muted"
      >
        {children}
      </div>
    </details>
  );
}
