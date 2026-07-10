import { useEffect } from "react";
import { useNavigate } from "react-router";
import { ResponsibleIndividualDashboard } from "./ResponsibleIndividualDashboard";
import { DirectorDashboard } from "./DirectorDashboard";
import { TeamLeaderDashboard } from "./TeamLeaderDashboard";
import { Rm5Interface } from "./Rm5Interface";
import { RegisteredManagerDashboard } from "./RegisteredManagerDashboard";

export function RoleBasedDashboard() {
  const navigate = useNavigate();
  const userRole = (localStorage.getItem('userRole') || '').toUpperCase().replace(/-/g, '_');

  useEffect(() => {
    if (!userRole) {
      navigate("/login");
    }
    // Super admin and company admin have dedicated portals
    if (userRole === 'SUPER_ADMIN') {
      navigate("/super-admin");
    } else if (userRole === 'ADMIN') {
      navigate("/admin-dashboard");
    }
  }, [userRole, navigate]);

  if (!userRole) return null;
  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') return null;

  switch (userRole) {
    case 'TEAM_LEADER':
      return <TeamLeaderDashboard />;
    case 'REGISTERED_MANAGER':
      // The RM lands on the metrics dashboard (live, system-wide cards). The 5-screen
      // pipeline spine remains available at /rm5.
      return <RegisteredManagerDashboard />;
    case 'RESPONSIBLE_INDIVIDUAL':
      return <ResponsibleIndividualDashboard />;
    case 'DIRECTOR':
      return <DirectorDashboard />;
    default:
      return <Rm5Interface initialScreen="today" />;
  }
}
