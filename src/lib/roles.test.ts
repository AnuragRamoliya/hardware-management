import { describe, expect, it } from "vitest";
import { getUserRole } from "@/lib/roles";

describe("getUserRole", () => {
  it.each([
    ["Super Admin", "admin"],
    ["Hardware Manager", "hardware"],
    ["HR", "hr"],
    ["Employee", "employee"],
  ] as const)("normalizes the API role name %s", (name, expected) => {
    expect(
      getUserRole({
        id: 1,
        first_name: "Test",
        email: "test@example.com",
        role: { id: 1, name },
      }),
    ).toBe(expected);
  });
});
