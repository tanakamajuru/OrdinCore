import { useEffect } from "react";
import { useNavigate } from "react-router";
import { RegisteredManagerDashboard } from "./RegisteredManagerDashboard";
import { ResponsibleIndividualDashboard } from "./ResponsibleIndividualDashboard";
import { DirectorDashboard } from "./DirectorDashboard";

export function RoleBasedDashboard() {
  const navigate = useNavigate();
  const userRole = (localStorage.getItem('userRole') || '').toUpperCase();

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
    case 'REGISTERED_MANAGER':
      return <RegisteredManagerDashboard />;
    case 'RESPONSIBLE_INDIVIDUAL':
      return <ResponsibleIndividualDashboard />;
    case 'DIRECTOR':
      return <DirectorDashboard />;
    default:
      return <RegisteredManagerDashboard />;
  }
}
