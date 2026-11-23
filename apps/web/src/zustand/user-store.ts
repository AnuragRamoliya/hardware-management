import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";
import { navigateTo } from "@/routes/navigation";
import { PATHS } from "@/routes/paths";
import usePermissionStore from "@/zustand/permission-store";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setSession: (token: string, refreshToken: string | null, user: User) => void;
  setUser: (user: User) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      setSession: (token, refreshToken, user) => {
        localStorage.setItem("token", token);
        if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
        set({ token, refreshToken, user, isAuthenticated: true });
      },
      setUser: (user) => set({ user }),
      setToken: (token) => {
        if (token) localStorage.setItem("token", token);
        else localStorage.removeItem("token");
        set({ token, isAuthenticated: Boolean(token) });
      },
      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("refresh_token");
        usePermissionStore.getState().clearPermissions();
        set({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        });
        navigateTo(PATHS.LOGIN);
      },
    }),
    {
      name: "itam-auth",
      partialize: ({ token, refreshToken, user, isAuthenticated }) => ({
        token,
        refreshToken,
        user,
        isAuthenticated,
      }),
    },
  ),
);

export default useAuthStore;
