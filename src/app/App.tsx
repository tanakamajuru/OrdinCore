import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { GovernancePulse } from "./components/GovernancePulse";
import { WeeklyReview } from "./components/WeeklyReview";
import { RiskRegister } from "./components/RiskRegister";
import { RiskDetail } from "./components/RiskDetail";
import { EscalationLog } from "./components/EscalationLog";
import { Trends } from "./components/Trends";
import { Profile } from "./components/Profile";
import { MonthlyReport } from "./components/MonthlyReport";
import { Reports } from "./components/Reports";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/governance-pulse" element={<GovernancePulse />} />
        <Route path="/weekly-review" element={<WeeklyReview />} />
        <Route path="/risk-register" element={<RiskRegister />} />
        <Route path="/risk-register/:id" element={<RiskDetail />} />
        <Route path="/escalation-log" element={<EscalationLog />} />
        <Route path="/trends" element={<Trends />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/monthly-report" element={<MonthlyReport />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
