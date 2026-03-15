import { useState, useEffect } from "react";
import { Navigation } from "./Navigation";
import { useNavigate } from "react-router";
import { dashboardApi, DashboardData } from "@/services/dashboardApi";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pulseStatus, setPulseStatus] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
    loadPulseStatus();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await dashboardApi.getDashboardData(user?.role || 'registered-manager');
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPulseStatus = async () => {
    try {
      const status = await dashboardApi.getPulseStatus();
      setPulseStatus(status);
    } catch (error) {
      console.error('Failed to load pulse status:', error);
    }
  };

  const formatNumber = (num: number) => {
    return num.toString();
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const getTodayPulseStatus = () => {
    if (!pulseStatus) return { status: 'loading', message: 'Loading...' };
    
    const today = new Date().toISOString().split('T')[0];
    const todayPulse = pulseStatus.siteStatuses.find(site => {
      const pulseDate = new Date(site.currentPeriod.requiredDate).toISOString().split('T')[0];
      return pulseDate === today;
    });

    if (!todayPulse) {
      return { status: 'not_required', message: 'No pulse required today' };
    }

    switch (todayPulse.status) {
      case 'completed':
        return { status: 'completed', message: 'Completed today' };
      case 'pending':
        return { status: 'pending', message: 'Not yet started' };
      case 'missed':
        return { status: 'missed', message: `Missed (${todayPulse.daysSinceRequired} days ago)` };
      case 'overdue':
        return { status: 'overdue', message: `Overdue (${todayPulse.daysSinceRequired} days ago)` };
      default:
        return { status: 'unknown', message: 'Status unknown' };
    }
  };

  const getTodayPulseButtonColor = () => {
    const status = getTodayPulseStatus();
    switch (status.status) {
      case 'completed':
        return 'bg-green-600 hover:bg-green-700';
      case 'pending':
        return 'bg-black hover:bg-gray-800';
      case 'missed':
      case 'overdue':
        return 'bg-red-600 hover:bg-red-700';
      default:
        return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  const getTodayPulseButtonText = () => {
    const status = getTodayPulseStatus();
    switch (status.status) {
      case 'completed':
        return 'View Pulse';
      case 'pending':
        return 'Start Pulse';
      case 'missed':
      case 'overdue':
        return 'Complete Missed Pulse';
      default:
        return 'View Pulse';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const weeklySnapshot = dashboardData ? [
    { label: "Active Risks", value: formatNumber(dashboardData.overview.activeRisks) },
    { label: "High Priority", value: formatNumber(dashboardData.overview.highPriorityRisks) },
    { label: "Escalations", value: formatNumber(dashboardData.overview.totalEscalations) },
    { label: "Compliance", value: formatPercentage(dashboardData.overview.complianceRate) },
  ] : [];

  const activeHighRisks = dashboardData?.recentActivities
    .filter(activity => activity.type === 'risk' && activity.severity === 'high')
    .slice(0, 4)
    .map(activity => ({
      house: activity.house,
      description: activity.description,
      date: new Date(activity.timestamp).toLocaleDateString()
    })) || [];

  const escalationsThisWeek = dashboardData?.recentActivities
    .filter(activity => activity.type === 'escalated')
    .slice(0, 3)
    .map(activity => ({
      date: new Date(activity.timestamp).toLocaleDateString(),
      house: activity.house,
      risk: activity.description
    })) || [];

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-black">Governance Overview</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user?.name}. Here's your governance overview for {new Date().toLocaleDateString()}.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Today's Governance Pulse */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Today's Governance Pulse</h2>
              <div className="mb-4">
                <p className="text-gray-600">Status: {getTodayPulseStatus().message}</p>
                {pulseStatus && (
                  <div className="mt-2 text-sm text-gray-500">
                    Overall Compliance: {formatPercentage(pulseStatus.overallCompliance)}
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate("/governance-pulse")}
                className={`w-full py-3 px-4 text-white transition-colors ${getTodayPulseButtonColor()}`}
              >
                {getTodayPulseButtonText()}
              </button>
            </div>

            {/* Weekly Snapshot Summary */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Weekly Snapshot Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                {weeklySnapshot.map((stat) => (
                  <div key={stat.label} className="border border-gray-300 p-4">
                    <span className="block text-sm text-gray-600 mb-1">{stat.label}</span>
                    <span className="text-xl font-semibold text-black">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Active High Risks */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Active High Risks</h2>
              <div className="space-y-2">
                {activeHighRisks.length > 0 ? (
                  activeHighRisks.map((risk, idx) => (
                    <div
                      key={idx}
                      onClick={() => navigate("/risk-register")}
                      className="p-3 border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-black font-medium">{risk.house}</p>
                          <p className="text-sm text-gray-600 truncate">{risk.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{risk.date}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No active high risks</p>
                )}
              </div>
            </div>

            {/* Escalations This Week */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Escalations This Week</h2>
              <div className="space-y-2">
                {escalationsThisWeek.length > 0 ? (
                  escalationsThisWeek.map((esc, idx) => (
                    <div
                      key={idx}
                      onClick={() => navigate("/escalation-log")}
                      className="p-3 border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm text-gray-600">{esc.date}</p>
                          <p className="text-black font-medium">{esc.house}</p>
                          <p className="text-sm text-gray-600 truncate">{esc.risk}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No escalations this week</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
