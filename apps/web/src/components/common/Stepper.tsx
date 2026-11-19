import type { ComponentType } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface StepItem {
  title: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface StepperProps {
  steps: StepItem[];
  activeStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export function Stepper({
  steps,
  activeStep,
  onStepClick,
  className,
}: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn("w-full py-2", className)}>
      <ol className="flex items-center justify-between gap-2 sm:gap-4">
        {steps.map((step, index) => {
          const isCompleted = index < activeStep;
          const isCurrent = index === activeStep;
          const isClickable = Boolean(onStepClick && isCompleted);
          const StepIcon = step.icon;

          return (
            <li
              key={step.title}
              className={cn(
                "relative flex-1 flex flex-col sm:flex-row items-center gap-2",
                index !== steps.length - 1 &&
                  "after:hidden sm:after:block after:content-[''] after:h-0.5 after:w-full after:top-4 after:left-[calc(50%+1rem)] after:absolute after:bg-border",
                index !== steps.length - 1 && isCompleted && "after:bg-primary",
              )}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick?.(index)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "relative z-10 flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full border-2 text-xs sm:text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isCompleted &&
                    "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
                  isCurrent &&
                    "border-primary bg-background text-primary ring-2 ring-primary/20",
                  !isCompleted &&
                    !isCurrent &&
                    "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
                  isClickable && "cursor-pointer",
                  !isClickable && "cursor-default",
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" aria-hidden="true" />
                ) : StepIcon ? (
                  <StepIcon className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </Button>
              <div className="text-center sm:text-left">
                <span
                  className={cn(
                    "block text-xs font-medium tracking-tight",
                    isCurrent && "text-foreground font-semibold",
                    isCompleted && "text-foreground",
                    !isCurrent && !isCompleted && "text-muted-foreground",
                  )}
                >
                  {step.title}
                </span>
                {step.description && (
                  <span className="hidden sm:block text-[11px] text-muted-foreground truncate max-w-[120px]">
                    {step.description}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
