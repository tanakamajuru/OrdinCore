import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "../hooks/useAuth";
import { Login } from "./components/Login";
import { ForgottenPassword } from "./components/ForgottenPassword";
import { ResetPassword } from "./components/ResetPassword";
import { RoleBasedDashboard } from "./components/RoleBasedDashboard";
import { WeeklyReview } from "./components/WeeklyReview";
import { ServiceReviewRollup } from "./components/ServiceReviewRollup";
import { EvidencePackViewer } from "./components/EvidencePackViewer";
import { SignalCaptureForm } from "./components/SignalCaptureForm";
import { DailyOversightBoard } from "./components/DailyOversightBoard";
import { RiskRegister } from "./components/RiskRegister";
import { ServiceUsers } from "./components/ServiceUsers";
import { GovernanceConfig } from "./components/GovernanceConfig";
import ImmediateRulesAdmin from "./components/ImmediateRulesAdmin";
import { IncidentReconstruction } from "./components/IncidentReconstruction";
import { Effectiveness } from "./components/Effectiveness";
import { RiskPromotion } from "./components/RiskPromotion";
import { RiskDetail } from "./components/RiskDetail";
import { RiskLinkRedirect } from "./components/RiskLinkRedirect";
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
import { AdminLayout } from "./components/AdminLayout";
import SuperAdminDashboard from "./components/SuperAdminDashboard";
import { ComputationalEngines } from "./components/ComputationalEngines";
import { PulseHistory } from "./components/PulseHistory";
import { MyActions } from "./components/MyActions";
import { AdminServiceUsers } from "./admin/ServiceUsers";

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Catch-all for unknown paths. An authenticated user hitting an unknown route
// should land on their dashboard, not be bounced to the Login page (which read
// as a surprise logout). Only unauthenticated users go to /login.
const NotFoundRedirect = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
};

// Super Admin Only Route
const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  const role = user?.role?.toUpperCase() || '';
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
          <Route path="/reset-password" element={<ResetPassword />} />
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
          <Route path="/super-admin/companies" element={
            <SuperAdminRoute>
              <SuperAdminDashboard />
            </SuperAdminRoute>
          } />
          <Route path="/super-admin/users" element={
            <SuperAdminRoute>
              <SuperAdminDashboard />
            </SuperAdminRoute>
          } />
          <Route path="/super-admin/settings" element={
            <SuperAdminRoute>
              <SuperAdminDashboard />
            </SuperAdminRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout><AdminDashboard /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin-dashboard" element={
            <ProtectedRoute>
              <AdminDashboardSimple />
            </ProtectedRoute>
          } />
          <Route path="/admin-users" element={
            <ProtectedRoute>
              <AdminLayout><AdminUserManagement /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin-houses" element={
            <ProtectedRoute>
              <AdminLayout><AdminHouseManagement /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/houses" element={
            <ProtectedRoute>
              <AdminLayout><AdminHouseManagement /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin-pulses" element={
            <ProtectedRoute>
              <AdminLayout><AdminPulseManagement /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin-risks" element={
            <ProtectedRoute>
              <AdminLayout><AdminRiskManagement /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin-settings" element={
            <ProtectedRoute>
              <AdminLayout><AdminSettings /></AdminLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/service-users" element={
            <ProtectedRoute>
              <AdminServiceUsers />
            </ProtectedRoute>
          } />
          <Route path="/governance-pulse" element={
            <ProtectedRoute>
              <SignalCaptureForm />
            </ProtectedRoute>
          } />
          <Route path="/pulse-history" element={
            <ProtectedRoute>
              <PulseHistory />
            </ProtectedRoute>
          } />
          <Route path="/my-actions" element={
            <ProtectedRoute>
              <MyActions />
            </ProtectedRoute>
          } />
          {/* /oversight-board retired — clusters consolidated to /patterns; its daily
              governance sign-off moved to /governance-dashboard and its RI-query channel
              to the RM dashboard. */}
          <Route path="/oversight-board" element={<Navigate to="/governance-dashboard" replace />} />
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
          <Route path="/signals" element={
            <ProtectedRoute>
              <PulseHistory />
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
          <Route path="/weekly-review/:id" element={
            <ProtectedRoute>
              <WeeklyReview />
            </ProtectedRoute>
          } />
          <Route path="/service-review-rollup" element={
            <ProtectedRoute>
              <ServiceReviewRollup />
            </ProtectedRoute>
          } />
          <Route path="/ri-governance/houses/:house_id/evidence-pack" element={
            <ProtectedRoute>
              <EvidencePackViewer />
            </ProtectedRoute>
          } />
          <Route path="/risk-register" element={
            <ProtectedRoute>
              <RiskRegister />
            </ProtectedRoute>
          } />
          <Route path="/service-users" element={
            <ProtectedRoute>
              <ServiceUsers />
            </ProtectedRoute>
          } />
          {/* Legacy clinical path — redirect to the anonymised "Service Users" view. */}
          <Route path="/patients" element={<Navigate to="/service-users" replace />} />
          <Route path="/governance-config" element={
            <ProtectedRoute>
              <GovernanceConfig />
            </ProtectedRoute>
          } />
          <Route path="/governance-config/immediate-rules" element={
            <ProtectedRoute>
              <ImmediateRulesAdmin />
            </ProtectedRoute>
          } />
          <Route path="/reconstruction" element={
            <ProtectedRoute>
              <IncidentReconstruction />
            </ProtectedRoute>
          } />
          <Route path="/effectiveness" element={
            <ProtectedRoute>
              <Effectiveness />
            </ProtectedRoute>
          } />
          <Route path="/risks/promote" element={
            <ProtectedRoute>
              <RiskPromotion />
            </ProtectedRoute>
          } />
          {/* Legacy/notification deep links: /risks/:id -> canonical /risk-register/:id.
              Static /risks/promote ranks above the param, so it is not shadowed. */}
          <Route path="/risks/:id" element={<RiskLinkRedirect />} />
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
          <Route path="*" element={<NotFoundRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
