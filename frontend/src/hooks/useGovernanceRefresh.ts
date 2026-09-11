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
    // The consuming screen already loads its data in its own mount effect. Refetching again the
    // instant the socket first connects just re-renders the screen a few hundred ms after it
    // appears — which reads to the user as the page "reloading itself". Only resync on a genuine
    // RE-connect (after a dropped connection), never on the first connect.
    let firstConnect = true;
    if (token) {
      const base = (import.meta as any).env?.VITE_WS_URL
        || ((import.meta as any).env?.VITE_API_URL || "http://localhost:3001/api/v1").replace(/\/api\/v1\/?$/, "");
      socket = io(base, { auth: { token }, transports: ["websocket", "polling"], reconnection: true });
      socket.on("governance.case.updated", run);
      socket.on("connect", () => { if (firstConnect) { firstConnect = false; return; } run(); });
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
