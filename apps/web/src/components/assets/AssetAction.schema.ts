import * as yup from "yup";
import { FORM_VALIDATION } from "@/utils/form-validation";

export const assignAssetSchema = yup.object({
  employee_id: yup
    .mixed<number | string>()
    .required(FORM_VALIDATION.REQUIRED)
    .test("non-empty", FORM_VALIDATION.REQUIRED, (val) => val != null && val !== ""),
  due_return_date: yup.string().nullable(),
  note: yup.string().trim().nullable(),
});

export type AssignAssetValues = yup.InferType<typeof assignAssetSchema>;

export const returnAssetSchema = yup.object({
  return_condition: yup
    .string()
    .oneOf(["new", "good", "fair", "poor"])
    .required(FORM_VALIDATION.REQUIRED),
  to_status: yup.string().oneOf(["1", "4", "5", "6"]).default("1"),
  notes: yup.string().trim().nullable(),
});

export type ReturnAssetValues = yup.InferType<typeof returnAssetSchema>;

export const transferAssetSchema = yup.object({
  to_employee_id: yup
    .mixed<number | string>()
    .required(FORM_VALIDATION.REQUIRED)
    .test("non-empty", FORM_VALIDATION.REQUIRED, (val) => val != null && val !== ""),
  note: yup.string().trim().nullable(),
});

export type TransferAssetValues = yup.InferType<typeof transferAssetSchema>;

export const bulkAssignAssetSchema = yup.object({
  employee_id: yup
    .mixed<number | string>()
    .required(FORM_VALIDATION.REQUIRED)
    .test("non-empty", FORM_VALIDATION.REQUIRED, (val) => val != null && val !== ""),
  due_return_date: yup.string().nullable(),
  note: yup.string().trim().nullable(),
});

export type BulkAssignAssetValues = yup.InferType<typeof bulkAssignAssetSchema>;

export const bulkReturnAssetSchema = yup.object({
  return_condition: yup
    .string()
    .oneOf(["new", "good", "fair", "poor"])
    .required(FORM_VALIDATION.REQUIRED),
  to_status: yup.string().oneOf(["1", "4", "5", "6"]).default("1"),
  notes: yup.string().trim().nullable(),
});

export type BulkReturnAssetValues = yup.InferType<typeof bulkReturnAssetSchema>;
