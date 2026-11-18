import { beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.fn();
const post = vi.fn();
vi.mock("axios", () => ({
  default: {
    request: (...args: unknown[]) => request(...args),
    post: (...args: unknown[]) => post(...args),
    isAxiosError: (error: unknown) =>
      Boolean(error && typeof error === "object" && "isAxiosError" in error),
  },
  isAxiosError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "isAxiosError" in error),
}));

import { callApi } from "@/api/callApi";
import useAuthStore from "@/zustand/user-store";
import { setRouterNavigate } from "@/routes/navigation";

const user = { id: 1, first_name: "Alex", email: "alex@example.com" };

describe("callApi", () => {
  beforeEach(() => {
    request.mockReset();
    post.mockReset();
    localStorage.clear();
    useAuthStore.getState().setSession("access-1", "refresh-1", user);
  });

  it("adds the plain-text header and returns the typed data envelope", async () => {
    request.mockResolvedValue({
      status: 200,
      statusText: "OK",
      data: { message: "Loaded", data: { count: 4 } },
    });
    const result = await callApi<{ count: number }>({
      url: "employee/list",
      method: "POST",
      body: { currentPage: 1 },
    });
    expect(result).toEqual({
      ok: true,
      status: 200,
      data: { count: 4 },
      message: "Loaded",
    });
    expect(request.mock.calls[0]?.[0].headers["plain-text"]).toBe("true");
    expect(request.mock.calls[0]?.[0].headers.token).toBe("access-1");
  });

  it("refreshes once and retries with the new token", async () => {
    request
      .mockResolvedValueOnce({
        status: 401,
        statusText: "Unauthorized",
        data: { message: "Expired" },
      })
      .mockResolvedValueOnce({
        status: 200,
        statusText: "OK",
        data: { message: "OK", data: { rows: [] } },
      });
    post.mockResolvedValue({
      status: 200,
      data: { data: { token: "access-2", refresh_token: "refresh-2" } },
    });
    const result = await callApi<{ rows: unknown[] }>({
      url: "employee/list",
      method: "POST",
    });
    expect(result.ok).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[1]?.[0].headers.token).toBe("access-2");
    expect(post.mock.calls[0]?.[2].headers["plain-text"]).toBe("true");
    expect(post.mock.calls[0]?.[0]).toContain("/user/refresh/token");
  });

  it("logs out and navigates after an unrecoverable 401", async () => {
    const navigate = vi.fn();
    setRouterNavigate(navigate);
    request.mockResolvedValue({
      status: 401,
      statusText: "Unauthorized",
      data: { message: "Unauthorized" },
    });
    post.mockResolvedValue({
      status: 401,
      data: { message: "Refresh denied" },
    });
    const result = await callApi({ url: "employee/list", method: "GET" });
    expect(result.ok).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(navigate).toHaveBeenCalledWith("/login", { replace: true });
    setRouterNavigate(() => undefined);
  });
});
