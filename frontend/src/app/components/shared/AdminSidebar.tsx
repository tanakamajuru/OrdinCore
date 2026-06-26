import React from "react";
import { useNavigate, useLocation } from "react-router";
import {
  Home, Users, ShieldCheck, Building, Tags, AlertTriangle, ClipboardList, RefreshCw,
  Settings, Plug, Bell, FileSearch, Database, HeartPulse, BarChart3, Download, GitBranch,
  HelpCircle, LogOut,
} from "lucide-react";
import logo from "../images/logo.png";

interface NavItem { label: string; icon: React.ElementType; to: string; }
interface NavSection { heading?: string; items: NavItem[]; }

// Admin sidebar nav. Items with dedicated pages link to them; configuration
// items without a dedicated page yet route to /admin-settings.
const SECTIONS: NavSection[] = [
  { items: [{ label: "Admin Overview", icon: Home, to: "/admin-dashboard" }] },
  {
    heading: "User Management",
    items: [
      { label: "Users", icon: Users, to: "/admin-users" },
      { label: "Service Users", icon: Users, to: "/service-users" },
      { label: "Roles & Permissions", icon: ShieldCheck, to: "/admin-settings" },
      { label: "Teams & Services", icon: Building, to: "/admin-houses" },
    ],
  },
  {
    heading: "Configuration",
    items: [
      { label: "Governance Config", icon: Settings, to: "/governance-config" },
      { label: "Signal Library", icon: Tags, to: "/governance-config" },
      { label: "Pattern Thresholds", icon: AlertTriangle, to: "/governance-config" },
      { label: "Immediate Escalation Rules", icon: ShieldCheck, to: "/governance-config/immediate-rules" },
      { label: "Risk Domains", icon: ClipboardList, to: "/governance-config" },
      { label: "Review Cycles", icon: RefreshCw, to: "/admin-settings" },
    ],
  },
  {
    heading: "System Management",
    items: [
      { label: "Organisation Settings", icon: Settings, to: "/admin-settings" },
      { label: "Integrations", icon: Plug, to: "/admin-settings" },
      { label: "Notifications", icon: Bell, to: "/admin-settings" },
      { label: "Audit Log", icon: FileSearch, to: "/governance-config" },
      { label: "Data Retention", icon: Database, to: "/admin-settings" },
      { label: "System Health", icon: HeartPulse, to: "/admin-dashboard" },
    ],
  },
  {
    heading: "Reports & Tools",
    items: [
      { label: "System Reports", icon: BarChart3, to: "/reports" },
      { label: "Data Export", icon: Download, to: "/reports" },
      { label: "Reconstruction Builder", icon: GitBranch, to: "/reports" },
    ],
  },
];

export const ADMIN_SIDEBAR_WIDTH = "w-64";

export const AdminSidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");
    navigate("/login");
  };

  const isActive = (to: string) => location.pathname === to;

  return (
    <aside className={`fixed inset-y-0 left-0 ${ADMIN_SIDEBAR_WIDTH} bg-slate-900 text-slate-300 flex flex-col z-30`}>
      <div className="flex items-center gap-2 px-5 h-16 border-b border-slate-800 shrink-0">
        <img src={logo} alt="Ordin Core" className="h-8 w-auto" />
        <div className="leading-tight">
          <p className="text-white font-semibold text-sm">ORDIN CORE</p>
          <p className="text-[10px] text-slate-400">Governance. Evidence. Assurance.</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {SECTIONS.map((section, si) => (
          <div key={si}>
            {section.heading && (
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{section.heading}</p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.to);
                return (
                  <button
                    key={item.label}
                    onClick={() => navigate(item.to)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active ? "bg-primary text-primary-foreground" : "hover:bg-slate-800 text-slate-300"
                    }`}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3 shrink-0 space-y-0.5">
        <button onClick={() => navigate("/profile")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-slate-800">
          <HelpCircle className="w-4 h-4" /> Help &amp; Support
        </button>
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-slate-800 text-slate-300">
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
