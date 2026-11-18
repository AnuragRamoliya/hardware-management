import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CommonTable } from "@/components/common/CommonTable";
import type { ListQuery } from "@/types";

const query: ListQuery = {
  currentPage: 1,
  itemsPerPage: 10,
  filters: {},
  sortBy: [],
  general_search: "",
};

describe("CommonTable", () => {
  it("renders rows, supports selection, and sends pagination changes", () => {
    const onQueryChange = vi.fn();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <CommonTable
          columns={[{ id: "name", label: "Employee" }]}
          rows={[{ id: 1, name: "Jordan Lee" }]}
          count={21}
          query={query}
          onQueryChange={onQueryChange}
          onBulkAction={vi.fn()}
        />
      </QueryClientProvider>,
    );
    expect(screen.getAllByText("Jordan Lee").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByLabelText("Select row 1")[0]);
    expect(
      screen.getByRole("button", { name: "Bulk action (1)" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onQueryChange).toHaveBeenCalledWith({ currentPage: 2 });
  });

  it("shows a selected filter label in a removable chip", () => {
    const onQueryChange = vi.fn();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <CommonTable
          columns={[{ id: "name", label: "Employee" }]}
          rows={[]}
          count={0}
          query={{ ...query, filters: { status: "1" } }}
          onQueryChange={onQueryChange}
          filterFields={[
            {
              key: "status",
              label: "Status",
              type: "status",
              options: [
                { value: "1", label: "Active" },
                { value: "0", label: "Inactive" },
              ],
            },
          ]}
        />
      </QueryClientProvider>,
    );

    expect(
      screen.getByRole("button", { name: "Remove Status filter" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Status filter" }),
    );
    expect(onQueryChange).toHaveBeenCalledWith({
      currentPage: 1,
      filters: {},
    });
  });

  it("removes an emptied multi-select filter from the request object", () => {
    const onQueryChange = vi.fn();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <CommonTable
          columns={[{ id: "name", label: "Employee" }]}
          rows={[]}
          count={0}
          query={{ ...query, filters: { location_id: ["2"] } }}
          onQueryChange={onQueryChange}
          filterFields={[
            {
              key: "location_id",
              label: "Location",
              type: "multiselect",
              options: [{ value: "2", label: "Building" }],
            },
          ]}
        />
      </QueryClientProvider>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Location filter" }),
    );
    expect(onQueryChange).toHaveBeenCalledWith({
      currentPage: 1,
      filters: {},
    });
  });
});
