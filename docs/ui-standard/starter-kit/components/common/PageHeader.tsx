import React, { type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export function PageHeader({
  title,
  description,
  action,
  breadcrumbs,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
}) {
  return (
    <div className="flex flex-col gap-1 pb-4 border-b border-border mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1"
        >
          {breadcrumbs.map((b, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="h-3 w-3" />}
              {b.to ? (
                <a
                  href={b.to}
                  className="hover:text-foreground transition-colors"
                >
                  {b.label}
                </a>
              ) : (
                <span className="text-foreground font-medium">{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {description}
            </p>
          )}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
    </div>
  );
}
