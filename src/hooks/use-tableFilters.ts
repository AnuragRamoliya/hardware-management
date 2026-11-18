import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { FilterValues } from "@/components/common/TableFilters/types";

function cleanFilters(filters: FilterValues): FilterValues {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => {
      if (value === null || value === undefined || value === "") return false;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "object") {
        const hasValue = (part: unknown) =>
          part !== undefined && part !== null && part !== "";
        return hasValue(value.from) || hasValue(value.to);
      }
      return true;
    }),
  );
}

function parseFilters(search: string): FilterValues {
  const serialized = new URLSearchParams(search).get("filters");
  if (!serialized) return {};
  try {
    const parsed: unknown = JSON.parse(serialized);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? cleanFilters(parsed as FilterValues)
      : {};
  } catch {
    return {};
  }
}

export function useTableFilters() {
  const location = useLocation();
  const navigate = useNavigate();
  const filters = useMemo(() => parseFilters(location.search), [location.search]);
  const writeFilters = useCallback(
    (nextFilters: FilterValues) => {
      const params = new URLSearchParams(location.search);
      const cleaned = cleanFilters(nextFilters);
      if (Object.keys(cleaned).length) {
        params.set("filters", JSON.stringify(cleaned));
      } else {
        params.delete("filters");
      }
      const serialized = params.toString();
      if (serialized !== location.search.replace(/^\?/, "")) {
        navigate(
          {
            pathname: location.pathname,
            search: serialized ? `?${serialized}` : "",
            hash: location.hash,
          },
          { state: location.state },
        );
      }
    },
    [location, navigate],
  );
  return { filters, writeFilters };
}
