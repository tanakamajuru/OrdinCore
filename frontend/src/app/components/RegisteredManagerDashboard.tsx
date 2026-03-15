import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { Ambulance, Plus } from "lucide-react";
import { dashboardApi, DashboardData } from "@/services/dashboardApi";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function RegisteredManagerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await dashboardApi.getDashboardData('registered-manager');
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center text-gray-500">
          Failed to load dashboard data
        </div>
      </div>
    );
  }

  const managerHouse = user?.assignedHouse || "Your House";

  const weeklySnapshot = [
    { label: "High Risk Days", value: dashboardData.overview.highPriorityRisks?.toString() || "0" },
    { label: "Safeguarding Days", value: dashboardData.overview.seriousIncidents?.toString() || "0" },
    { label: "Escalations", value: dashboardData.escalationMetrics.pending?.toString() || "0" },
    { label: "Active Incidents", value: dashboardData.overview.activeRisks?.toString() || "0" },
  ];

  const activeHighRisks = dashboardData.recentActivities
    .filter((activity: any) => activity.type === 'risk')
    .slice(0, 3)
    .map((risk: any) => ({
      house: risk.house || managerHouse,
      description: risk.description,
      date: risk.timestamp || new Date().toISOString().split('T')[0]
    })) || [];

  const houseIncidents = dashboardData.recentActivities
    .filter((activity: any) => activity.type === 'incident')
    .slice(0, 3)
    .map((incident: any) => ({
      id: incident.id,
      type: incident.severity,
      date: incident.timestamp || new Date().toISOString().split('T')[0],
      status: 'active'
    })) || [];

  const recentUpdates = dashboardData.recentActivities
    .slice(0, 4)
    .map((activity: any) => ({
      date: activity.timestamp || new Date().toISOString().split('T')[0],
      type: activity.type,
      house: activity.house || managerHouse,
      detail: activity.description
    })) || [];

  return (
    <div className="min-h-screen bg-white">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-black">{managerHouse} Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time overview of your house governance</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Today's Governance Pulse */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Today's Governance Pulse</h2>
              <div className="mb-4">
                <p className="text-gray-600">Status: Not yet started</p>
              </div>
              <button
                onClick={() => navigate("/governance-pulse")}
                className="w-full py-3 px-4 bg-black text-white hover:bg-gray-800 transition-colors"
              >
                Start Pulse
              </button>
            </div>

            {/* Weekly Governance Snapshot */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Weekly Governance Snapshot</h2>
              <div className="space-y-3">
                {weeklySnapshot.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-black">{item.label}</span>
                    <span className="font-semibold text-black">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active High Risk Cases */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Active High Risk Cases</h2>
              <div className="space-y-3">
                {activeHighRisks.map((risk, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-black">{risk.description}</p>
                        <p className="text-sm text-gray-600">{risk.house}</p>
                      </div>
                      <span className="text-sm text-gray-600">{risk.date}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate("/risk-register")}
                className="w-full mt-4 py-2 px-4 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
              >
                View All Risks
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* House Incidents */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">House Incidents</h2>
              <div className="space-y-3">
                {houseIncidents.map((incident, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-black">{incident.id}</p>
                        <p className="text-sm text-gray-600">{incident.type}</p>
                        <p className="text-sm text-gray-500">{incident.date}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        incident.status === 'under-review' 
                          ? 'bg-black text-white' 
                          : 'bg-gray-200 text-gray-800'
                      }`}>
                        {incident.status}
                      </span>
                    </div>
                  </div>
                ))}
                {houseIncidents.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No active incidents for your house
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => navigate("/incidents")}
                  className="flex-1 py-2 px-4 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
                >
                  <Ambulance className="w-4 h-4 mr-2 inline" />
                  Manage Incidents
                </button>
                <button
                  onClick={() => navigate("/incidents")}
                  className="flex-1 py-2 px-4 bg-black text-white hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Add Incident
                </button>
              </div>
            </div>

            {/* Recent Governance Updates */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Recent Governance Updates</h2>
              <div className="space-y-3">
                {recentUpdates.map((update, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-black">{update.type}</p>
                        <p className="text-sm text-gray-600">{update.detail}</p>
                        <p className="text-sm text-gray-600">{update.house}</p>
                      </div>
                      <span className="text-sm text-gray-600">{update.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/risk-register?addRisk=true")}
                  className="w-full py-3 px-4 bg-black text-white hover:bg-gray-800 transition-colors"
                >
                  Add New Risk
                </button>
                <button
                  onClick={() => navigate("/reports")}
                  className="w-full py-3 px-4 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
                >
                  Generate Report
                </button>
                <button
                  onClick={() => navigate("/incidents")}
                  className="w-full py-3 px-4 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
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
