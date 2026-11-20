import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ReportPage } from "@/pages/ReportPage";
import * as apiModule from "@/api/callApi";

describe("ReportPage Component", () => {
  let queryClient: QueryClient;

  const mockMeta = {
    key: "hardware-per-employee",
    title: "Hardware Per Employee",
    description: "Asset deployment across employees",
    category: "hardware",
    columns: [
      {
        key: "employee_name",
        label: "Employee Name",
        type: "string",
        sortable: true,
      },
      { key: "asset_tag", label: "Asset Tag", type: "string", sortable: true },
      { key: "category", label: "Category", type: "string", sortable: true },
      { key: "warranty_status", label: "Status", type: "enum", sortable: true },
    ],
    filters: [
      { key: "department_id", label: "Department", type: "select" },
      { key: "search", label: "Search", type: "string" },
    ],
  };

  const mockRunResult = {
    key: "hardware-per-employee",
    count: 1,
    currentPage: 1,
    itemsPerPage: 20,
    totalPages: 1,
    summary: [
      { key: "total_assigned", label: "Total Assigned Assets", value: 1 },
    ],
    rows: [
      {
        id: 1,
        employee_name: "Alice Cooper",
        asset_tag: "TAG-FIX-001",
        category: "Fixture Laptops",
        warranty_status: "active",
      },
    ],
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.spyOn(apiModule, "callApi").mockImplementation(async (options) => {
      if (options.url.includes("reports/meta/")) {
        return { ok: true, data: mockMeta, status: 200 } as unknown as Awaited<
          ReturnType<typeof apiModule.callApi>
        >;
      }
      if (options.url.includes("reports/run/")) {
        return {
          ok: true,
          data: mockRunResult,
          status: 200,
        } as unknown as Awaited<ReturnType<typeof apiModule.callApi>>;
      }
      return { ok: true, data: {}, status: 200 } as unknown as Awaited<
        ReturnType<typeof apiModule.callApi>
      >;
    });
  });

  it("renders report title, summary KPI cards and table columns from metadata", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/reports/hardware-per-employee"]}>
          <Routes>
            <Route path="/reports/:key" element={<ReportPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      (await screen.findAllByText("Hardware Per Employee")).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText("Asset deployment across employees"),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Total Assigned Assets"),
    ).toBeInTheDocument();
    expect(
      (await screen.findAllByText("Alice Cooper")).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      (await screen.findAllByText("TAG-FIX-001")).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("opens export modal dialog when export button is clicked", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/reports/hardware-per-employee"]}>
          <Routes>
            <Route path="/reports/:key" element={<ReportPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const exportBtn = await screen.findByRole("button", {
      name: /export report/i,
    });
    fireEvent.click(exportBtn);

    expect(
      await screen.findByText("Export Report Dataset"),
    ).toBeInTheDocument();
    expect(screen.getByText(/File Format/i)).toBeInTheDocument();
    expect(screen.getByText(/background export task/i)).toBeInTheDocument();
  });
});
