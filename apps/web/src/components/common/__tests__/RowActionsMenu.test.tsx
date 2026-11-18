import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RowActionsMenu } from "../RowActionsMenu";
import { Eye, Pencil, Trash2 } from "lucide-react";

describe("RowActionsMenu", () => {
  const renderWithRouter = (ui: React.ReactElement) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default desktop viewport
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("renders trigger button with correct accessibility label", () => {
    renderWithRouter(
      <RowActionsMenu
        actions={[
          { key: "view", label: "View details", icon: Eye, onSelect: vi.fn() },
        ]}
      />,
    );

    const trigger = screen.getByRole("button", { name: /row actions/i });
    expect(trigger).toBeInTheDocument();
  });

  it("hides trigger button entirely when actions list is empty or all hidden", () => {
    const { container, rerender } = renderWithRouter(
      <RowActionsMenu actions={[]} />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(
      <MemoryRouter>
        <RowActionsMenu
          actions={[
            {
              key: "hidden1",
              label: "Hidden",
              hidden: true,
              onSelect: vi.fn(),
            },
            {
              key: "hidden2",
              label: "Hidden 2",
              hidden: true,
              onSelect: vi.fn(),
            },
          ]}
        />
      </MemoryRouter>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("disables the trigger button when all actions are disabled", () => {
    renderWithRouter(
      <RowActionsMenu
        actions={[
          { key: "edit", label: "Edit", disabled: true, onSelect: vi.fn() },
        ]}
      />,
    );

    const trigger = screen.getByRole("button", { name: /row actions/i });
    expect(trigger).toBeDisabled();
  });

  it("opens portaled dropdown menu and executes onSelect on item click", async () => {
    const handleView = vi.fn();
    const handleEdit = vi.fn();

    const { container } = renderWithRouter(
      <div id="table-container" style={{ overflow: "hidden" }}>
        <RowActionsMenu
          actions={[
            {
              key: "view",
              label: "View details",
              icon: Eye,
              onSelect: handleView,
            },
            {
              key: "edit",
              label: "Edit details",
              icon: Pencil,
              onSelect: handleEdit,
            },
          ]}
        />
      </div>,
    );

    const trigger = screen.getByRole("button", { name: /row actions/i });
    fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" });
    fireEvent.click(trigger);

    // Items should appear in document (via portal outside table-container)
    const viewItem = await screen.findByRole("menuitem", {
      name: /view details/i,
    });
    const editItem = screen.getByRole("menuitem", { name: /edit details/i });

    expect(viewItem).toBeInTheDocument();
    expect(editItem).toBeInTheDocument();

    // Verify it is portaled outside table-container
    const tableContainer = container.querySelector("#table-container");
    expect(tableContainer?.contains(viewItem)).toBe(false);

    fireEvent.click(viewItem);
    expect(handleView).toHaveBeenCalledTimes(1);
    expect(handleEdit).not.toHaveBeenCalled();
  });

  it("does not fire onSelect for disabled items and marks aria-disabled", async () => {
    const handleEdit = vi.fn();

    renderWithRouter(
      <RowActionsMenu
        actions={[
          {
            key: "edit",
            label: "Edit details",
            icon: Pencil,
            disabled: true,
            disabledReason: "Permission denied",
            onSelect: handleEdit,
          },
        ]}
      />,
    );

    const trigger = screen.getByRole("button", { name: /row actions/i });
    fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" });
    fireEvent.click(trigger);

    const editItem = await screen.findByRole("menuitem", {
      name: /edit details/i,
    });
    expect(editItem).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(editItem);
    expect(handleEdit).not.toHaveBeenCalled();
  });

  it("renders destructive action with danger styling", async () => {
    const handleDelete = vi.fn();

    renderWithRouter(
      <RowActionsMenu
        actions={[
          { key: "view", label: "View", icon: Eye, onSelect: vi.fn() },
          {
            key: "delete",
            label: "Delete record",
            icon: Trash2,
            destructive: true,
            onSelect: handleDelete,
          },
        ]}
      />,
    );

    const trigger = screen.getByRole("button", { name: /row actions/i });
    fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" });
    fireEvent.click(trigger);

    const deleteItem = await screen.findByRole("menuitem", {
      name: /delete record/i,
    });
    expect(deleteItem).toBeInTheDocument();
    expect(deleteItem.className).toContain("text-danger");

    fireEvent.click(deleteItem);
    expect(handleDelete).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape key press", async () => {
    renderWithRouter(
      <RowActionsMenu
        actions={[
          { key: "view", label: "View details", icon: Eye, onSelect: vi.fn() },
        ]}
      />,
    );

    const trigger = screen.getByRole("button", { name: /row actions/i });
    fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" });
    fireEvent.click(trigger);

    const item = await screen.findByRole("menuitem", { name: /view details/i });
    expect(item).toBeInTheDocument();

    fireEvent.keyDown(item, { key: "Escape", code: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByRole("menuitem", { name: /view details/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("renders mobile drawer sheet when viewport is mobile (< 768px)", async () => {
    // Mock mobile media query
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(max-width: 767px)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const handleView = vi.fn();

    renderWithRouter(
      <RowActionsMenu
        actions={[
          {
            key: "view",
            label: "View details",
            icon: Eye,
            onSelect: handleView,
          },
        ]}
      />,
    );

    const trigger = screen.getByRole("button", { name: /row actions/i });
    fireEvent.click(trigger);

    // Dialog bottom sheet should be rendered
    const viewButton = await screen.findByRole("button", {
      name: /view details/i,
    });
    expect(viewButton).toBeInTheDocument();

    // Cancel button should be present in mobile sheet
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(viewButton);
    expect(handleView).toHaveBeenCalledTimes(1);
  });
});
