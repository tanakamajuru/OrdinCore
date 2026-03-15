import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { Ambulance, AlertTriangle, Plus } from "lucide-react";
import { dashboardApi, DashboardData } from "@/services/dashboardApi";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function ResponsibleIndividualDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await dashboardApi.getDashboardData('responsible-individual');
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

  const crossSiteSnapshot = [
    { label: "Total Sites", value: dashboardData.pulseStatus.totalSites?.toString() || "5" },
    { label: "Active High Risks", value: dashboardData.overview.highPriorityRisks?.toString() || "0" },
    { label: "Pending Escalations", value: dashboardData.escalationMetrics.pending?.toString() || "0" },
    { label: "Active Incidents", value: dashboardData.overview.activeRisks?.toString() || "0" },
  ];

  const escalatedRisks = dashboardData.recentActivities
    .filter((activity: any) => activity.type === 'escalation')
    .slice(0, 3)
    .map((risk: any) => ({
      house: risk.house || "Unknown",
      risk: risk.description,
      escalatedDate: risk.timestamp || new Date().toISOString().split('T')[0],
      status: risk.severity || "Pending"
    })) || [];

  const activeIncidents = dashboardData.recentActivities
    .filter((activity: any) => activity.type === 'incident')
    .slice(0, 5)
    .map((incident: any) => ({
      id: incident.id,
      house: incident.house || "Unknown",
      type: incident.severity,
      date: incident.timestamp || new Date().toISOString().split('T')[0],
      status: 'active'
    })) || [];

  const siteSummaries = dashboardData.recentActivities
    .filter((activity: any) => activity.house)
    .reduce((acc: any, activity: any) => {
      const house = activity.house;
      if (!acc[house]) {
        acc[house] = { house, highRisks: 0, escalations: 0, lastPulse: activity.timestamp };
      }
      if (activity.type === 'risk') acc[house].highRisks++;
      if (activity.type === 'escalation') acc[house].escalations++;
      return acc;
    }, {})
    .slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-white">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-black">Cross-Site Dashboard</h1>
          <p className="text-gray-600 mt-1">Aggregated view across all houses</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Cross-Site Snapshot */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Cross-Site Governance Snapshot</h2>
              <div className="space-y-3">
                {crossSiteSnapshot.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-black">{item.label}</span>
                    <span className="font-semibold text-black">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Escalations */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Pending Escalations</h2>
              <div className="space-y-3">
                {escalatedRisks.map((risk, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-black">{risk.risk}</p>
                        <p className="text-sm text-gray-600">{risk.house}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-600">{risk.escalatedDate}</span>
                        <p className="text-sm font-medium text-black">{risk.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate("/escalation-log")}
                className="w-full mt-4 py-2 px-4 bg-black text-white hover:bg-gray-800 transition-colors"
              >
                View All Escalations
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Site Summaries */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Site Summaries</h2>
              <div className="space-y-3">
                {siteSummaries.map((site, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-black">{site.house}</p>
                        <p className="text-sm text-gray-600">High Risks: {site.highRisks} | Escalations: {site.escalations}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-600">Last Pulse</span>
                        <p className="text-sm font-medium text-black">{site.lastPulse}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Incidents */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Active Serious Incidents</h2>
              <div className="space-y-3">
                {activeIncidents.map((incident, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-black">{incident.id}</p>
                        <p className="text-sm text-gray-600">{incident.house} - {incident.type}</p>
                        <p className="text-xs text-gray-500">{incident.date}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded ${
                          incident.status === 'under-review' 
                            ? 'bg-black text-white' 
                            : 'bg-gray-200 text-gray-800'
                        }`}>
                          {incident.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => navigate("/incidents")}
                  className="flex-1 py-2 px-4 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
                >
                  <Ambulance className="w-4 h-4 mr-2 inline" />
                  Manage All Incidents
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

            {/* Quick Actions */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/incidents")}
                  className="w-full py-3 px-4 bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  <Ambulance className="w-4 h-4 mr-2 inline" />
                  Manage Serious Incidents
                </button>
                <button
                  onClick={() => navigate("/escalation-log")}
                  className="w-full py-3 px-4 bg-black text-white hover:bg-gray-800 transition-colors"
                >
                  Review Escalations
                </button>
                <button
                  onClick={() => navigate("/reports")}
                  className="w-full py-3 px-4 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
                >
                  Generate Cross-Site Report
                </button>
                <button
                  onClick={() => navigate("/trends")}
                  className="w-full py-3 px-4 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
                >
                  View Trend Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
