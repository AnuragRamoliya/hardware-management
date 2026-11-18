import * as yup from "yup";
import { FORM_VALIDATION } from "@/utils/form-validation";

export const assignSoftwareSchema = yup.object({
  employee_id: yup
    .number()
    .required(FORM_VALIDATION.REQUIRED)
    .typeError(FORM_VALIDATION.REQUIRED),
  license_id: yup
    .number()
    .nullable()
    .transform((val, orig) => (orig === "" || orig == null ? null : Number(val))),
});

export type AssignSoftwareValues = yup.InferType<typeof assignSoftwareSchema>;
