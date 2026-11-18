import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: readonly string[] | string[];
}

export function TabsList({
  activeTab,
  onTabChange,
  tabs,
  className,
  ...props
}: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn("mb-5 flex gap-1 overflow-x-auto border-b", className)}
      {...props}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={cn(
              "min-h-11 shrink-0 border-b-2 px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground",
            )}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}
