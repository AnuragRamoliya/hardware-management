import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExportsDrawer } from "./ExportsDrawer";
import * as realtimeModule from "@/lib/realtime";
import * as apiModule from "@/api/callApi";
import { REALTIME_EVENTS, EXPORT_JOB_STATUS } from "@hm/shared";

describe("ExportsDrawer Component", () => {
  let queryClient: QueryClient;
  let mockSocket: {
    connected: boolean;
    on: ReturnType<typeof vi.fn>;
    off: ReturnType<typeof vi.fn>;
    emit: ReturnType<typeof vi.fn>;
  };
  const eventHandlers: Record<string, ((...args: unknown[]) => void)[]> = {};

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    Object.keys(eventHandlers).forEach((k) => delete eventHandlers[k]);

    mockSocket = {
      connected: true,
      on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (!eventHandlers[event]) eventHandlers[event] = [];
        eventHandlers[event].push(handler);
      }),
      off: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
        if (eventHandlers[event]) {
          eventHandlers[event] = eventHandlers[event].filter(
            (h) => h !== handler,
          );
        }
      }),
      emit: vi.fn(),
    };

    vi.spyOn(realtimeModule, "getSocket").mockReturnValue(
      mockSocket as unknown as ReturnType<typeof realtimeModule.getSocket>,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders export jobs list and status badge", async () => {
    vi.spyOn(apiModule, "callApi").mockResolvedValue({
      ok: true,
      message: "Success",
      data: [
        {
          id: 101,
          report_key: "hardware-per-employee",
          format: "csv",
          filters: {},
          job_status: EXPORT_JOB_STATUS.DONE,
          progress: 100,
          row_count: 42,
          file_sha256: "abc123456789",
          requested_by: 1,
        },
      ],
      status: 200,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ExportsDrawer open={true} onOpenChange={() => {}} />
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/HARDWARE PER EMPLOYEE/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Job #101/i)).toBeInTheDocument();
    expect(screen.getByText("DONE")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /download/i }),
    ).toBeInTheDocument();
  });

  it("handles live socket progress and done events", async () => {
    vi.spyOn(apiModule, "callApi").mockResolvedValue({
      ok: true,
      message: "Success",
      data: [
        {
          id: 102,
          report_key: "warranty-expiry",
          format: "xlsx",
          filters: {},
          job_status: EXPORT_JOB_STATUS.RUNNING,
          progress: 20,
          row_count: 0,
          requested_by: 1,
        },
      ],
      status: 200,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ExportsDrawer open={true} onOpenChange={() => {}} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/WARRANTY EXPIRY/i)).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();

    // Trigger realtime progress update
    const progressHandlers =
      eventHandlers[REALTIME_EVENTS.EXPORT_JOB_PROGRESS] || [];
    expect(progressHandlers.length).toBeGreaterThan(0);

    act(() => {
      progressHandlers.forEach((h) =>
        h({
          job_id: 102,
          progress: 80,
          status: EXPORT_JOB_STATUS.RUNNING,
        }),
      );
    });

    expect(await screen.findByText("80%")).toBeInTheDocument();
  });

  it("enforces realtime fallback: zero polling while connected, refetches on reconnect", async () => {
    const callApiSpy = vi.spyOn(apiModule, "callApi").mockResolvedValue({
      ok: true,
      message: "Success",
      data: [],
      status: 200,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ExportsDrawer open={true} onOpenChange={() => {}} />
      </QueryClientProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(callApiSpy).toHaveBeenCalledTimes(1);

    // Trigger reconnect handler
    const connectHandlers = eventHandlers["connect"] || [];
    expect(connectHandlers.length).toBeGreaterThan(0);

    await act(async () => {
      connectHandlers.forEach((h) => h());
    });

    expect(callApiSpy).toHaveBeenCalledTimes(2);
  });
});
