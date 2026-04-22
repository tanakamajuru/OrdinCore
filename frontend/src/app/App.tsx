import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";
import { Login } from "./components/Login";
import { ForgottenPassword } from "./components/ForgottenPassword";
import { RoleBasedDashboard } from "./components/RoleBasedDashboard";
import { WeeklyReview } from "./components/WeeklyReview";
import { SignalCaptureForm } from "./components/SignalCaptureForm";
import { DailyOversightBoard } from "./components/DailyOversightBoard";
import { RiskRegister } from "./components/RiskRegister";
import { RiskPromotion } from "./components/RiskPromotion";
import { RiskDetail } from "./components/RiskDetail";
import { EscalationLog } from "./components/EscalationLog";
import { Trends } from "./components/Trends";
import { Profile } from "./components/Profile";
import { MonthlyReport } from "./components/MonthlyReport";
import { Reports } from "./components/Reports";
import { IncidentCaseHub } from "./components/IncidentCaseHub";
import { IncidentDetail } from "./components/IncidentDetail";
import { PulseDetail } from "./components/PulseDetail";
import { GovernanceTimeline } from "./components/GovernanceTimeline";
import { ReconstructionReport } from "./components/ReconstructionReport";
import { CrossHousePatternDetection } from "./components/CrossHousePatternDetection";
import { SignalDetail } from "./components/SignalDetail";
import AdminDashboard from "./components/AdminDashboard";
import AdminDashboardSimple from "./components/AdminDashboardSimple";
import AdminUserManagement from "./components/AdminUserManagement";
import AdminHouseManagement from "./components/AdminHouseManagement";
import AdminPulseManagement from "./components/AdminPulseManagement";
import AdminRiskManagement from "./components/AdminRiskManagement";
import AdminSettings from "./components/AdminSettings";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import { ComputationalEngines } from "./components/ComputationalEngines";

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
      <Toaster position="top-right" richColors />
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
              <SignalCaptureForm />
            </ProtectedRoute>
          } />
          <Route path="/governance-dashboard" element={
            <ProtectedRoute>
              <DailyOversightBoard />
            </ProtectedRoute>
          } />
          <Route path="/governance-pulse/:id" element={
            <ProtectedRoute>
              <PulseDetail />
            </ProtectedRoute>
          } />
          <Route path="/signals/:id" element={
            <ProtectedRoute>
              <SignalDetail />
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
          <Route path="/risks/promote" element={
            <ProtectedRoute>
              <RiskPromotion />
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
              <IncidentDetail />
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
              <ComputationalEngines />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
