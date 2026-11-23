import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PhoneField } from "./PhoneField";
import { PhoneDisplay } from "./PhoneDisplay";

describe("PhoneField Component (apps/web)", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("renders with default country IN (+91) and data-hm attribute", () => {
    render(<PhoneField id="test-phone" name="phone" />);
    const container = screen
      .getByPlaceholderText("Enter phone number")
      .closest('[data-hm="phone"]');
    expect(container).toBeInTheDocument();

    const trigger = screen.getByRole("button", {
      name: /Selected country: India \(\+91\)/i,
    });
    expect(trigger).toBeInTheDocument();
  });

  it("formats input as user types Indian phone number", () => {
    const handleChange = vi.fn();
    render(<PhoneField onChange={handleChange} />);

    const input = screen.getByPlaceholderText("Enter phone number");
    fireEvent.change(input, { target: { value: "9876543210" } });

    expect(input).toHaveValue("98765 43210");
    expect(handleChange).toHaveBeenCalledWith("+919876543210");
  });

  it("opens country selector popover, searches and switches country to US", () => {
    const handleChange = vi.fn();
    render(<PhoneField onChange={handleChange} />);

    const trigger = screen.getByRole("button", {
      name: /Selected country: India/i,
    });
    fireEvent.click(trigger);

    // Dialog should open
    const dialog = screen.getByRole("dialog", { name: /Select Country Code/i });
    expect(dialog).toBeInTheDocument();

    // Search for US
    const searchInput = screen.getByPlaceholderText(
      "Search country or code...",
    );
    fireEvent.change(searchInput, { target: { value: "United States" } });

    // Select United States
    const usOption = screen.getByRole("option", { name: /United States/i });
    fireEvent.click(usOption);

    // Trigger should now show US +1
    expect(
      screen.getByRole("button", {
        name: /Selected country: United States \(\+1\)/i,
      }),
    ).toBeInTheDocument();

    // Type US number
    const input = screen.getByPlaceholderText("Enter phone number");
    fireEvent.change(input, { target: { value: "2025550143" } });
    expect(handleChange).toHaveBeenCalledWith("+12025550143");
  });

  it("handles pasted full E.164 number with international prefix", () => {
    const handleChange = vi.fn();
    render(<PhoneField onChange={handleChange} />);

    const input = screen.getByPlaceholderText("Enter phone number");
    fireEvent.change(input, { target: { value: "+442079460991" } });

    expect(handleChange).toHaveBeenCalledWith("+442079460991");
    // Should have automatically switched country button to GB
    expect(
      screen.getByRole("button", {
        name: /Selected country: United Kingdom \(\+44\)/i,
      }),
    ).toBeInTheDocument();
  });

  it("respects disabled state and prevents country selection", () => {
    render(<PhoneField disabled />);
    const trigger = screen.getByRole("button", { name: /Selected country/i });
    const input = screen.getByPlaceholderText("Enter phone number");

    expect(trigger).toBeDisabled();
    expect(input).toBeDisabled();
  });
});

describe("PhoneDisplay Component", () => {
  it("renders em-dash for empty or null values", () => {
    const { container } = render(<PhoneDisplay value={null} />);
    expect(container.textContent).toContain("—");
  });

  it("renders formatted phone number with tel link", () => {
    render(<PhoneDisplay value="+919876543210" mode="international" />);
    const link = screen.getByRole("link", { name: /Call \+91 98765 43210/i });
    expect(link).toHaveAttribute("href", "tel:+919876543210");
    expect(link).toHaveTextContent("+91 98765 43210");
  });

  it("provides copy button with accessible feedback", async () => {
    // Mock navigator.clipboard
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(<PhoneDisplay value="+919876543210" allowCopy />);
    const copyBtn = screen.getByRole("button", { name: /Copy phone number/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith("+919876543210");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Phone number copied/i }),
      ).toBeInTheDocument();
    });
  });
});
