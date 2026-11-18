import * as yup from "yup";
import { FORM_VALIDATION } from "@/utils/form-validation";

export const maintenanceFormSchema = yup.object({
  asset_id: yup
    .mixed<number | string>()
    .required(FORM_VALIDATION.REQUIRED)
    .test("non-empty", FORM_VALIDATION.REQUIRED, (val) => val != null && val !== ""),
  issue: yup.string().trim().required(FORM_VALIDATION.REQUIRED),
  vendor_id: yup
    .mixed<number | string>()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  cost: yup
    .number()
    .nullable()
    .transform((val, orig) => (orig === "" || orig === null || isNaN(val) ? null : val)),
  sent_at: yup.string().required(FORM_VALIDATION.REQUIRED),
});

export type MaintenanceFormValues = yup.InferType<typeof maintenanceFormSchema>;

export const completeMaintenanceSchema = yup.object({
  returned_at: yup.string().required(FORM_VALIDATION.REQUIRED),
  resolution: yup.string().trim().required(FORM_VALIDATION.REQUIRED),
  cost: yup
    .number()
    .nullable()
    .transform((val, orig) => (orig === "" || orig === null || isNaN(val) ? null : val)),
});

export type CompleteMaintenanceValues = yup.InferType<typeof completeMaintenanceSchema>;
