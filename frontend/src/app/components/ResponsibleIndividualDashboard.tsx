import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { Ambulance, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

export function ResponsibleIndividualDashboard() {
  const navigate = useNavigate();
  const { } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSites: 0,
    activeHighRisks: 0,
    pendingEscalations: 0,
    activeIncidents: 0
  });
  const [recentEscalations, setRecentEscalations] = useState<any[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [siteSummaries, setSiteSummaries] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      // Fetch all core resources in parallel
      const [housesRes, risksRes, incidentsRes, escalationsRes, pulsesRes] = await Promise.allSettled([
        apiClient.get('/houses?limit=100'),
        apiClient.get('/risks?status=open&severity=high&limit=100'),
        apiClient.get('/incidents?status=open&limit=100'),
        apiClient.get('/escalations?status=pending&limit=100'),
        apiClient.get('/governance/pulses?limit=50')
      ]);

      const houses = housesRes.status === 'fulfilled' ? ((housesRes.value.data as any).data || []) : [];
      const risks = risksRes.status === 'fulfilled' ? ((risksRes.value.data as any).data?.risks || (risksRes.value.data as any).data || []) : [];
      const incidents = incidentsRes.status === 'fulfilled' ? ((incidentsRes.value.data as any).data?.incidents || (incidentsRes.value.data as any).data || []) : [];
      const escalations = escalationsRes.status === 'fulfilled' ? ((escalationsRes.value.data as any).data?.escalations || (escalationsRes.value.data as any).data || []) : [];
      const pulses = pulsesRes.status === 'fulfilled' ? ((pulsesRes.value.data as any).data?.pulses || (pulsesRes.value.data as any).data || []) : [];

      // Calculate aggregated stats
      setStats({
        totalSites: houses.length,
        activeHighRisks: Array.isArray(risks) ? risks.length : 0,
        pendingEscalations: Array.isArray(escalations) ? escalations.length : 0,
        activeIncidents: Array.isArray(incidents) ? incidents.length : 0
      });

      // Map recent escalations
      if (Array.isArray(escalations)) {
        setRecentEscalations(escalations.slice(0, 5).map((e: any) => ({
          risk: e.risk_title || e.description || 'Unnamed Risk',
          house: houses.find((h: any) => h.id === e.house_id)?.name || 'Unknown Site',
          escalatedDate: new Date(e.created_at).toLocaleDateString('en-GB'),
          status: e.priority || 'Medium'
        })));
      }

      // Map recent incidents
      if (Array.isArray(incidents)) {
        setRecentIncidents(incidents.slice(0, 5).map((i: any) => ({
          id: i.id,
          house: houses.find((h: any) => h.id === i.house_id)?.name || 'Unknown Site',
          type: i.severity,
          date: new Date(i.occurred_at).toLocaleDateString('en-GB'),
          status: i.status
        })));
      }

      // Build site summaries
      if (Array.isArray(houses)) {
        const summaries = houses.map((house: any) => {
          const houseRisks = Array.isArray(risks) ? risks.filter((r: any) => r.house_id === house.id).length : 0;
          const houseEscalations = Array.isArray(escalations) ? escalations.filter((e: any) => e.house_id === house.id).length : 0;
          const lastPulse = Array.isArray(pulses) ? pulses.find((p: any) => p.house_id === house.id) : null;
          
          return {
            house: house.name,
            highRisks: houseRisks,
            escalations: houseEscalations,
            lastPulse: lastPulse ? new Date(lastPulse.completed_at || lastPulse.due_date).toLocaleDateString('en-GB') : 'No pulses yet'
          };
        });
        setSiteSummaries(summaries.slice(0, 5));
      }

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

  const crossSiteSnapshot = [
    { label: "Total Sites", value: stats.totalSites.toString() },
    { label: "Active High Risks", value: stats.activeHighRisks.toString() },
    { label: "Pending Escalations", value: stats.pendingEscalations.toString() },
    { label: "Active Incidents", value: stats.activeIncidents.toString() },
  ];

  const escalatedRisks = recentEscalations;
  const activeIncidents = recentIncidents;
  const siteSummariesArr = siteSummaries;

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
                {escalatedRisks.length > 0 ? escalatedRisks.map((risk, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-black">{risk.risk}</p>
                        <p className="text-sm text-gray-600">{risk.house}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-600">{risk.escalatedDate}</span>
                        <p className="text-sm font-medium text-black capitalize">{risk.status}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-center py-4 text-gray-500 border border-dashed border-gray-300">No pending escalations</p>
                )}
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
                {siteSummariesArr.length > 0 ? siteSummariesArr.map((site: any, idx: number) => (
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
                )) : (
                  <p className="text-center py-4 text-gray-500 border border-dashed border-gray-300">No sites found</p>
                )}
              </div>
            </div>

            {/* Active Incidents */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Active Serious Incidents</h2>
              <div className="space-y-3">
                {activeIncidents.length > 0 ? activeIncidents.map((incident, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-black">{incident.id.split('-')[0]}...</p>
                        <p className="text-sm text-gray-600">{incident.house} - {incident.type}</p>
                        <p className="text-xs text-gray-500">{incident.date}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded capitalize ${
                          incident.status === 'under_review' 
                            ? 'bg-black text-white' 
                            : 'bg-gray-200 text-gray-800'
                        }`}>
                          {incident.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-center py-4 text-gray-500 border border-dashed border-gray-300">No active incidents</p>
                )}
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
