import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { Dashboard } from "./Dashboard";
import * as apiModule from "@/api/callApi";

describe("Dashboard Page", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.spyOn(apiModule, "callApi").mockImplementation(async (options) => {
      if (options.url === "dashboard/summary") {
        return {
          ok: true,
          data: {
            role: "hardware_manager",
            totalAssets: 48,
            available: 12,
            assigned: 32,
            inRepair: 4,
            expiringWarranties: 5,
            softwareCount: 14,
            expiringLicenses: 2,
            seatsTotal: 100,
            seatsUsed: 75,
            seatsAvailable: 25,
            openRequests: 3,
            openOffboardings: 1,
            quickReports: [
              "hardware-per-employee",
              "assets-by-category-department",
              "assigned-vs-unassigned",
              "warranty-expiry",
              "software-license-utilization",
            ],
          },
          status: 200,
        } as unknown as Awaited<ReturnType<typeof apiModule.callApi>>;
      }
      return { ok: true, data: [], status: 200 } as unknown as Awaited<
        ReturnType<typeof apiModule.callApi>
      >;
    });
  });

  it("renders stat cards, distribution charts and operational report links", async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText("Available assets")).toBeInTheDocument();
    expect((await screen.findAllByText("12")).length).toBeGreaterThanOrEqual(1);

    // Chart titles
    expect(screen.getByText("Hardware Inventory Status")).toBeInTheDocument();
    expect(screen.getByText("Software Seat Allocation")).toBeInTheDocument();

    // Quick report links
    expect(screen.getByText("Hardware Per Employee")).toBeInTheDocument();
    expect(screen.getByText("Warranty Expiry Tracker")).toBeInTheDocument();
    expect(screen.getByText("Turnaround & SLA")).toBeInTheDocument();
    expect(screen.getByText("Offboarding & Recovery")).toBeInTheDocument();
  });
});
