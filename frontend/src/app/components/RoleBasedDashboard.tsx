import { useEffect } from "react";
import { useNavigate } from "react-router";
import { RegisteredManagerDashboard } from "./RegisteredManagerDashboard";
import { ResponsibleIndividualDashboard } from "./ResponsibleIndividualDashboard";
import { DirectorDashboard } from "./DirectorDashboard";

export function RoleBasedDashboard() {
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    if (!userRole) {
      navigate("/login");
    }
  }, [userRole, navigate]);

  if (!userRole) {
    return null;
  }

  switch (userRole) {
    case 'registered-manager':
      return <RegisteredManagerDashboard />;
    case 'responsible-individual':
      return <ResponsibleIndividualDashboard />;
    case 'director':
      return <DirectorDashboard />;
    default:
      return <RegisteredManagerDashboard />;
  }
}
