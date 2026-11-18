import type { ReactNode } from "react";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stepper({
  steps,
  activeStep,
}: {
  steps: string[];
  activeStep: number;
}) {
  return (
    <ol aria-label="Progress" className="flex items-start">
      {steps.map((step, index) => (
        <li
          key={step}
          aria-current={index === activeStep ? "step" : undefined}
          className="relative flex flex-1 flex-col items-center text-center"
        >
          {index < steps.length - 1 && (
            <span
              className={cn(
                "absolute left-1/2 top-4 h-px w-full",
                index < activeStep ? "bg-primary" : "bg-border",
              )}
            />
          )}
          <span
            className={cn(
              "relative z-10 grid h-8 w-8 place-items-center rounded-full border text-xs font-medium",
              index < activeStep
                ? "border-primary bg-primary text-primary-foreground"
                : index === activeStep
                  ? "border-primary bg-card text-primary"
                  : "bg-card text-muted-foreground",
            )}
          >
            {index < activeStep ? <Check className="h-4 w-4" /> : index + 1}
          </span>
          <span
            className={cn(
              "mt-2 px-1 text-[11px]",
              index === activeStep
                ? "font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            {step}
          </span>
        </li>
      ))}
    </ol>
  );
}

export interface TimelineItem {
  id: string | number;
  title: string;
  description?: string;
  time: string;
  icon?: ReactNode;
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="space-y-0">
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-3 pb-6 last:pb-0">
          <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-primary">
            {item.icon ?? <Circle className="h-3 w-3 fill-current" />}
            {index < items.length - 1 && (
              <span className="absolute left-1/2 top-8 h-full w-px -translate-x-1/2 bg-border" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-col justify-between gap-1 sm:flex-row">
              <p className="text-sm font-medium">{item.title}</p>
              <time className="shrink-0 text-xs text-muted-foreground">
                {item.time}
              </time>
            </div>
            {item.description && (
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {item.description}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function KeyValueList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <dl className="divide-y">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:justify-between sm:gap-6"
        >
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="min-w-0 text-sm font-medium sm:text-right">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
