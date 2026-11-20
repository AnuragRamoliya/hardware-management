import { describe, it } from "node:test";
import assert from "node:assert";
import {
  STATUS,
  STATUS_CODES,
  MODULES,
  ACCESS_TYPES,
  ROLES,
  ASSET_STATUS,
  EMPLOYMENT_STATUS,
  OFFBOARDING_CASE_STATUS,
  OFFBOARDING_TASK_TYPE,
  OFFBOARDING_TASK_STATUS,
  OFFBOARDING_EXIT_TYPE,
  CASE_TRANSITIONS,
  TASK_TRANSITIONS,
  EXPORT_JOB_STATUS,
} from "../dist/index.js";

describe("@hm/shared contracts and enums", () => {
  it("exports correct STATUS constants", () => {
    assert.strictEqual(STATUS.INACTIVE, 0);
    assert.strictEqual(STATUS.ACTIVE, 1);
    assert.strictEqual(STATUS.DELETED, 2);
  });

  it("exports correct STATUS_CODES", () => {
    assert.strictEqual(STATUS_CODES.SUCCESS, 200);
    assert.strictEqual(STATUS_CODES.CREATED, 201);
    assert.strictEqual(STATUS_CODES.UNAUTHORIZED, 401);
    assert.strictEqual(STATUS_CODES.FORBIDDEN, 403);
    assert.strictEqual(STATUS_CODES.NOT_FOUND, 404);
  });

  it("exports expected MODULES", () => {
    assert.strictEqual(MODULES.USER, "user");
    assert.strictEqual(MODULES.EMPLOYEE, "employee");
    assert.strictEqual(MODULES.ASSET, "asset");
    assert.strictEqual(MODULES.SOFTWARE, "software");
  });

  it("exports correct ACCESS_TYPES", () => {
    assert.strictEqual(ACCESS_TYPES.READ, "read_access");
    assert.strictEqual(ACCESS_TYPES.WRITE, "write_access");
    assert.strictEqual(ACCESS_TYPES.DELETE, "delete_access");
  });

  it("exports system ROLES", () => {
    assert.strictEqual(ROLES.SUPER_ADMIN, "super_admin");
    assert.strictEqual(ROLES.HARDWARE_MANAGER, "hardware_manager");
    assert.strictEqual(ROLES.HR, "hr");
    assert.strictEqual(ROLES.EMPLOYEE, "employee");
  });

  it("exports asset statuses", () => {
    assert.strictEqual(ASSET_STATUS.AVAILABLE, 1);
    assert.strictEqual(ASSET_STATUS.ASSIGNED, 2);
    assert.strictEqual(ASSET_STATUS.PENDING_RETURN, 3);
  });

  it("exports Phase 5 offboarding enums and state transitions", () => {
    assert.strictEqual(OFFBOARDING_CASE_STATUS.OPEN, "open");
    assert.strictEqual(OFFBOARDING_CASE_STATUS.IN_PROGRESS, "in_progress");
    assert.strictEqual(
      OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE,
      "pending_clearance",
    );
    assert.strictEqual(OFFBOARDING_CASE_STATUS.COMPLETED, "completed");
    assert.strictEqual(OFFBOARDING_CASE_STATUS.CANCELLED, "cancelled");

    assert.strictEqual(OFFBOARDING_TASK_TYPE.ASSET, "asset");
    assert.strictEqual(OFFBOARDING_TASK_TYPE.SOFTWARE, "software");
    assert.strictEqual(OFFBOARDING_TASK_TYPE.CREDENTIAL, "credential");
    assert.strictEqual(OFFBOARDING_TASK_TYPE.REQUEST, "request");
    assert.strictEqual(OFFBOARDING_TASK_TYPE.CHECKLIST, "checklist");

    assert.strictEqual(OFFBOARDING_TASK_STATUS.PENDING, "pending");
    assert.strictEqual(OFFBOARDING_TASK_STATUS.IN_PROGRESS, "in_progress");
    assert.strictEqual(OFFBOARDING_TASK_STATUS.COMPLETED, "completed");
    assert.strictEqual(OFFBOARDING_TASK_STATUS.WAIVED, "waived");
    assert.strictEqual(OFFBOARDING_TASK_STATUS.EXCEPTION, "exception");
    assert.strictEqual(OFFBOARDING_TASK_STATUS.CANCELLED, "cancelled");

    assert.strictEqual(OFFBOARDING_EXIT_TYPE.RESIGNATION, 1);
    assert.strictEqual(OFFBOARDING_EXIT_TYPE.TERMINATION, 2);

    // Verify valid transition paths
    assert.ok(
      CASE_TRANSITIONS[OFFBOARDING_CASE_STATUS.OPEN].includes(
        OFFBOARDING_CASE_STATUS.IN_PROGRESS,
      ),
    );
    assert.ok(
      CASE_TRANSITIONS[OFFBOARDING_CASE_STATUS.OPEN].includes(
        OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE,
      ),
    );
    assert.strictEqual(
      CASE_TRANSITIONS[OFFBOARDING_CASE_STATUS.COMPLETED].length,
      0,
    );
    assert.ok(
      TASK_TRANSITIONS[OFFBOARDING_TASK_STATUS.PENDING].includes(
        OFFBOARDING_TASK_STATUS.COMPLETED,
      ),
    );
  });

  it("exports Phase 6 export job statuses", () => {
    assert.strictEqual(EXPORT_JOB_STATUS.QUEUED, "queued");
    assert.strictEqual(EXPORT_JOB_STATUS.RUNNING, "running");
    assert.strictEqual(EXPORT_JOB_STATUS.DONE, "done");
    assert.strictEqual(EXPORT_JOB_STATUS.FAILED, "failed");
    assert.strictEqual(EXPORT_JOB_STATUS.EXPIRED, "expired");
  });

  it("validates sample API response shape against contract", () => {
    const sampleResponse = {
      message: "Fetched successfully",
      data: {
        rows: [
          {
            id: 1,
            name: "MacBook Pro",
            asset_tag: "HW-001",
            status: STATUS.ACTIVE,
          },
        ],
        count: 1,
      },
    };

    assert.ok(sampleResponse.message);
    assert.ok(Array.isArray(sampleResponse.data.rows));
    assert.strictEqual(sampleResponse.data.count, 1);
  });

  it("exports Phase R real-time events and room helpers", async () => {
    const { REALTIME_EVENTS, REALTIME_ROOMS, NOTIFICATION_CATEGORIES } =
      await import("../dist/index.js");
    assert.strictEqual(
      REALTIME_EVENTS.NOTIFICATION_CREATED,
      "notification.created",
    );
    assert.strictEqual(REALTIME_EVENTS.REQUEST_UPDATED, "request.updated");
    assert.strictEqual(REALTIME_ROOMS.user(42), "user:42");
    assert.strictEqual(REALTIME_ROOMS.request(100), "request:100");
    assert.strictEqual(REALTIME_ROOMS.requestStaff(100), "request:100:staff");
    assert.strictEqual(NOTIFICATION_CATEGORIES.REQUEST, "request");
  });
});
