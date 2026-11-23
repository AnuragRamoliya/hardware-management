import * as yup from "yup";
import { FORM_VALIDATION } from "@/utils/form-validation";

export const userFormSchema = yup.object({
  first_name: yup.string().trim().required(FORM_VALIDATION.REQUIRED),
  last_name: yup.string().trim().required(FORM_VALIDATION.REQUIRED),
  email: yup
    .string()
    .trim()
    .email(FORM_VALIDATION.EMAIL)
    .required(FORM_VALIDATION.REQUIRED),
  role_id: yup
    .mixed<string | number>()
    .required(FORM_VALIDATION.REQUIRED)
    .transform((val) => (val === "" ? null : val)),
  password: yup
    .string()
    .trim()
    .nullable()
    .test(
      "min-length",
      "Password must be at least 12 characters",
      (val) => !val || val.length >= 12,
    ),
  status: yup
    .mixed<string | number>()
    .default(1)
    .required(FORM_VALIDATION.REQUIRED),
});

export type UserFormValues = yup.InferType<typeof userFormSchema>;
