import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";
import { useEffect } from "react";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { routesSection } from "@/routes/sections";
import { queryClient } from "@/lib/queryClient";
import { getSocket, disconnectSocket } from "@/lib/realtime";
import useAuthStore from "@/zustand/user-store";

export default function App() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    if (token) {
      getSocket();
    } else {
      disconnectSocket();
    }
  }, [token]);

  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        storageKey="itam-theme"
      >
        <QueryClientProvider client={queryClient}>
          <RouterProvider
            router={routesSection}
            future={{ v7_startTransition: true }}
          />
          <Toaster richColors position="top-right" />
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
