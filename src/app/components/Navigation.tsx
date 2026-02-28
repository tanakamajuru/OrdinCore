import { useLocation, useNavigate } from "react-router";
import { Home, Activity, FileText, AlertTriangle, TrendingUp, Users, User, FileDown } from "lucide-react";

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/governance-pulse", label: "Governance Pulse", icon: Activity },
    { path: "/weekly-review", label: "Weekly Review", icon: FileText },
    { path: "/risk-register", label: "Risk Register", icon: AlertTriangle },
    { path: "/escalation-log", label: "Escalation Log", icon: Users },
    { path: "/trends", label: "Trends", icon: TrendingUp },
    { path: "/reports", label: "Reports", icon: FileDown },
    { path: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="bg-white border-b-2 border-black">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="text-xl font-bold text-black">CareSignal</div>
            <div className="hidden md:flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                      isActive
                        ? "bg-black text-white"
                        : "text-gray-600 hover:text-black hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Governance Platform</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
