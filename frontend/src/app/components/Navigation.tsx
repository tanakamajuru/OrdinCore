import { useLocation, useNavigate } from "react-router";
import { Home, Activity, FileText, AlertTriangle, TrendingUp, Users, User, FileDown, Shield, Network, Building, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    setUserRole(role || '');
  }, []);

  // Admin navigation items - comprehensive admin management
  const adminNavItems = [
    { path: "/admin-dashboard", label: "Dashboard", icon: Home },
    { path: "/admin-users", label: "Users", icon: Users },
    { path: "/admin-houses", label: "Sites", icon: Building },
    { path: "/admin-pulses", label: "Pulses", icon: Activity },
    { path: "/admin-risks", label: "Risks", icon: AlertTriangle },
    { path: "/admin-settings", label: "Settings", icon: Settings },
  ];

  // Other roles navigation items
  const otherNavItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/governance-pulse", label: "Governance Pulse", icon: Activity },
    { path: "/weekly-review", label: "Weekly Review", icon: FileText },
    { path: "/risk-register", label: "Risk Register", icon: AlertTriangle },
    { path: "/escalation-log", label: "Escalation Log", icon: Users },
    { path: "/incidents", label: "Incidents", icon: Shield },
    { path: "/patterns", label: "Patterns", icon: Network },
    { path: "/trends", label: "Trends", icon: TrendingUp },
    { path: "/reports", label: "Reports", icon: FileDown },
  ];

  const navItems = userRole === 'admin' ? adminNavItems : otherNavItems;

  const rightNavItems = [
    { path: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="bg-card border-b-2 border-border fixed top-0 left-0 right-0 z-50">
      <div className="w-full px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="text-xl  text-primary">OrdinCore</div>
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
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-primary hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {rightNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-primary hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
            <Button 
              onClick={() => {
                if (window.confirm("Are you sure you want to logout?")) {
                  navigate("/login");
                }
              }}
            >
              Logout
            </Button>

          </div>
        </div>
      </div>
    </nav>
  );
}
