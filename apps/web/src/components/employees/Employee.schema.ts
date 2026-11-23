import * as yup from "yup";
import { FORM_VALIDATION } from "@/utils/form-validation";

export const employeeFormSchema = yup.object({
  employee_code: yup.string().trim().required(FORM_VALIDATION.REQUIRED),
  first_name: yup.string().trim().required(FORM_VALIDATION.REQUIRED),
  last_name: yup.string().trim().required(FORM_VALIDATION.REQUIRED),
  email: yup
    .string()
    .trim()
    .email(FORM_VALIDATION.EMAIL)
    .required(FORM_VALIDATION.REQUIRED),
  phone: yup.string().trim().nullable().default(""),
  department_id: yup
    .mixed<string | number>()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  designation_id: yup
    .mixed<string | number>()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  location_id: yup
    .mixed<string | number>()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  manager_id: yup
    .mixed<string | number>()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  create_login: yup.mixed<string | number>().default(0),
  login_password: yup
    .string()
    .trim()
    .nullable()
    .test(
      "min-length",
      "Login password must be at least 12 characters",
      function (value) {
        const { create_login } = this.parent;
        const isCreating =
          create_login === "1" || create_login === 1 || create_login === true;
        if (!isCreating) return true;
        return Boolean(value && value.length >= 12);
      },
    ),
  employment_status: yup
    .mixed<string | number>()
    .default(1)
    .required(FORM_VALIDATION.REQUIRED),
  status: yup
    .mixed<string | number>()
    .default(1)
    .required(FORM_VALIDATION.REQUIRED),
});

export type EmployeeFormValues = yup.InferType<typeof employeeFormSchema>;
