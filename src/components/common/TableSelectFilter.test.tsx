import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TableSelectFilter } from "./TableSelectFilter";

const { mockCallApi } = vi.hoisted(() => ({ mockCallApi: vi.fn() }));

vi.mock("@/api/callApi", () => ({
  callApi: mockCallApi,
}));

describe("TableSelectFilter", () => {
  beforeEach(() => {
    mockCallApi.mockReset().mockResolvedValue({
      ok: true,
      data: { rows: [], count: 0, hasMore: false, page: 1 },
    });
  });

  it("does not loop state updates after async option data arrives", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={client}>
        <StrictMode>
          <TableSelectFilter
            config={{
              name: "department_id",
              label: "Department",
              optionsResource: "department",
            }}
            value={null}
            onChange={vi.fn()}
          />
        </StrictMode>
      </QueryClientProvider>,
    );

    expect(mockCallApi).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("combobox", { name: "Department filter" }));

    await waitFor(() => {
      expect(mockCallApi).toHaveBeenCalledOnce();
      expect(consoleError).not.toHaveBeenCalledWith(
        expect.stringContaining("Maximum update depth exceeded"),
        expect.anything(),
      );
    });

    consoleError.mockRestore();
    client.clear();
  });
});
