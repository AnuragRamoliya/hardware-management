import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { PATHS } from "@/routes/paths";

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
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {breadcrumbs?.length ? (
          <nav
            aria-label="Breadcrumb"
            className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Link
              to={PATHS.ROOT}
              className="inline-flex items-center min-h-[36px] py-1 hover:text-foreground"
            >
              Workspace
            </Link>
            {breadcrumbs.map((item, index) => (
              <span
                className="flex items-center gap-1.5"
                key={`${item.label}-${index}`}
              >
                <ChevronRight className="h-3 w-3" />
                {item.to ? (
                  <Link
                    to={item.to}
                    className="inline-flex items-center min-h-[36px] py-1 hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current="page">{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="text-[24px] font-semibold tracking-[-0.04em] sm:text-[30px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="flex shrink-0 items-center gap-2">{action}</div>
      )}
    </header>
  );
}
