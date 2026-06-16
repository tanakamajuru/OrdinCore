import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Home, Activity, FileText, AlertTriangle, TrendingUp, Users, FileDown, BarChart3,
  Eye, Ambulance, Settings, Building2, ClipboardList, CheckCircle2, Flag,
  HelpCircle, LifeBuoy, LogOut, Layers,
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
          { path: "/super-admin/settings", label: "System Settings", icon: Settings },
        ];
      case "ADMIN":
        return [
          { path: "/admin-dashboard", label: "Admin Dashboard", icon: Settings },
          { path: "/admin-users", label: "Users", icon: Users },
          { path: "/admin/houses", label: "Services", icon: Home },
          { path: "/patients", label: "Patients", icon: Users },
          { path: "/admin/service-users", label: "Service Users", icon: Users },
        ];
      case "REGISTERED_MANAGER":
        return [
          { path: "/dashboard", label: "Dashboard", icon: Home },
          { path: "/risk-register", label: "Oversight Register", icon: AlertTriangle },
          { path: "/patients", label: "Patients", icon: Users },
          { path: "/my-actions", label: "Actions", icon: ClipboardList },
          { path: "/escalation-log", label: "Escalations", icon: Flag, badgeKey: "open" },
          { path: "/weekly-review", label: "Weekly Review", icon: FileText },
          { path: "/incidents", label: "Serious Incidents", icon: Ambulance },
          { path: "/reports", label: "Reports", icon: FileDown },
        ];
      case "RESPONSIBLE_INDIVIDUAL":
        return [
          { path: "/dashboard", label: "Cross-Site Dashboard", icon: Home },
          { path: "/escalation-log", label: "Escalations", icon: Flag, badgeKey: "open" },
          { path: "/risk-register", label: "Oversight Register", icon: AlertTriangle },
          { path: "/incidents", label: "Serious Incidents", icon: Ambulance },
          { path: "/patients", label: "Patients", icon: Users },
          { path: "/trends", label: "Trends", icon: TrendingUp },
          { path: "/reports", label: "Reports", icon: FileDown },
        ];
      case "DIRECTOR":
        return [
          { path: "/dashboard", label: "Strategic Dashboard", icon: Home },
          { path: "/risk-register", label: "Oversight Register", icon: AlertTriangle },
          { path: "/escalation-log", label: "Escalations", icon: Flag, badgeKey: "open" },
          { path: "/patients", label: "Patients", icon: Users },
          { path: "/patterns", label: "Patterns", icon: Eye },
          { path: "/trends", label: "Trends", icon: BarChart3 },
          { path: "/incidents", label: "Serious Incidents", icon: Ambulance },
          { path: "/reports", label: "Reports", icon: FileDown },
        ];
      case "TEAM_LEADER":
        return [
          { path: "/dashboard", label: "Dashboard", icon: Home },
          { path: "/pulse-history", label: "My Signals", icon: Activity },
          { path: "/patients", label: "Patients", icon: Users },
          { path: "/my-actions", label: "My Actions", icon: ClipboardList },
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
          const showBadge = item.badgeKey === "open" && openEscalations > 0;
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
                  <span className="bg-red-500 text-white text-[10px] font-semibold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                    {openEscalations > 9 ? "9+" : openEscalations}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </nav>

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
