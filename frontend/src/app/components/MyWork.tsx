import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlertCircle, Bell, ClipboardList, TrendingUp, FileText, ChevronRight, CheckCircle2, RefreshCw, ShieldCheck,
} from "lucide-react";
import apiClient from "@/services/apiClient";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

type WorkItem = {
  key: string; label: string; count: number; emphasis?: number;
  tone: "red" | "amber" | "blue" | "emerald" | "slate"; link: string; primary_action: string;
};

const ICONS: Record<string, any> = {
  escalations: AlertCircle, signals: Bell, actions: ClipboardList, effectiveness: TrendingUp, weekly: FileText,
};
const TONES: Record<string, { dot: string; text: string; ring: string }> = {
  red: { dot: "bg-red-500", text: "text-red-600", ring: "hover:border-red-400/60" },
  amber: { dot: "bg-amber-500", text: "text-amber-600", ring: "hover:border-amber-400/60" },
  blue: { dot: "bg-blue-500", text: "text-blue-600", ring: "hover:border-blue-400/60" },
  emerald: { dot: "bg-emerald-500", text: "text-emerald-600", ring: "hover:border-emerald-400/60" },
  slate: { dot: "bg-slate-600", text: "text-slate-600", ring: "hover:border-slate-400/60" },
};

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

export function MyWork() {
  const navigate = useNavigate();
  const [items, setItems] = useState<WorkItem[]>([]);
  const [allClear, setAllClear] = useState(false);
  const [loading, setLoading] = useState(true);

  const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
  const firstName = user.first_name || (user.name ? String(user.name).split(" ")[0] : "") || "";
  const role = String(user.role || localStorage.getItem("userRole") || "").toUpperCase().replace(/-/g, "_");
  const canDoDailyGovernance = ["REGISTERED_MANAGER", "ADMIN", "SUPER_ADMIN"].includes(role);

  const load = async () => {
    try {
      const res = await apiClient.get("/my-work");
      const data = res.data?.data ?? res.data ?? {};
      setItems(Array.isArray(data.items) ? data.items : []);
      setAllClear(!!data.all_clear);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  // Cards must stay live — refetch whenever the user returns to this tab/window.
  useEffect(() => {
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 lg:px-10 pt-24 max-w-3xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="text-3xl font-bold text-foreground">{greeting()}{firstName ? `, ${firstName}` : ""}.</h1>
          <button onClick={() => { setLoading(true); load(); }} className="text-sm text-primary flex items-center gap-1.5 mt-2"><RefreshCw size={15} /> Refresh</button>
        </div>
        <p className="text-muted-foreground mb-6">
          {loading ? "Loading your work…" : allClear ? "Here's your work for today." : "Here's what needs your attention today."}
        </p>

        {/* Do Daily Governance — the RM's daily heartbeat, always reachable from My Work. */}
        {canDoDailyGovernance && !loading && (
          <button onClick={() => navigate("/governance-dashboard")}
            className="w-full text-left bg-primary/5 border-2 border-primary/30 rounded-xl p-4 flex items-center gap-4 mb-4 hover:bg-primary/10 transition-all">
            <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"><ShieldCheck size={20} /></div>
            <div className="flex-1">
              <div className="font-semibold text-foreground">Do Daily Governance</div>
              <div className="text-xs text-muted-foreground">Review each house, record decisions and sign off the day.</div>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">Open <ChevronRight size={16} /></span>
          </button>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
        ) : allClear ? (
          <div className="bg-card border-2 border-border rounded-xl p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={30} className="text-emerald-600" /></div>
            <h2 className="text-xl font-semibold text-foreground">You're all caught up</h2>
            <p className="text-muted-foreground mt-1">Nothing needs your attention right now. Great work.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => {
              const Icon = ICONS[it.key] || ClipboardList;
              const t = TONES[it.tone] || TONES.slate;
              return (
                <button
                  key={it.key}
                  onClick={() => navigate(it.link)}
                  className={`w-full text-left bg-card border-2 border-border rounded-xl p-4 flex items-center gap-4 transition-all hover:shadow-sm ${t.ring}`}
                >
                  <div className={`w-11 h-11 rounded-full ${t.dot} text-white flex items-center justify-center shrink-0`}><Icon size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-foreground">{it.count}</span>
                      <span className="text-foreground">{it.label}</span>
                    </div>
                    {it.emphasis ? (
                      <span className={`text-xs font-medium ${t.text}`}>
                        {it.emphasis} {it.key === "actions" ? "overdue" : it.key === "escalations" ? "urgent" : "need attention"}
                      </span>
                    ) : null}
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary whitespace-nowrap">
                    {it.primary_action} <ChevronRight size={16} />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {!loading && !allClear && (
          <p className="text-xs text-muted-foreground mt-6 text-center">Every item opens the screen where the work is done. This panel only surfaces it.</p>
        )}
      </div>
    </div>
  );
}

export default MyWork;
