import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Home, Activity, FileText, AlertTriangle, TrendingUp, Users, FileDown, BarChart3,
  Eye, Ambulance, Settings, Building2, ClipboardList, CheckCircle2, Flag,
  HelpCircle, LifeBuoy, LogOut, Layers, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/services/api";
import logo from "./images/logo.png";

type NavItem = { path: string; label: string; icon: any; section?: string; badgeKey?: string; action?: "help" | "support" };

export function RoleBasedNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const rawRole = user?.role || localStorage.getItem("userRole") || "";
  const userRole = rawRole.toUpperCase().replace(/-/g, "_");
  const grantedRoles: string[] = ((user as any)?.granted_roles && (user as any).granted_roles.length
    ? (user as any).granted_roles
    : [userRole]).map((r: string) => r.toUpperCase().replace(/-/g, "_"));
  const [switching, setSwitching] = useState(false);

  const roleLabel = (r: string) => ({
    SUPER_ADMIN: "Super Admin", ADMIN: "Company Admin", REGISTERED_MANAGER: "Registered Manager",
    RESPONSIBLE_INDIVIDUAL: "Responsible Individual", DIRECTOR: "Director", TEAM_LEADER: "Team Leader",
  } as Record<string, string>)[r] || r;

  const switchRole = async (role: string) => {
    if (role === userRole || switching) return;
    setSwitching(true);
    try {
      await apiClient.post("/auth/active-role", { role });
      toast.success(`Now acting as ${roleLabel(role)}`);
      // The active role drives the whole interface — reload so every screen, the nav,
      // and the home route re-render for the new capacity from a fresh /auth/me.
      window.location.assign("/dashboard");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to switch role");
      setSwitching(false);
    }
  };

  const firstName = user?.first_name || "";
  const lastName = user?.last_name || "";
  const displayName =
    user?.name || (firstName || lastName ? `${firstName} ${lastName}`.trim() : localStorage.getItem("userName")) || "User";
  const houseName = (user as any)?.house_name || (user as any)?.assigned_house_name || "";
  const initials = (firstName[0] || displayName[0] || "U").toUpperCase() + (lastName[0] || "").toUpperCase();

  const getNavigationItems = (): NavItem[] => {
    switch (userRole) {
      case "SUPER_ADMIN":
        return [
          { path: "/super-admin/companies", label: "Company Management", icon: Building2 },
          { path: "/super-admin/users", label: "Users", icon: Users },
          { path: "/governance-config", label: "Governance Config", icon: ClipboardList },
          { path: "/super-admin/settings", label: "System Settings", icon: Settings },
        ];
      case "ADMIN":
        return [
          { path: "/admin-dashboard", label: "Admin Dashboard", icon: Settings },
          { path: "/admin-users", label: "Users", icon: Users },
          { path: "/admin/houses", label: "Services", icon: Home },
          { path: "/service-users", label: "Service Users", icon: Users },
          { path: "/governance-config", label: "Governance Config", icon: ClipboardList },
        ];
      case "REGISTERED_MANAGER":
        // Stage 4 spine rail (10 -> 5). Today · Pipeline · Weekly review · Serious
        // incidents · Reports. Patterns/Register/Actions/Effectiveness are reached through
        // the pipeline ribbon; Escalations via the risk and /escalation-log (deep links
        // survive — nothing is route-deleted).
        return [
          { path: "/dashboard", label: "Dashboard", icon: Home },
          { path: "/rm5", label: "Pipeline", icon: Layers },
          { path: "/risk-register", label: "Risk Register", icon: AlertTriangle },
          { path: "/weekly-review", label: "Weekly Review", icon: FileText },
          { path: "/incidents", label: "Serious Incidents", icon: Ambulance },
          { path: "/reports", label: "Reports", icon: FileDown },
        ];
      case "RESPONSIBLE_INDIVIDUAL":
        return [
          { path: "/dashboard", label: "Assurance", icon: Home },
          { path: "/effectiveness", label: "Effectiveness", icon: TrendingUp },
          { path: "/risk-register", label: "Oversight Register", icon: AlertTriangle },
          { path: "/service-review-rollup", label: "Review Roll-up", icon: Layers },
          { path: "/reconstruction", label: "Reconstruction", icon: Layers },
          { path: "/escalation-log", label: "Escalations", icon: Flag, badgeKey: "open" },
          { path: "/incidents", label: "Serious Incidents", icon: Ambulance },
          { path: "/trends", label: "Trends", icon: BarChart3 },
          { path: "/reports", label: "Reports", icon: FileDown },
        ];
      case "DIRECTOR":
        return [
          { path: "/dashboard", label: "Strategic Dashboard", icon: Home },
          { path: "/effectiveness", label: "Effectiveness", icon: TrendingUp },
          { path: "/risk-register", label: "Oversight Register", icon: AlertTriangle },
          { path: "/service-review-rollup", label: "Review Roll-up", icon: Layers },
          { path: "/reconstruction", label: "Reconstruction", icon: Layers },
          { path: "/escalation-log", label: "Escalations", icon: Flag, badgeKey: "open" },
          { path: "/patterns", label: "Patterns", icon: Eye },
          { path: "/trends", label: "Trends", icon: BarChart3 },
          { path: "/incidents", label: "Serious Incidents", icon: Ambulance },
          { path: "/reports", label: "Reports", icon: FileDown },
        ];
      case "TEAM_LEADER":
        return [
          { path: "/dashboard", label: "Dashboard", icon: Home },
          { path: "/pulse-history", label: "My Signals", icon: Activity },
          { path: "/my-actions", label: "My Actions", icon: ClipboardList, badgeKey: "actions" },
          { path: "/escalation-log", label: "Escalations", icon: Flag, badgeKey: "open" },
          { path: "#help", label: "Help & Guides", icon: HelpCircle, section: "Support", action: "help" },
          { path: "#support", label: "Contact Support", icon: LifeBuoy, section: "Support", action: "support" },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavigationItems();

  const getRoleLabel = () => {
    switch (userRole) {
      case "ADMIN": return "Company Admin";
      case "REGISTERED_MANAGER": return "Registered Manager";
      case "RESPONSIBLE_INDIVIDUAL": return "Responsible Individual";
      case "DIRECTOR": return "Director";
      case "TEAM_LEADER": return "Team Leader";
      case "SUPER_ADMIN": return "Super Admin";
      default: return "User";
    }
  };

  const [openEscalations, setOpenEscalations] = useState(0);
  useEffect(() => {
    if (!navItems.some((i) => i.badgeKey === "open")) return;
    let active = true;
    const fetchStats = async () => {
      try {
        const res = await apiClient.getEscalationStats();
        const data = (res as any)?.data?.data ?? (res as any)?.data;
        if (active && data) setOpenEscalations(Number(data.open ?? data.pending ?? 0));
      } catch { /* non-fatal */ }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 60000);
    return () => { active = false; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  // Actions badge — counts "due this week" the SAME way the Team Leader dashboard card
  // does (not Complete/Completed/Cancelled AND due_date within the next 7 days, which
  // also catches overdue), so the badge and the dashboard card can never disagree.
  const [pendingActions, setPendingActions] = useState(0);
  useEffect(() => {
    if (!navItems.some((i) => i.badgeKey === "actions")) return;
    let active = true;
    const fetchActions = async () => {
      try {
        const res = await apiClient.get<any[]>("/actions/my");
        const rows = (res as any)?.data?.data ?? (res as any)?.data ?? [];
        const now = Date.now();
        const dueSoon = Array.isArray(rows)
          ? rows.filter((a: any) =>
              a?.status &&
              !["Complete", "Completed", "Cancelled"].includes(a.status) &&
              a.due_date &&
              new Date(a.due_date).getTime() <= now + 7 * 86400000
            ).length
          : 0;
        if (active) setPendingActions(dueSoon);
      } catch { /* non-fatal */ }
    };
    fetchActions();
    const interval = setInterval(fetchActions, 60000);
    return () => { active = false; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout? Any unsaved changes may be lost.")) {
      logout();
      navigate("/login");
    }
  };

  const handleItem = (item: NavItem) => {
    if (item.action === "help") { toast.info("Help & Guides are coming soon."); return; }
    if (item.action === "support") { window.location.href = "mailto:support@ordincore.com"; return; }
    navigate(item.path);
  };

  let lastSection: string | undefined;

  return (
    <aside className="ordin-sidebar fixed inset-y-0 left-0 w-64 bg-slate-900 text-slate-300 flex flex-col z-40">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-800 shrink-0">
        <img src={logo} alt="Ordin Core" className="h-8 w-auto" />
        <div className="leading-tight">
          <p className="text-white font-semibold text-sm tracking-wide">ORDIN CORE</p>
          <p className="text-[10px] text-slate-400">Governance. Evidence. Assurance.</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const badgeCount = item.badgeKey === "open" ? openEscalations : item.badgeKey === "actions" ? pendingActions : 0;
          const showBadge = !!item.badgeKey && badgeCount > 0;
          const badgeTone = item.badgeKey === "actions" ? "bg-amber-500" : "bg-red-500";
          const sectionHeader = item.section && item.section !== lastSection ? item.section : null;
          lastSection = item.section;
          return (
            <div key={item.label}>
              {sectionHeader && (
                <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{sectionHeader}</p>
              )}
              <button
                onClick={() => handleItem(item)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative ${
                  isActive ? "bg-primary text-primary-foreground" : "hover:bg-slate-800 text-slate-300"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1 text-left">{item.label}</span>
                {showBadge && (
                  <span className={`${badgeTone} text-white text-[10px] font-semibold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center`}>
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

      {/* Multi-role: "acting as" switcher — only shown when the user holds >1 role */}
      {grantedRoles.length > 1 && (
        <div className="border-t border-slate-800 px-3 py-2 shrink-0">
          <label className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1 mb-1">
            <RefreshCw className="w-3 h-3" /> Acting as
          </label>
          <select
            value={userRole}
            disabled={switching}
            onChange={(e) => switchRole(e.target.value)}
            className="w-full text-sm bg-slate-800 text-white border border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            {grantedRoles.map((r) => (
              <option key={r} value={r}>{roleLabel(r)}</option>
            ))}
          </select>
        </div>
      )}

      <div className="border-t border-slate-800 p-3 shrink-0">
        <button
          onClick={() => navigate("/profile")}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors"
          title="View profile"
        >
          <span className="w-9 h-9 rounded-full bg-primary/20 text-primary border border-primary/40 flex items-center justify-center text-xs font-semibold shrink-0">
            {initials}
          </span>
          <span className="leading-tight text-left min-w-0">
            <span className="block text-sm text-white truncate">{getRoleLabel()}</span>
            <span className="block text-[11px] text-slate-400 truncate">{houseName || displayName}</span>
          </span>
        </button>
        <button onClick={handleLogout} className="mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-slate-800 text-slate-300">
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </div>
    </aside>
  );
}
