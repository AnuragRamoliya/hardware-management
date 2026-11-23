import { describe, it, expect } from "vitest";
import { loginSchema } from "../pages/Login.schema";
import { employeeFormSchema } from "../components/employees/Employee.schema";
import { departmentFormSchema } from "../components/departments/Department.schema";
import { assetFormSchema } from "../components/assets/Asset.schema";
import { initiateOffboardingSchema } from "../components/offboarding/InitiateOffboarding.schema";

describe("Web Validation Schemas QA & Boundary Testing Suite", () => {
  describe("1. Login Schema", () => {
    it("validates successful login payload", async () => {
      const valid = { email: "admin@company.com", password: "Password123!" };
      await expect(loginSchema.validate(valid)).resolves.toEqual(valid);
    });

    it("rejects invalid email formats", async () => {
      const invalid = { email: "not-an-email", password: "Password123!" };
      await expect(loginSchema.validate(invalid)).rejects.toThrow();
    });

    it("rejects empty password", async () => {
      const invalid = { email: "admin@company.com", password: "" };
      await expect(loginSchema.validate(invalid)).rejects.toThrow();
    });
  });

  describe("2. Employee Form Schema", () => {
    it("validates a full employee creation payload", async () => {
      const valid = {
        employee_code: "EMP-1001",
        first_name: "Jane",
        last_name: "Doe",
        email: "jane.doe@company.com",
        department_id: 1,
        designation_id: 2,
        location_id: 1,
        create_login: 0,
        employment_status: 1,
        status: 1,
      };
      const res = await employeeFormSchema.validate(valid);
      expect(res.employee_code).toBe("EMP-1001");
      expect(res.first_name).toBe("Jane");
      expect(res.last_name).toBe("Doe");
    });

    it("enforces minimum 12 characters when create_login is enabled", async () => {
      const invalid = {
        employee_code: "EMP-1002",
        first_name: "Bob",
        last_name: "Smith",
        email: "bob@company.com",
        create_login: 1,
        login_password: "short", // < 12 chars
        employment_status: 1,
      };
      await expect(employeeFormSchema.validate(invalid)).rejects.toThrow(
        /at least 12 characters/i,
      );
    });

    it("accepts password >= 12 characters when create_login is enabled", async () => {
      const valid = {
        employee_code: "EMP-1002",
        first_name: "Bob",
        last_name: "Smith",
        email: "bob@company.com",
        create_login: 1,
        login_password: "ValidSecretPass123!",
        employment_status: 1,
      };
      await expect(employeeFormSchema.validate(valid)).resolves.toBeTruthy();
    });

    it("rejects missing required first or last name", async () => {
      const invalid = {
        employee_code: "EMP-1003",
        first_name: "",
        last_name: "",
        email: "test@company.com",
        employment_status: 1,
      };
      await expect(employeeFormSchema.validate(invalid)).rejects.toThrow();
    });
  });

  describe("3. Department Form Schema", () => {
    it("validates valid department", async () => {
      const valid = {
        name: "Information Technology",
        description: "Core IT",
        status: 1,
      };
      const res = await departmentFormSchema.validate(valid);
      expect(res.name).toBe("Information Technology");
    });

    it("rejects blank or whitespace department name", async () => {
      const invalid = { name: "   ", description: "Empty name", status: 1 };
      await expect(departmentFormSchema.validate(invalid)).rejects.toThrow();
    });
  });

  describe("4. Asset Form Schema", () => {
    it("validates asset with valid dates and condition", async () => {
      const valid = {
        brand: "Dell",
        model: "Latitude 5440",
        condition: "new",
        purchase_date: "2026-01-10",
        purchase_cost: 1250.5,
        warranty_start: "2026-01-10",
        warranty_end: "2029-01-10",
      };
      const res = await assetFormSchema.validate(valid);
      expect(res.brand).toBe("Dell");
      expect(res.model).toBe("Latitude 5440");
      expect(res.purchase_cost).toBe(1250.5);
    });

    it("rejects warranty_end that is earlier than warranty_start", async () => {
      const invalid = {
        brand: "Dell",
        model: "Latitude 5440",
        condition: "good",
        warranty_start: "2026-01-10",
        warranty_end: "2025-01-10", // Earlier than start
      };
      await expect(assetFormSchema.validate(invalid)).rejects.toThrow();
    });

    it("rejects invalid condition enum values", async () => {
      const invalid = {
        brand: "Dell",
        model: "Latitude 5440",
        condition: "broken-destroyed", // Not in ['new', 'good', 'fair', 'poor']
      };
      await expect(assetFormSchema.validate(invalid)).rejects.toThrow();
    });
  });

  describe("5. Initiate Offboarding Schema", () => {
    it("validates offboarding initiation parameters", async () => {
      const valid = {
        employee_id: "123",
        last_working_day: "2026-12-31",
        reason: "Career transition",
        notes: "Equipment returned on lwd",
      };
      const res = await initiateOffboardingSchema.validate(valid);
      expect(res.employee_id).toBe("123");
      expect(res.last_working_day).toBe("2026-12-31");
    });

    it("rejects missing employee_id or last_working_day", async () => {
      const invalid = { reason: "Resigned" };
      await expect(
        initiateOffboardingSchema.validate(invalid),
      ).rejects.toThrow();
    });
  });
});
