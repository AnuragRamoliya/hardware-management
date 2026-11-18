import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import { useLocation } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface RowAction {
  key?: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onSelect: () => void;
  hidden?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  destructive?: boolean;
  separatorBefore?: boolean;
}

export interface RowActionsMenuProps {
  label?: string;
  actions: RowAction[];
  align?: "start" | "end" | "center";
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(max-width: 767px)").matches
      : false,
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(max-width: 767px)");
    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

export function RowActionsMenu({
  label = "Row actions",
  actions,
  align = "end",
  side = "bottom",
  className,
}: RowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();

  const visibleActions = useMemo(
    () => actions.filter((action) => !action.hidden),
    [actions],
  );

  // Close when route changes
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  // Close on window scroll / resize or container scroll
  useEffect(() => {
    if (!open) return;
    const handleClose = () => setOpen(false);
    window.addEventListener("scroll", handleClose, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", handleClose, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleClose, { capture: true });
      window.removeEventListener("resize", handleClose);
    };
  }, [open]);

  // Hide the trigger entirely if there are no visible actions
  if (visibleActions.length === 0) {
    return null;
  }

  const allDisabled = visibleActions.every((action) => action.disabled);

  // Shared Trigger Button
  const triggerButton = (
    <button
      type="button"
      aria-label={label}
      disabled={allDisabled}
      className={cn(
        "relative inline-flex h-9 w-9 min-h-[36px] min-w-[36px] items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground active:bg-muted/80",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "data-[state=open]:bg-muted data-[state=open]:text-foreground",
        "disabled:pointer-events-none disabled:opacity-40",
        // Touch target expansion for mobile (44px)
        "before:absolute before:-inset-1 before:content-[''] sm:before:hidden",
        className,
      )}
    >
      <MoreHorizontal aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="sr-only">{label}</span>
    </button>
  );

  // Mobile Drawer / Bottom Sheet variant (< md)
  if (isMobile) {
    return (
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Trigger asChild>
          {triggerButton}
        </DialogPrimitive.Trigger>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[hsl(var(--overlay)/.45)] backdrop-blur-[2px] animate-in fade-in-0 duration-200" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-border bg-card p-4 pb-6 shadow-2xl focus:outline-none",
              "animate-in slide-in-from-bottom duration-200 motion-reduce:animate-none",
            )}
          >
            {/* Grab Handle */}
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/20" />
            <DialogPrimitive.Title className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </DialogPrimitive.Title>

            <div className="mt-3 flex flex-col gap-1">
              {visibleActions.map((action, index) => {
                const isDestructive = action.destructive;
                const prevAction = visibleActions[index - 1];
                const shouldSeparate =
                  action.separatorBefore ||
                  (isDestructive && index > 0 && !prevAction?.destructive);
                const Icon = action.icon;

                return (
                  <Fragment key={action.key || action.label}>
                    {shouldSeparate && (
                      <div className="-mx-2 my-1 h-px bg-border" />
                    )}
                    <button
                      type="button"
                      disabled={action.disabled}
                      title={action.disabledReason}
                      onClick={() => {
                        setOpen(false);
                        action.onSelect();
                      }}
                      className={cn(
                        "flex min-h-[48px] w-full items-center gap-3 rounded-lg px-4 text-left text-sm font-medium transition-colors",
                        action.disabled && "cursor-not-allowed opacity-50",
                        isDestructive
                          ? "text-danger hover:bg-danger/10 active:bg-danger/20"
                          : "text-foreground hover:bg-muted active:bg-muted/80",
                      )}
                    >
                      {Icon && <Icon className="h-5 w-5 shrink-0" />}
                      <span className="flex-1 truncate">{action.label}</span>
                      {action.disabled && action.disabledReason && (
                        <span className="text-xs text-muted-foreground">
                          {action.disabledReason}
                        </span>
                      )}
                    </button>
                  </Fragment>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 flex min-h-[48px] w-full items-center justify-center rounded-lg border border-border bg-muted/40 text-sm font-semibold text-foreground transition-colors hover:bg-muted active:bg-muted/70"
            >
              Cancel
            </button>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );
  }

  // Desktop / Tablet Radix DropdownMenu variant (>= md)
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      <DropdownMenuContent
        side={side}
        align={align}
        sideOffset={4}
        collisionPadding={8}
        avoidCollisions={true}
        className="z-50 min-w-[200px] max-w-[280px]"
      >
        {visibleActions.map((action, index) => {
          const isDestructive = action.destructive;
          const prevAction = visibleActions[index - 1];
          const shouldSeparate =
            action.separatorBefore ||
            (isDestructive && index > 0 && !prevAction?.destructive);
          const Icon = action.icon;

          return (
            <Fragment key={action.key || action.label}>
              {shouldSeparate && <DropdownMenuSeparator />}
              <DropdownMenuItem
                destructive={isDestructive}
                disabled={action.disabled}
                title={action.disabledReason}
                onSelect={() => {
                  action.onSelect();
                }}
                className={cn(
                  "gap-2.5",
                  action.disabled && "cursor-not-allowed opacity-50",
                )}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0" />}
                <span className="flex-1 truncate">{action.label}</span>
                {action.disabled && action.disabledReason && (
                  <span className="text-[11px] text-muted-foreground">
                    {action.disabledReason}
                  </span>
                )}
              </DropdownMenuItem>
            </Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
