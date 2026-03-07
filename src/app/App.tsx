import { BrowserRouter, Routes, Route, Navigate } from "react-router";
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

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const userRole = localStorage.getItem('userRole');
  return userRole ? <>{children}</> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
