import { useEffect } from "react";
import { useNavigate, Navigate } from "react-router";
import { ResponsibleIndividualDashboard } from "./ResponsibleIndividualDashboard";
import { DirectorDashboard } from "./DirectorDashboard";
import { TeamLeaderDashboard } from "./TeamLeaderDashboard";
import { Rm5Interface } from "./Rm5Interface";

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
      navigate("/admin");
    }
  }, [userRole, navigate]);

  if (!userRole) return null;
  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') return null;

  switch (userRole) {
    case 'TEAM_LEADER':
      return <TeamLeaderDashboard />;
    case 'REGISTERED_MANAGER':
      // The RM lands on the 5-screen pipeline spine (Today as home).
      return <Rm5Interface initialScreen="today" />;
    case 'RESPONSIBLE_INDIVIDUAL':
      return <ResponsibleIndividualDashboard />;
    case 'DIRECTOR':
      return <DirectorDashboard />;
    case 'SUPPORT_WORKER':
      // Support Worker is mobile-first with no dedicated web dashboard. The previous fallthrough
      // to the RM 5-screen pipeline interface rendered RM-only data a Support Worker isn't
      // authorised to read, producing "Failed to load" and a nav with nothing in it (field report
      // 17-18 Oct 2026). Land them on the one read/evidence screen the backend already permits.
      return <Navigate to="/pulse-history" replace />;
    default:
      return <Rm5Interface initialScreen="today" />;
  }
}
