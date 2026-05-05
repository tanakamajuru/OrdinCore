import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { Home, Activity, FileText, AlertTriangle, TrendingUp, User, FileDown, BarChart3, Eye, Ambulance, Settings, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./ui/button";
import { apiClient } from "@/services/api";
import { ThemeToggle } from "./ThemeToggle";
import logo from "./images/logo.png";

export function RoleBasedNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoading: isAuthLoading } = useAuth();
  
  // Use user state if available, fallback to localStorage for immediate UI stability
  const rawRole = user?.role || localStorage.getItem('userRole') || '';
  const userRole = rawRole.toUpperCase();
  
  const firstName = user?.first_name || '';
  const lastName = user?.last_name || '';
  const displayName = user?.name || (firstName || lastName ? `${firstName} ${lastName}`.trim() : localStorage.getItem('userName')) || 'User';
  
  const userAvatar = (user as any)?.profile?.avatar_url || user?.profile_picture;

  const getNavigationItems = () => {
    switch (userRole) {
      case 'ADMIN':
        return [
          { path: "/admin-dashboard", label: "Admin Dashboard", icon: Settings },
          { path: "/governance-pulse", label: "Governance Pulse", icon: Activity },
          { path: "/risk-register", label: "Risk Management", icon: AlertTriangle },
          { path: "/incidents", label: "Serious Incidents", icon: Ambulance },
          { path: "/reports", label: "Reports", icon: FileDown },
        ];

      case 'REGISTERED_MANAGER':
        return [
          { path: "/dashboard", label: "Dashboard", icon: Home },
          { path: "/oversight-board", label: "Oversight Board", icon: Shield },
          { path: "/governance-pulse", label: "Governance Pulse", icon: Activity },
          { path: "/risk-register", label: "Risk Management", icon: AlertTriangle },
          { path: "/incidents", label: "Serious Incidents", icon: Ambulance },
          { path: "/reports", label: "Reports", icon: FileDown },
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
        ];

      case 'TEAM_LEADER':
        return [
          { path: "/dashboard", label: "Dashboard", icon: Home },
          { path: "/governance-pulse", label: "Governance Pulse", icon: Activity },
          { path: "/incidents", label: "Serious Incidents", icon: Ambulance },
          // { path: "/my-actions", label: "My Actions", icon: FileText },
        ];
 
      case 'DIRECTOR':
        return [
          { path: "/dashboard", label: "Strategic Dashboard", icon: Home },
          { path: "/incidents", label: "Serious Incidents", icon: Ambulance },
          { path: "/patterns", label: "Patterns", icon: Eye },
          { path: "/reports", label: "Reports", icon: FileDown },
          { path: "/trends", label: "Trend Monitoring", icon: BarChart3 },
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
      case 'TEAM_LEADER': return 'Team Leader';
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
    if (window.confirm("Are you sure you want to logout? Any unsaved changes may be lost.")) {
      logout();
      navigate('/login');
    }
  };


  return (
    <nav className="bg-card border-b-2 border-border fixed top-0 left-0 right-0 z-50">
      <div className="w-full px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-6 flex-1 min-w-0">
            <img src={logo} alt="Logo" className="h-20 w-auto" />
            <div className="text-xl  text-primary flex-shrink-0">OrdinCore</div>
            <div className="hidden md:flex space-x-1 overflow-x-auto no-scrollbar">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const hasNotification = item.path === '/escalation-log' && pendingEscalations > 0;

                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-md transition-colors relative whitespace-nowrap ${isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-primary hover:bg-muted"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {hasNotification && (
                      <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px]  w-4 h-4 rounded-full flex items-center justify-center">
                        {pendingEscalations > 9 ? '9+' : pendingEscalations}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4 flex-shrink-0 ml-4">
            <ThemeToggle />
            <div className="flex items-center gap-3 pr-4 border-r-2 border-border">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-sm  text-foreground leading-none">{displayName}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 ">{getRoleLabel()}</span>
              </div>
              <button 
                type="button"
                className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden bg-muted flex items-center justify-center cursor-pointer hover:border-primary-foreground/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={() => navigate('/profile')}
                title="View Profile"
              >
                {userAvatar ? (
                  <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </div>
            <Button variant="ghost" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={handleLogout}>Logout</Button>
          </div>
        </div>
      </div>
    </nav>
  );
}
