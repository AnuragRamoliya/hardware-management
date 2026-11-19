// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import {
  REQUEST_TYPE,
  REQUEST_STATUS,
  REQUEST_PRIORITY,
  REQUEST_TRANSITIONS,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TONES,
  REQUEST_TYPE_LABELS,
  REQUEST_PRIORITY_LABELS,
} from "@hm/shared";
import { Stepper, type StepItem } from "@/components/common/Stepper";

afterEach(() => {
  cleanup();
});

describe("Phase 4 Web: Requests & Workflow Standardization", () => {
  describe("REQUEST_TRANSITIONS State Machine", () => {
    it("allows valid transitions from SUBMITTED", () => {
      const allowed = REQUEST_TRANSITIONS[REQUEST_STATUS.SUBMITTED];
      expect(allowed).toContain(REQUEST_STATUS.UNDER_REVIEW);
      expect(allowed).toContain(REQUEST_STATUS.REJECTED);
      expect(allowed).toContain(REQUEST_STATUS.CANCELLED);
      // Directly fulfilling without review or approval is not allowed
      expect(allowed).not.toContain(REQUEST_STATUS.FULFILLED);
    });

    it("allows valid transitions from UNDER_REVIEW", () => {
      const allowed = REQUEST_TRANSITIONS[REQUEST_STATUS.UNDER_REVIEW];
      expect(allowed).toContain(REQUEST_STATUS.APPROVED);
      expect(allowed).toContain(REQUEST_STATUS.REJECTED);
      expect(allowed).toContain(REQUEST_STATUS.NEED_INFO);
      expect(allowed).toContain(REQUEST_STATUS.CANCELLED);
    });

    it("allows valid transitions from APPROVED", () => {
      const allowed = REQUEST_TRANSITIONS[REQUEST_STATUS.APPROVED];
      expect(allowed).toContain(REQUEST_STATUS.FULFILLED);
      expect(allowed).toContain(REQUEST_STATUS.CANCELLED);
    });

    it("allows transition from NEED_INFO back to SUBMITTED or CANCELLED", () => {
      const allowed = REQUEST_TRANSITIONS[REQUEST_STATUS.NEED_INFO];
      expect(allowed).toContain(REQUEST_STATUS.SUBMITTED);
      expect(allowed).toContain(REQUEST_STATUS.CANCELLED);
      expect(allowed).not.toContain(REQUEST_STATUS.APPROVED);
    });

    it("prevents transitions out of terminal CLOSED or CANCELLED states", () => {
      expect(REQUEST_TRANSITIONS[REQUEST_STATUS.CLOSED]).toHaveLength(0);
      expect(REQUEST_TRANSITIONS[REQUEST_STATUS.CANCELLED]).toHaveLength(0);
    });
  });

  describe("Labels and Tones Consistency", () => {
    it("has human-readable labels for all request types", () => {
      expect(REQUEST_TYPE_LABELS[REQUEST_TYPE.NEW_HARDWARE]).toBe(
        "New Hardware",
      );
      expect(REQUEST_TYPE_LABELS[REQUEST_TYPE.CHANGE_REPLACE_HARDWARE]).toBe(
        "Change / Replace Hardware",
      );
      expect(REQUEST_TYPE_LABELS[REQUEST_TYPE.REPAIR]).toBe("Repair");
      expect(REQUEST_TYPE_LABELS[REQUEST_TYPE.SOFTWARE_ACCESS]).toBe(
        "Software Access",
      );
      expect(REQUEST_TYPE_LABELS[REQUEST_TYPE.RETURN_HARDWARE]).toBe(
        "Return Hardware",
      );
    });

    it("has valid badge tones for each request status", () => {
      for (const status of Object.values(REQUEST_STATUS)) {
        if (typeof status === "number") {
          expect(REQUEST_STATUS_LABELS[status]).toBeDefined();
          expect(REQUEST_STATUS_TONES[status]).toBeDefined();
        }
      }
    });

    it("has priority labels for all priorities", () => {
      expect(REQUEST_PRIORITY_LABELS[REQUEST_PRIORITY.LOW]).toBe("Low");
      expect(REQUEST_PRIORITY_LABELS[REQUEST_PRIORITY.MEDIUM]).toBe("Medium");
      expect(REQUEST_PRIORITY_LABELS[REQUEST_PRIORITY.HIGH]).toBe("High");
      expect(REQUEST_PRIORITY_LABELS[REQUEST_PRIORITY.URGENT]).toBe("Urgent");
    });
  });

  describe("Stepper Shared Component", () => {
    const steps: StepItem[] = [
      { title: "Select Type", description: "Choose request category" },
      { title: "Item Details", description: "Fill specific items" },
      { title: "Review & Submit", description: "Final confirmation" },
    ];

    it("renders all step titles and indicators", () => {
      render(<Stepper steps={steps} activeStep={1} />);

      expect(screen.getByText("Select Type")).toBeTruthy();
      expect(screen.getByText("Item Details")).toBeTruthy();
      expect(screen.getByText("Review & Submit")).toBeTruthy();
    });

    it("marks the active step with aria-current='step'", () => {
      render(<Stepper steps={steps} activeStep={1} />);

      const buttons = screen.getAllByRole("button");
      expect(buttons[1].getAttribute("aria-current")).toBe("step");
      expect(buttons[0].getAttribute("aria-current")).toBeNull();
      expect(buttons[2].getAttribute("aria-current")).toBeNull();
    });

    it("allows clicking completed steps when onStepClick is provided", () => {
      const handleStepClick = vi.fn();
      render(
        <Stepper steps={steps} activeStep={2} onStepClick={handleStepClick} />,
      );

      const buttons = screen.getAllByRole("button");
      // Step 0 is completed, should be clickable
      fireEvent.click(buttons[0]);
      expect(handleStepClick).toHaveBeenCalledWith(0);

      // Step 1 is completed, should be clickable
      fireEvent.click(buttons[1]);
      expect(handleStepClick).toHaveBeenCalledWith(1);
    });

    it("disables future steps from being clicked", () => {
      const handleStepClick = vi.fn();
      render(
        <Stepper steps={steps} activeStep={0} onStepClick={handleStepClick} />,
      );

      const buttons = screen.getAllByRole("button");
      fireEvent.click(buttons[1]);
      expect(handleStepClick).not.toHaveBeenCalled();
    });
  });
});
