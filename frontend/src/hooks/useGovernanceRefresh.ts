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
      // Refetch ONLY on a real governance change. We deliberately do NOT refetch on socket
      // "connect": behind the proxy the websocket drops and reconnects every ~10-15s, and a
      // refetch-on-connect turned that into a constant "the screen keeps reloading itself" on
      // large lists. The mount effect does the initial load; the focus listener and the 60s poll
      // below cover any resync after a genuine disconnection.
      socket.on("governance.case.updated", run);
    }
    window.addEventListener("focus", run);
    const poll = window.setInterval(run, 60_000);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", run);
      socket?.off("governance.case.updated", run);
      socket?.disconnect();
    };
  }, []);
}
