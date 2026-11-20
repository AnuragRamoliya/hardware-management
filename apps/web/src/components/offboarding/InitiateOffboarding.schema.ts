import * as yup from "yup";

export const initiateOffboardingSchema = yup.object().shape({
  employee_id: yup.string().required("Employee is required"),
  last_working_day: yup.string().required("Last working day is required"),
  reason: yup.string().optional(),
  notes: yup.string().optional(),
  template_id: yup.string().optional(),
  handover_user_id: yup.string().optional(),
});

export type InitiateOffboardingFormValues = {
  employee_id: string;
  last_working_day: string;
  reason?: string;
  notes?: string;
  template_id?: string;
  handover_user_id?: string;
};
