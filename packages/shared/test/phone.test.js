import { describe, it } from "node:test";
import assert from "node:assert";
import {
  validatePhoneNumber,
  formatPhoneNumber,
  formatAsYouType,
  SUPPORTED_COUNTRIES,
} from "../dist/index.js";

describe("Phone Validator & Formatter (@hm/shared)", () => {
  it("includes India as first country with +91 calling code", () => {
    assert.ok(SUPPORTED_COUNTRIES.length > 100);
    assert.deepStrictEqual(SUPPORTED_COUNTRIES[0], {
      code: "IN",
      name: "India",
      dialCode: "+91",
    });
  });

  describe("Validation for IN, US, GB, AE, SG", () => {
    it("validates Indian phone numbers (+91 and national format)", () => {
      const res1 = validatePhoneNumber("+919876543210");
      assert.strictEqual(res1.valid, true);
      assert.strictEqual(res1.e164, "+919876543210");
      assert.strictEqual(res1.country, "IN");

      const res2 = validatePhoneNumber("9876543210", "IN");
      assert.strictEqual(res2.valid, true);
      assert.strictEqual(res2.e164, "+919876543210");
      assert.strictEqual(res2.formattedNational, "098765 43210");
    });

    it("validates United States numbers (+1)", () => {
      const res = validatePhoneNumber("+12025550143");
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.e164, "+12025550143");
      assert.strictEqual(res.country, "US");
    });

    it("validates United Kingdom numbers (+44)", () => {
      const res = validatePhoneNumber("+442079460991");
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.e164, "+442079460991");
      assert.strictEqual(res.country, "GB");
    });

    it("validates United Arab Emirates numbers (+971)", () => {
      const res = validatePhoneNumber("+971501234567");
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.e164, "+971501234567");
      assert.strictEqual(res.country, "AE");
    });

    it("validates Singapore numbers (+65)", () => {
      const res = validatePhoneNumber("+6561234567");
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.e164, "+6561234567");
      assert.strictEqual(res.country, "SG");
    });
  });

  describe("Edge cases: leading zeros, pasted formats, spaces, dashes", () => {
    it("handles pasted formats with dashes, brackets and spaces", () => {
      const pasted = "+91 (987) 654-3210";
      const res = validatePhoneNumber(pasted);
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.e164, "+919876543210");
    });

    it("handles national numbers with leading zero in UK", () => {
      const res = validatePhoneNumber("020 7946 0991", "GB");
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.e164, "+442079460991");
    });

    it("rejects empty or whitespace-only inputs", () => {
      assert.strictEqual(validatePhoneNumber("").valid, false);
      assert.strictEqual(validatePhoneNumber("   ").valid, false);
      assert.strictEqual(validatePhoneNumber(null).valid, false);
      assert.strictEqual(validatePhoneNumber(undefined).valid, false);
    });

    it("rejects invalid, too short or too long phone numbers", () => {
      assert.strictEqual(validatePhoneNumber("123").valid, false);
      assert.strictEqual(validatePhoneNumber("+91123").valid, false);
      assert.strictEqual(
        validatePhoneNumber("+91987654321099999").valid,
        false,
      );
      assert.strictEqual(validatePhoneNumber("not-a-number").valid, false);
    });
  });

  describe("Formatting Modes", () => {
    it("formats in national, international and e164 modes", () => {
      const input = "+919876543210";
      assert.strictEqual(formatPhoneNumber(input, "e164"), "+919876543210");
      assert.strictEqual(
        formatPhoneNumber(input, "international"),
        "+91 98765 43210",
      );
      assert.strictEqual(formatPhoneNumber(input, "national"), "098765 43210");
    });

    it("returns original input if invalid", () => {
      assert.strictEqual(formatPhoneNumber("invalid-str"), "invalid-str");
    });
  });

  describe("As-You-Type Formatting", () => {
    it("formats progressively as user types digits", () => {
      assert.strictEqual(formatAsYouType("98765", "IN"), "98765");
      assert.strictEqual(formatAsYouType("9876543210", "IN"), "98765 43210");
    });
  });
});
