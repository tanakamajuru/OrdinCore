import { useLocation, useNavigate } from "react-router";
import { Home, Activity, FileText, AlertTriangle, TrendingUp, Users, User, FileDown, BarChart3, Eye, Ambulance } from "lucide-react";
import { Button } from "./ui/button";

export function RoleBasedNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole') || 'registered-manager';

  const getNavigationItems = () => {
    switch (userRole) {
      case 'registered-manager':
        return [
          { path: "/dashboard", label: "Dashboard", icon: Home },
          { path: "/governance-pulse", label: "Governance Pulse", icon: Activity },
          { path: "/risk-register", label: "Risk Management", icon: AlertTriangle },
          { path: "/incidents", label: "Serious Incidents", icon: Ambulance },
          { path: "/reports", label: "Reports", icon: FileDown },
          { path: "/profile", label: "Profile", icon: User },
        ];
      
      case 'responsible-individual':
        return [
          { path: "/dashboard", label: "Cross-Site Dashboard", icon: Home },
          { path: "/escalation-log", label: "Escalation Management", icon: AlertTriangle },
          { path: "/risk-register", label: "Risk Register Oversight", icon: AlertTriangle },
          { path: "/governance-pulse", label: "Governance Pulse Oversight", icon: Activity },
          { path: "/weekly-review", label: "Weekly Review", icon: FileText },
          { path: "/incidents", label: "Serious Incidents", icon: Ambulance },
          { path: "/reports", label: "Cross-Site Reports", icon: FileDown },
          { path: "/trends", label: "Trend Analysis", icon: TrendingUp },
          { path: "/profile", label: "Profile", icon: User },
        ];
      
      case 'director':
        return [
          { path: "/dashboard", label: "Strategic Dashboard", icon: Home },
          { path: "/incidents", label: "Serious Incidents", icon: Ambulance },
          { path: "/patterns", label: "Patterns", icon: Eye },
          { path: "/reports", label: "Reports", icon: FileDown },
          { path: "/trends", label: "Trend Monitoring", icon: BarChart3 },
          { path: "/profile", label: "Profile", icon: User },
        ];
      
      default:
        return [];
    }
  };

  const navItems = getNavigationItems();

  const getRoleLabel = () => {
    switch (userRole) {
      case 'registered-manager': return 'Registered Manager';
      case 'responsible-individual': return 'Responsible Individual';
      case 'director': return 'Director';
      default: return 'User';
    }
  };

  return (
    <nav className="bg-white border-b-2 border-black fixed top-0 left-0 right-0 z-50">
      <div className="w-full px-6">
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

          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-600 mr-4">
              {getRoleLabel()}
            </div>
            <Button onClick={() => navigate("/login")}>Logout</Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
