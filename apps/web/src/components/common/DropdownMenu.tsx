import type { ReactNode } from "react";
import {
  DropdownMenu as DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function DropdownMenu({
  label,
  trigger,
  children,
  className,
  align = "end",
  side = "bottom",
}: {
  label: string;
  trigger: ReactNode;
  children: ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <DropdownMenuRoot>
      <DropdownMenuTrigger asChild aria-label={label}>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        side={side}
        sideOffset={4}
        collisionPadding={8}
        avoidCollisions={true}
        className={cn("min-w-[180px]", className)}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenuRoot>
  );
}
