import { callApi } from "@/api/callApi";
import { endPoints, api_methods } from "@/api/endpoint";
import type { AuthPayload, LoginPayload } from "@/types";

export function loginApi(payload: LoginPayload) {
  return callApi<AuthPayload, LoginPayload>({
    url: endPoints.auth.login,
    method: api_methods.POST,
    body: payload,
  });
}
export function logoutApi() {
  return callApi<unknown>({
    url: endPoints.auth.logout,
    method: api_methods.DELETE,
  });
}
export function forgotPasswordApi(payload: { email: string }) {
  return callApi<{ otp?: string; otp_reference: string }, typeof payload>({
    url: endPoints.auth.forgot,
    method: api_methods.POST,
    body: payload,
  });
}
export function verifyOtpApi(payload: { otp: string; otp_reference: string }) {
  return callApi<{ reset_token: string }, typeof payload>({
    url: endPoints.auth.verifyOtp,
    method: api_methods.POST,
    body: payload,
  });
}
export function resetPasswordApi(payload: {
  reset_token: string;
  new_password: string;
  confirm_password: string;
}) {
  return callApi<null, typeof payload>({
    url: endPoints.auth.resetPassword,
    method: api_methods.PUT,
    body: payload,
  });
}
