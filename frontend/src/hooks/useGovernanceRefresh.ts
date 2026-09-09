import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

/**
 * Refreshes a read projection whenever any interface changes the canonical governance case.
 * Focus and a small safety poll cover mobile/background or transient socket disconnections.
 */
export function useGovernanceRefresh(refresh: () => void) {
  const callback = useRef(refresh);
  callback.current = refresh;

  useEffect(() => {
    const run = () => callback.current();
    const token = localStorage.getItem("authToken");
    let socket: Socket | null = null;
    if (token) {
      const base = (import.meta as any).env?.VITE_WS_URL
        || ((import.meta as any).env?.VITE_API_URL || "http://localhost:3001/api/v1").replace(/\/api\/v1\/?$/, "");
      socket = io(base, { auth: { token }, transports: ["websocket", "polling"], reconnection: true });
      socket.on("governance.case.updated", run);
      socket.on("connect", run);
    }
    window.addEventListener("focus", run);
    const poll = window.setInterval(run, 60_000);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", run);
      socket?.off("governance.case.updated", run);
      socket?.off("connect", run);
      socket?.disconnect();
    };
  }, []);
}
