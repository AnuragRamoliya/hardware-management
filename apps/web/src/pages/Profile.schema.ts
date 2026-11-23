import * as yup from "yup";
import { emailValidator, FORM_VALIDATION } from "@/utils/form-validation";

export type ProfileValues = { first_name: string; last_name: string; email: string };
export type PasswordValues = { current_password: string; password: string; confirm_password: string };

export const profileSchema: yup.ObjectSchema<ProfileValues> = yup.object({
  first_name: yup.string().trim().required(FORM_VALIDATION.REQUIRED),
  last_name: yup.string().defined(),
  email: emailValidator(),
});

export const passwordSchema: yup.ObjectSchema<PasswordValues> = yup.object({
  current_password: yup.string().required(FORM_VALIDATION.REQUIRED),
  password: yup.string().min(12, FORM_VALIDATION.PASSWORD_MINIMUM).required(FORM_VALIDATION.REQUIRED),
  confirm_password: yup.string().oneOf([yup.ref("password")], FORM_VALIDATION.PASSWORD_MISMATCH).required(FORM_VALIDATION.REQUIRED),
});
