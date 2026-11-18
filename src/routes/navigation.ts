import { PATHS } from "@/routes/paths";

type Navigate = (to: string, options?: { replace?: boolean }) => void;
let navigate: Navigate | null = null;

export function setRouterNavigate(handler: Navigate): void {
  navigate = handler;
}

export function navigateTo(path: string): void {
  if (navigate) navigate(path, { replace: true });
  else window.history.replaceState({}, "", path || PATHS.LOGIN);
}
