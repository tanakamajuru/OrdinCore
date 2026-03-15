import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider } from "@/hooks/useAuth";
import { Login } from "./components/Login";
import { ForgottenPassword } from "./components/ForgottenPassword";
import { Dashboard } from "./components/Dashboard";
import { RoleBasedDashboard } from "./components/RoleBasedDashboard";
import { GovernancePulse } from "./components/GovernancePulse";
import { WeeklyReview } from "./components/WeeklyReview";
import { RiskRegister } from "./components/RiskRegister";
import { RiskDetail } from "./components/RiskDetail";
import { EscalationLog } from "./components/EscalationLog";
import { Trends } from "./components/Trends";
import { Profile } from "./components/Profile";
import { MonthlyReport } from "./components/MonthlyReport";
import { Reports } from "./components/Reports";
import { IncidentCaseHub } from "./components/IncidentCaseHub";
import { GovernanceTimeline } from "./components/GovernanceTimeline";
import { ReconstructionReport } from "./components/ReconstructionReport";
import { CrossHousePatternDetection } from "./components/CrossHousePatternDetection";
import AdminDashboard from "./components/AdminDashboard";
import AdminDashboardSimple from "./components/AdminDashboardSimple";
import AdminUserManagement from "./components/AdminUserManagement";
import AdminHouseManagement from "./components/AdminHouseManagement";
import AdminPulseManagement from "./components/AdminPulseManagement";
import AdminRiskManagement from "./components/AdminRiskManagement";
import AdminSettings from "./components/AdminSettings";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import EngineDashboardComponent from "@/components/EngineDashboard";

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('authToken');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

// Super Admin Only Route
const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('authToken');
  const role = (localStorage.getItem('userRole') || '').toUpperCase();
  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'SUPER_ADMIN') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgotten-password" element={<ForgottenPassword />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <RoleBasedDashboard />
            </ProtectedRoute>
          } />
          <Route path="/super-admin" element={
            <SuperAdminRoute>
              <SuperAdminDashboard />
            </SuperAdminRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin-dashboard" element={
            <ProtectedRoute>
              <AdminDashboardSimple />
            </ProtectedRoute>
          } />
          <Route path="/admin-users" element={
            <ProtectedRoute>
              <AdminUserManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin-houses" element={
            <ProtectedRoute>
              <AdminHouseManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin-pulses" element={
            <ProtectedRoute>
              <AdminPulseManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin-risks" element={
            <ProtectedRoute>
              <AdminRiskManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin-settings" element={
            <ProtectedRoute>
              <AdminSettings />
            </ProtectedRoute>
          } />
          <Route path="/governance-pulse" element={
            <ProtectedRoute>
              <GovernancePulse />
            </ProtectedRoute>
          } />
          <Route path="/weekly-review" element={
            <ProtectedRoute>
              <WeeklyReview />
            </ProtectedRoute>
          } />
          <Route path="/risk-register" element={
            <ProtectedRoute>
              <RiskRegister />
            </ProtectedRoute>
          } />
          <Route path="/risk-register/:id" element={
            <ProtectedRoute>
              <RiskDetail />
            </ProtectedRoute>
          } />
          <Route path="/escalation-log" element={
            <ProtectedRoute>
              <EscalationLog />
            </ProtectedRoute>
          } />
          <Route path="/trends" element={
            <ProtectedRoute>
              <Trends />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/monthly-report" element={
            <ProtectedRoute>
              <MonthlyReport />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/incidents" element={
            <ProtectedRoute>
              <IncidentCaseHub />
            </ProtectedRoute>
          } />
          <Route path="/incidents/:id" element={
            <ProtectedRoute>
              <IncidentCaseHub />
            </ProtectedRoute>
          } />
          <Route path="/incidents/:id/timeline" element={
            <ProtectedRoute>
              <GovernanceTimeline />
            </ProtectedRoute>
          } />
          <Route path="/incidents/:id/report" element={
            <ProtectedRoute>
              <ReconstructionReport />
            </ProtectedRoute>
          } />
          <Route path="/patterns" element={
            <ProtectedRoute>
              <CrossHousePatternDetection />
            </ProtectedRoute>
          } />
          <Route path="/engines" element={
            <ProtectedRoute>
              <EngineDashboardComponent />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
