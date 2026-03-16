import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { Home, Activity, FileText, AlertTriangle, TrendingUp, User, FileDown, BarChart3, Eye, Ambulance, Settings } from "lucide-react";
import { Button } from "./ui/button";
import apiClient from "@/services/apiClient";

export function RoleBasedNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = (localStorage.getItem('userRole') || '').toUpperCase();

  const getNavigationItems = () => {
    switch (userRole) {
      case 'ADMIN':
        return [
          { path: "/admin-dashboard", label: "Admin Dashboard", icon: Settings },
          { path: "/governance-pulse", label: "Governance Pulse", icon: Activity },
          { path: "/risk-register", label: "Risk Management", icon: AlertTriangle },
          { path: "/incidents", label: "Serious Incidents", icon: Ambulance },
          { path: "/reports", label: "Reports", icon: FileDown },
          { path: "/profile", label: "Profile", icon: User },
        ];
      
      case 'REGISTERED_MANAGER':
        return [
          { path: "/dashboard", label: "Dashboard", icon: Home },
          { path: "/governance-pulse", label: "Governance Pulse", icon: Activity },
          { path: "/risk-register", label: "Risk Management", icon: AlertTriangle },
          { path: "/incidents", label: "Serious Incidents", icon: Ambulance },
          { path: "/reports", label: "Reports", icon: FileDown },
          { path: "/profile", label: "Profile", icon: User },
        ];
      
      case 'RESPONSIBLE_INDIVIDUAL':
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
      
      case 'DIRECTOR':
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
      case 'ADMIN': return 'Company Admin';
      case 'REGISTERED_MANAGER': return 'Registered Manager';
      case 'RESPONSIBLE_INDIVIDUAL': return 'Responsible Individual';
      case 'DIRECTOR': return 'Director';
      case 'SUPER_ADMIN': return 'Super Admin';
      default: return 'User';
    }
  };

  const [pendingEscalations, setPendingEscalations] = useState(0);

  useEffect(() => {
    if (userRole === 'RESPONSIBLE_INDIVIDUAL') {
      const fetchStats = async () => {
        try {
          const res = await apiClient.get('/escalations/stats');
          const data = (res.data as any).data;
          if (data && data.pending !== undefined) {
            setPendingEscalations(Number(data.pending));
          }
        } catch (err) {
          console.error('Failed to fetch escalation stats', err);
        }
      };

      fetchStats();
      const interval = setInterval(fetchStats, 60000); // Poll every minute
      return () => clearInterval(interval);
    }
  }, [userRole]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
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
                const hasNotification = item.path === '/escalation-log' && pendingEscalations > 0;
                
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors relative ${
                      isActive
                        ? "bg-black text-white"
                        : "text-gray-600 hover:text-black hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {hasNotification && (
                      <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {pendingEscalations > 9 ? '9+' : pendingEscalations}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-600 mr-4">
              {getRoleLabel()}
            </div>
            <Button onClick={handleLogout}>Logout</Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
