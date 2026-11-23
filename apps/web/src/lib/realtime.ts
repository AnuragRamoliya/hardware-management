import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { useEffect, useState, useRef } from "react";
import { queryClient } from "@/lib/queryClient";
import useAuthStore from "@/zustand/user-store";
import { REALTIME_EVENTS } from "@hm/shared";

let socketInstance: Socket | null = null;
let fallbackPollingTimer: ReturnType<typeof setInterval> | null = null;

function startFallbackPolling(): void {
  if (fallbackPollingTimer) return;
  // 60-second fallback polling interval while disconnected from realtime
  fallbackPollingTimer = setInterval(() => {
    void queryClient.invalidateQueries();
  }, 60_000);
}

function stopFallbackPolling(): void {
  if (fallbackPollingTimer) {
    clearInterval(fallbackPollingTimer);
    fallbackPollingTimer = null;
  }
}

export function getSocket(): Socket | null {
  const token = useAuthStore.getState().token;
  if (!token) {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
    return null;
  }

  if (socketInstance?.connected) {
    return socketInstance;
  }

  const rawHost =
    (import.meta as unknown as { env: Record<string, string> }).env
      ?.VITE_HOST_API ||
    (import.meta as unknown as { env: Record<string, string> }).env
      ?.VITE_API_BASE_URL ||
    "http://localhost:8000";
  const socketUrl = rawHost.replace(/\/api\/?$/, "").replace(/\/$/, "");

  socketInstance = io(socketUrl, {
    path: "/realtime",
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socketInstance.on("connect", () => {
    if (typeof window !== "undefined") {
      (window as unknown as { __itam_socket: Socket }).__itam_socket =
        socketInstance!;
    }
    stopFallbackPolling();
    // Full query invalidation on reconnect to catch any missed updates
    void queryClient.invalidateQueries();
  });

  socketInstance.on("disconnect", () => {
    startFallbackPolling();
  });

  socketInstance.on("connect_error", () => {
    startFallbackPolling();
  });

  // Handle session revocation from admin/daily job
  socketInstance.on(
    REALTIME_EVENTS.SESSION_REVOKED,
    (data: { message?: string; reason?: string }) => {
      toast.error(
        data?.message || "Your session has been terminated by an administrator",
      );
      useAuthStore.getState().logout();
    },
  );

  // Invalidate queries on realtime data events
  socketInstance.on(REALTIME_EVENTS.OFFBOARDING_TASK_UPDATED, () => {
    void queryClient.invalidateQueries({ queryKey: ["offboarding-cases"] });
    void queryClient.invalidateQueries({ queryKey: ["offboarding-case"] });
    void queryClient.invalidateQueries({ queryKey: ["offboarding-tasks"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  });

  socketInstance.on(REALTIME_EVENTS.OFFBOARDING_CASE_UPDATED, () => {
    void queryClient.invalidateQueries({ queryKey: ["offboarding-cases"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  });

  socketInstance.on(REALTIME_EVENTS.ASSET_STATUS_CHANGED, () => {
    void queryClient.invalidateQueries({ queryKey: ["assets"] });
    void queryClient.invalidateQueries({ queryKey: ["asset"] });
    void queryClient.invalidateQueries({ queryKey: ["unassigned-assets"] });
  });

  socketInstance.on(REALTIME_EVENTS.CREDENTIAL_APPROVAL_CHANGED, () => {
    void queryClient.invalidateQueries({ queryKey: ["credential-approvals"] });
    void queryClient.invalidateQueries({ queryKey: ["credentials"] });
  });

  socketInstance.on(REALTIME_EVENTS.CREDENTIAL_REVEALED, () => {
    void queryClient.invalidateQueries({
      queryKey: ["credential-access-logs"],
    });
  });

  socketInstance.on(REALTIME_EVENTS.REQUEST_STATUS_CHANGED, () => {
    void queryClient.invalidateQueries({ queryKey: ["requests"] });
    void queryClient.invalidateQueries({ queryKey: ["request"] });
  });

  socketInstance.on(REALTIME_EVENTS.REQUEST_COMMENT_ADDED, () => {
    void queryClient.invalidateQueries({ queryKey: ["request"] });
  });

  return socketInstance;
}

export function disconnectSocket(): void {
  stopFallbackPolling();
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

/**
 * Web Audio API synthesized chimes for scan results and alerts
 * High tone 880Hz for success, low tone 220Hz for error
 */
export function playChime(type: "success" | "error"): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
      osc.start();
      osc.stop(ctx.currentTime + 0.32);
    }
  } catch {
    // AudioContext blocked or not supported
  }
}

/**
 * Hook to automatically join a realtime room on mount and leave on unmount
 */
export function useRealtimeRoom(room?: string) {
  useEffect(() => {
    if (!room) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit("room:join", room);
    return () => {
      socket.emit("room:leave", room);
    };
  }, [room]);
}

export interface ViewerInfo {
  userId: number;
  name: string;
  role?: string;
}

/**
 * Hook to track "who is viewing" in collaborative staff rooms
 */
export function useRoomPresence(room?: string) {
  const [viewers, setViewers] = useState<ViewerInfo[]>([]);

  useEffect(() => {
    if (!room) return;
    const socket = getSocket();
    if (!socket) return;

    socket.emit("room:join", room);

    // Heartbeat every 25 seconds
    const interval = setInterval(() => {
      socket.emit("presence:heartbeat", room);
    }, 25_000);

    const handlePresence = (envelope: {
      data?: { room?: string; viewers?: ViewerInfo[] };
    }) => {
      if (
        envelope?.data?.room === room &&
        Array.isArray(envelope.data.viewers)
      ) {
        setViewers(envelope.data.viewers);
      }
    };

    socket.on(REALTIME_EVENTS.PRESENCE_UPDATED, handlePresence);

    return () => {
      clearInterval(interval);
      socket.off(REALTIME_EVENTS.PRESENCE_UPDATED, handlePresence);
      socket.emit("room:leave", room);
    };
  }, [room]);

  return viewers;
}

/**
 * Hook to manage collaborative typing indicators with 3-second auto-clear
 */
export function useTypingIndicator(room?: string) {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const timeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!room) return;
    const socket = getSocket();
    if (!socket) return;
    const timeouts = timeoutRef.current;

    const handleStart = (data: { user_id?: number; user_name?: string }) => {
      const name = data.user_name || "Someone";
      setTypingUsers((prev) => (prev.includes(name) ? prev : [...prev, name]));

      if (timeouts[name]) clearTimeout(timeouts[name]);
      timeouts[name] = setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u !== name));
      }, 3000);
    };

    const handleStop = (data: { user_name?: string }) => {
      const name = data.user_name || "Someone";
      if (timeouts[name]) clearTimeout(timeouts[name]);
      setTypingUsers((prev) => prev.filter((u) => u !== name));
    };

    socket.on("typing:start", handleStart);
    socket.on("typing:stop", handleStop);

    return () => {
      socket.off("typing:start", handleStart);
      socket.off("typing:stop", handleStop);
      Object.values(timeouts).forEach(clearTimeout);
    };
  }, [room]);

  const emitTyping = (isTyping: boolean) => {
    if (!room) return;
    const socket = getSocket();
    if (!socket) return;
    const user = useAuthStore.getState().user;
    const userName = user?.first_name
      ? `${user.first_name} ${user.last_name || ""}`.trim()
      : "User";
    socket.emit(isTyping ? "typing:start" : "typing:stop", {
      room,
      user_name: userName,
    });
  };

  return { typingUsers, emitTyping };
}
