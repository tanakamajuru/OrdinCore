import { Navigate, useParams, useLocation } from "react-router";

/**
 * Legacy/notification deep links point at /risks/:id (emitted by actions.controller
 * on action-complete / RM-decision notifications), but the canonical risk detail route
 * is /risk-register/:id — so those links currently 404. This resolves them, preserving
 * the id and any query string (e.g. a future ?section=effectiveness deep link).
 */
export function RiskLinkRedirect() {
  const { id } = useParams();
  const { search } = useLocation();
  return <Navigate to={`/risk-register/${id}${search}`} replace />;
}

export default RiskLinkRedirect;
