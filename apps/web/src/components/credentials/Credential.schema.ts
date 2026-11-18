import * as yup from "yup";

export const credentialSchema = yup.object({
  employee_id: yup
    .number()
    .transform((value) =>
      isNaN(value) || value === "" ? undefined : Number(value),
    )
    .required("Employee is required"),
  credential_type_id: yup
    .number()
    .transform((value) =>
      isNaN(value) || value === "" ? undefined : Number(value),
    )
    .required("Credential type is required"),
  label: yup.string().trim().required("Account / Service label is required"),
  username: yup.string().trim().required("Username or email is required"),
  password: yup.string().when("$isEditing", {
    is: false,
    then: (schema) => schema.required("Password is required"),
    otherwise: (schema) => schema.optional(),
  }),
  url: yup.string().url("Must be a valid URL").nullable().optional(),
  software_id: yup
    .number()
    .transform((value) =>
      isNaN(value) || value === "" ? undefined : Number(value),
    )
    .nullable()
    .optional(),
  asset_id: yup
    .number()
    .transform((value) =>
      isNaN(value) || value === "" ? undefined : Number(value),
    )
    .nullable()
    .optional(),
  notes: yup.string().nullable().optional(),
  must_change_on_first_use: yup.boolean().optional(),
  expires_at: yup.string().nullable().optional(),
});

export const portalCredentialSchema = yup.object({
  credential_type_id: yup
    .number()
    .transform((value) =>
      isNaN(value) || value === "" ? undefined : Number(value),
    )
    .required("Credential type is required"),
  label: yup.string().trim().required("Account label is required"),
  username: yup.string().trim().required("Username or email is required"),
  password: yup.string().when("$isEditing", {
    is: false,
    then: (schema) => schema.required("Password is required"),
    otherwise: (schema) => schema.optional(),
  }),
  url: yup.string().url("Must be a valid URL").nullable().optional(),
  notes: yup.string().nullable().optional(),
});

export const collectionRequestSchema = yup.object({
  employee_id: yup
    .number()
    .transform((value) =>
      isNaN(value) || value === "" ? undefined : Number(value),
    )
    .required("Employee is required"),
  credential_type_id: yup
    .number()
    .transform((value) =>
      isNaN(value) || value === "" ? undefined : Number(value),
    )
    .required("Credential type is required"),
  due_date: yup.string().required("Due date is required"),
  message: yup.string().nullable().optional(),
});
