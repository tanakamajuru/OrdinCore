import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { Ambulance, Plus, AlertTriangle, Activity } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

interface House { id: string; name: string; address: string; }
interface Risk { id: string; title: string; severity: string; status: string; created_at: string; }
interface Incident { id: string; title: string; severity: string; status: string; occurred_at: string; }
interface PulseSummary { status: string; due_date: string; compliance_score: number | null; }

export function RegisteredManagerDashboard() {
  const navigate = useNavigate();
  const [house, setHouse] = useState<House | null>(null);
  const [todayPulse, setTodayPulse] = useState<PulseSummary | null>(null);
  const [highRisks, setHighRisks] = useState<Risk[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [weeklyStats, setWeeklyStats] = useState({ highRiskDays: 0, safeguardingDays: 0, escalations: 0, activeIncidents: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      // 1. Get user's assigned house
      const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
      const housesRes = await apiClient.get(`/users/${userId}/houses`);
      const housesData = (housesRes.data as any).data || (housesRes.data as any) || [];
      const myHouse: House = Array.isArray(housesData) ? housesData[0] : null;
      if (myHouse) {
        setHouse(myHouse);
        const hid = myHouse.id;

        // 2. Load in parallel: today's pulse, high risks, incidents, escalations
        const [pulsesRes, risksRes, incidentsRes, escalationsRes] = await Promise.allSettled([
          apiClient.get(`/governance/pulses?house_id=${hid}&limit=5`),
          apiClient.get(`/risks?house_id=${hid}&severity=high&status=open&limit=3`),
          apiClient.get(`/incidents?house_id=${hid}&status=open&limit=3`),
          apiClient.get(`/escalations?house_id=${hid}&status=open&limit=1`),
        ]);

        // Today's pulse
        if (pulsesRes.status === 'fulfilled') {
          const pulseData = (pulsesRes.value.data as any).data || (pulsesRes.value.data as any) || {};
          const pulses = pulseData.pulses || pulseData.items || (Array.isArray(pulseData) ? pulseData : []);
          const today = new Date().toDateString();
          const todayP = pulses.find((p: any) => new Date(p.due_date).toDateString() === today);
          setTodayPulse(todayP || pulses[0] || null);

          // Weekly stats from pulse history
          const completed = pulses.filter((p: any) => p.status === 'completed');
          setWeeklyStats(prev => ({ ...prev, safeguardingDays: completed.length }));
        }

        // High risks
        if (risksRes.status === 'fulfilled') {
          const rData = (risksRes.value.data as any).data || (risksRes.value.data as any) || {};
          const risks = rData.risks || rData.items || (Array.isArray(rData) ? rData : []);
          setHighRisks(risks.slice(0, 3));
          const totalHighRisks = (rData as any).total || risks.length;
          setWeeklyStats(prev => ({ ...prev, highRiskDays: totalHighRisks }));
        }

        // Incidents
        if (incidentsRes.status === 'fulfilled') {
          const iData = (incidentsRes.value.data as any).data || (incidentsRes.value.data as any) || {};
          const incs = iData.incidents || iData.items || (Array.isArray(iData) ? iData : []);
          setIncidents(incs.slice(0, 3));
          const totalIncidents = (iData as any).total || incs.length;
          setWeeklyStats(prev => ({ ...prev, activeIncidents: totalIncidents }));
        }

        // Escalations
        if (escalationsRes.status === 'fulfilled') {
          const eData = (escalationsRes.value.data as any).data || (escalationsRes.value.data as any) || {};
          const totalEscalations = (eData as any).total || (Array.isArray(eData) ? eData.length : 0);
          setWeeklyStats(prev => ({ ...prev, escalations: totalEscalations }));
        }
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
      toast.error('Some dashboard data failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  const getPulseStatusLabel = () => {
    if (!todayPulse) return { label: 'No pulse scheduled today', color: 'text-gray-500' };
    switch (todayPulse.status) {
      case 'completed': return { label: 'Completed ✓', color: 'text-success' };
      case 'in_progress': return { label: 'In Progress...', color: 'text-primary' };
      case 'overdue': return { label: 'Overdue — complete now', color: 'text-destructive' };
      default: return { label: 'Not yet started', color: 'text-muted-foreground' };
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const pulseStatus = getPulseStatusLabel();

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-primary">
            {house ? `${house.name} Dashboard` : 'Your House Dashboard'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {house ? house.address : 'Real-time overview of your house governance'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Today's Governance Pulse */}
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold text-primary">Today's Governance Pulse</h2>
              </div>
              <div className="mb-4">
                <p className={`font-medium ${pulseStatus.color}`}>{pulseStatus.label}</p>
                {todayPulse?.due_date && (
                  <p className="text-sm text-muted-foreground mt-1">Due: {formatDate(todayPulse.due_date)}</p>
                )}
                {todayPulse?.compliance_score !== null && todayPulse?.compliance_score !== undefined && (
                  <p className="text-sm text-muted-foreground mt-1">Last score: <span className="font-semibold">{todayPulse.compliance_score}%</span></p>
                )}
              </div>
              <button
                onClick={() => navigate("/governance-pulse")}
                className={`w-full py-3 px-4 transition-colors shadow-sm ${
                  todayPulse?.status === 'completed'
                    ? 'bg-muted text-muted-foreground hover:bg-muted/90'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {todayPulse?.status === 'completed' ? 'View Pulse' : 'Start Pulse'}
              </button>
            </div>

            {/* Weekly Governance Snapshot */}
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-primary">Weekly Governance Snapshot</h2>
              <div className="space-y-3">
                {[
                  { label: 'High Risk Cases', value: weeklyStats.highRiskDays },
                  { label: 'Pulses Completed', value: weeklyStats.safeguardingDays },
                  { label: 'Pending Escalations', value: weeklyStats.escalations },
                  { label: 'Active Incidents', value: weeklyStats.activeIncidents },
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-foreground">{item.label}</span>
                    <span className="font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active High Risk Cases */}
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <h2 className="text-xl font-semibold text-primary">Active High Risk Cases</h2>
              </div>
              <div className="space-y-3">
                {highRisks.length > 0 ? highRisks.map((risk) => (
                  <div key={risk.id} className="border-b border-border pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-foreground">{risk.title}</p>
                        <p className="text-sm text-muted-foreground capitalize">{risk.severity} severity</p>
                      </div>
                      <span className="text-sm text-muted-foreground">{formatDate(risk.created_at)}</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-success text-center py-4 border border-dashed border-border">No high risk cases — well done!</p>
                )}
              </div>
              <button
                onClick={() => navigate("/risk-register")}
                className="w-full mt-4 py-2 px-4 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors"
              >
                View All Risks
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* House Incidents */}
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-primary">House Incidents</h2>
              <div className="space-y-3">
                {incidents.length > 0 ? incidents.map((inc) => (
                  <div key={inc.id} className="border-b border-border pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-foreground">{inc.title}</p>
                        <p className="text-sm text-muted-foreground capitalize">{inc.severity}</p>
                        <p className="text-sm text-muted-foreground">{formatDate(inc.occurred_at)}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded shadow-sm ${
                        inc.status === 'under_review' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {inc.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4 text-muted-foreground border border-dashed border-border">No active incidents for your house</div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => navigate("/incidents")}
                  className="flex-1 py-2 px-4 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors"
                >
                  <Ambulance className="w-4 h-4 mr-2 inline" />
                  Manage Incidents
                </button>
                <button
                  onClick={() => navigate("/incidents")}
                  className="flex-1 py-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Add Incident
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-primary">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/governance-pulse")}
                  className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Complete Governance Pulse
                </button>
                <button
                  onClick={() => navigate("/risk-register")}
                  className="w-full py-3 px-4 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors shadow-sm"
                >
                  Add New Risk
                </button>
                <button
                  onClick={() => navigate("/reports")}
                  className="w-full py-3 px-4 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors shadow-sm"
                >
                  Generate Report
                </button>
                <button
                  onClick={() => navigate("/incidents")}
                  className="w-full py-3 px-4 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors shadow-sm"
                >
                  Record Serious Incident
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
