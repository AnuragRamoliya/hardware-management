import * as yup from "yup";
import { FORM_VALIDATION } from "@/utils/form-validation";

export const credentialFormSchema = yup.object({
  employee_id: yup
    .mixed<string | number>()
    .required(FORM_VALIDATION.REQUIRED)
    .test(
      "valid-id",
      FORM_VALIDATION.REQUIRED,
      (val) => val !== null && val !== "" && val !== undefined,
    ),
  credential_type_id: yup
    .mixed<string | number>()
    .required(FORM_VALIDATION.REQUIRED)
    .test(
      "valid-id",
      FORM_VALIDATION.REQUIRED,
      (val) => val !== null && val !== "" && val !== undefined,
    ),
  label: yup.string().trim().required(FORM_VALIDATION.REQUIRED),
  username: yup.string().trim().required(FORM_VALIDATION.REQUIRED),
  password: yup.string().when("$isEditing", {
    is: false,
    then: (schema) =>
      schema
        .required(FORM_VALIDATION.REQUIRED)
        .min(8, "Use at least 8 characters."),
    otherwise: (schema) => schema.nullable().optional(),
  }),
  url: yup
    .string()
    .trim()
    .nullable()
    .test(
      "valid-url",
      "Enter a valid URL (e.g. https://example.com)",
      (val) => {
        if (!val) return true;
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
    ),
  software_id: yup
    .mixed<string | number>()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  asset_id: yup
    .mixed<string | number>()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  expires_at: yup
    .string()
    .nullable()
    .transform((val) => (val === "" ? null : val)),
  must_change_on_first_use: yup.boolean().default(false),
  notes: yup.string().nullable().optional(),
});

export type CredentialFormValues = yup.InferType<typeof credentialFormSchema>;

export const portalCredentialFormSchema = yup.object({
  credential_type_id: yup
    .mixed<string | number>()
    .required(FORM_VALIDATION.REQUIRED)
    .test(
      "valid-id",
      FORM_VALIDATION.REQUIRED,
      (val) => val !== null && val !== "" && val !== undefined,
    ),
  label: yup.string().trim().required(FORM_VALIDATION.REQUIRED),
  username: yup.string().trim().required(FORM_VALIDATION.REQUIRED),
  password: yup.string().when("$isEditing", {
    is: false,
    then: (schema) =>
      schema
        .required(FORM_VALIDATION.REQUIRED)
        .min(8, "Use at least 8 characters."),
    otherwise: (schema) => schema.nullable().optional(),
  }),
  url: yup
    .string()
    .trim()
    .nullable()
    .test(
      "valid-url",
      "Enter a valid URL (e.g. https://example.com)",
      (val) => {
        if (!val) return true;
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
    ),
  notes: yup.string().nullable().optional(),
});

export type PortalCredentialFormValues = yup.InferType<
  typeof portalCredentialFormSchema
>;

export const collectionRequestFormSchema = yup.object({
  employee_id: yup
    .mixed<string | number>()
    .required(FORM_VALIDATION.REQUIRED)
    .test(
      "valid-id",
      FORM_VALIDATION.REQUIRED,
      (val) => val !== null && val !== "" && val !== undefined,
    ),
  credential_type_id: yup
    .mixed<string | number>()
    .required(FORM_VALIDATION.REQUIRED)
    .test(
      "valid-id",
      FORM_VALIDATION.REQUIRED,
      (val) => val !== null && val !== "" && val !== undefined,
    ),
  due_date: yup.string().required(FORM_VALIDATION.REQUIRED),
  message: yup.string().nullable().optional(),
});

export type CollectionRequestFormValues = yup.InferType<
  typeof collectionRequestFormSchema
>;

// Aliases for backwards compatibility with any existing imports
export const credentialSchema = credentialFormSchema;
export const portalCredentialSchema = portalCredentialFormSchema;
export const collectionRequestSchema = collectionRequestFormSchema;
