import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { vi, describe, beforeEach, it, expect } from "vitest";
import { useAsyncOptions } from "./use-async-options";

const { mockCallApi } = vi.hoisted(() => ({ mockCallApi: vi.fn() }));

vi.mock("@/api/callApi", () => ({ callApi: mockCallApi }));

describe("useAsyncOptions filter serialization", () => {
  beforeEach(() => {
    mockCallApi.mockReset().mockResolvedValue({
      ok: true,
      data: { rows: [], count: 0, hasMore: false, page: 1 },
    });
  });

  it("sends an empty object when every dependent filter has been cleared", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useAsyncOptions({
          endpoint: "employee/options",
          filters: { department_id: null, location_id: "", manager_id: undefined },
        }),
      { wrapper },
    );

    await waitFor(() => expect(mockCallApi).toHaveBeenCalledOnce());
    expect(mockCallApi).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ filters: {} }) }),
    );
    client.clear();
  });

  it("keeps meaningful false and zero filter values", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    renderHook(
      () =>
        useAsyncOptions({
          endpoint: "asset/options",
          filters: { unassigned: false, asset_status: 0, empty: null },
        }),
      { wrapper },
    );

    await waitFor(() => expect(mockCallApi).toHaveBeenCalledOnce());
    expect(mockCallApi).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          filters: { unassigned: false, asset_status: 0 },
        }),
      }),
    );
    client.clear();
  });

  it("uses nextCursor for load more and stops when hasMore is false", async () => {
    mockCallApi
      .mockResolvedValueOnce({
        ok: true,
        data: {
          rows: [{ value: 1, label: "First", id: 1, name: "First", meta: {} }],
          count: 2,
          hasMore: true,
          page: 1,
          nextCursor: { rank: 0, label: "First", id: 1 },
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: {
          rows: [{ value: 2, label: "Second", id: 2, name: "Second", meta: {} }],
          count: 2,
          hasMore: false,
          page: 1,
        },
      });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useAsyncOptions({ endpoint: "employee/options" }),
      { wrapper },
    );

    await waitFor(() => expect(mockCallApi).toHaveBeenCalledOnce());
    await act(async () => {
      await result.current.loadMore();
    });
    await waitFor(() => expect(mockCallApi).toHaveBeenCalledTimes(2));

    expect(mockCallApi.mock.calls[1]?.[0].body).toMatchObject({
      cursor: { rank: 0, label: "First", id: 1 },
    });
    expect(result.current.data?.rows.map((row) => row.value)).toEqual([1, 2]);
    expect(result.current.hasMore).toBe(false);
    await act(async () => {
      await result.current.loadMore();
    });
    expect(mockCallApi).toHaveBeenCalledTimes(2);
    client.clear();
  });

  it("aborts a stale request when debounced search changes", async () => {
    mockCallApi.mockImplementation(
      ({ body, signal }: { body: { search?: string }; signal: AbortSignal }) => {
        if (body.search) {
          return Promise.resolve({
            ok: true,
            data: { rows: [], count: 0, hasMore: false, page: 1 },
          });
        }
        return new Promise((resolve) => {
          signal.addEventListener("abort", () =>
            resolve({ ok: false, data: null, message: "aborted" }),
          );
        });
      },
    );
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useAsyncOptions({ endpoint: "employee/options" }),
      { wrapper },
    );

    await waitFor(() => expect(mockCallApi).toHaveBeenCalledOnce());
    const firstSignal = mockCallApi.mock.calls[0]?.[0].signal as AbortSignal;
    expect(firstSignal).toBeDefined();

    await act(async () => {
      result.current.setSearch("Jordan");
    });

    await waitFor(() => expect(mockCallApi).toHaveBeenCalledTimes(2), {
      timeout: 2_000,
    });
    expect(firstSignal.aborted).toBe(true);
    expect(mockCallApi.mock.calls[1]?.[0].body).toMatchObject({
      search: "Jordan",
    });
    expect(mockCallApi.mock.calls[1]?.[0].body.cursor).toBeUndefined();
    client.clear();
  });
});
