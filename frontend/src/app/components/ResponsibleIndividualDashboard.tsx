import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { Ambulance, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

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
        apiClient.get('/risks?status=Open&severity=high&limit=100'),
        apiClient.get('/incidents?status=Open,In Progress&limit=100'),
        apiClient.get('/escalations?status=Pending&limit=100'),
        apiClient.get('/governance/pulses?limit=50')
      ]);

      const houses = housesRes.status === 'fulfilled' ? ((housesRes.value as any).data || housesRes.value || []) : [];
      const risks = risksRes.status === 'fulfilled' ? ((risksRes.value as any).data?.risks || (risksRes.value as any).data || risksRes.value || []) : [];
      const incidents = incidentsRes.status === 'fulfilled' ? ((incidentsRes.value as any).data?.incidents || (incidentsRes.value as any).data || incidentsRes.value || []) : [];
      const escalations = escalationsRes.status === 'fulfilled' ? ((escalationsRes.value as any).data?.escalations || (escalationsRes.value as any).data || escalationsRes.value || []) : [];
      const pulses = pulsesRes.status === 'fulfilled' ? ((pulsesRes.value as any).data?.pulses || (pulsesRes.value as any).data || pulsesRes.value || []) : [];

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
        const summaries = await Promise.all(houses.map(async (house: any) => {
          const houseRisks = Array.isArray(risks) ? risks.filter((r: any) => r.house_id === house.id).length : 0;
          const houseEscalations = Array.isArray(escalations) ? escalations.filter((e: any) => e.house_id === house.id).length : 0;
          const lastPulse = Array.isArray(pulses) ? pulses.find((p: any) => p.house_id === house.id) : null;
          
          let narrativeDraft = "";
          try {
             const previewRes = await apiClient.get(`/weekly-reviews/preview?house_id=${house.id}&week_ending=${new Date().toISOString().split('T')[0]}`);
             narrativeDraft = previewRes.data?.data?.narrative_draft || "";
          } catch(err) {}

          return {
            id: house.id,
            house: house.name,
            highRisks: houseRisks,
            escalations: houseEscalations,
            lastPulse: lastPulse ? new Date(lastPulse.completed_at || lastPulse.due_date).toLocaleDateString('en-GB') : 'No pulses yet',
            narrativeDraft
          };
        }));
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
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
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-primary">Cross-Site Dashboard</h1>
          <p className="text-muted-foreground mt-1">Aggregated view across all houses</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Cross-Site Snapshot */}
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-primary">Cross-Site Governance Snapshot</h2>
              <div className="space-y-3">
                {crossSiteSnapshot.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-foreground">{item.label}</span>
                    <span className="font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Escalations */}
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-primary">Pending Escalations</h2>
              <div className="space-y-3">
                {escalatedRisks.length > 0 ? escalatedRisks.map((risk, idx) => (
                  <div key={idx} className="border-b border-border pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-foreground">{risk.risk}</p>
                        <p className="text-sm text-muted-foreground">{risk.house}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground">{risk.escalatedDate}</span>
                        <p className={`text-sm font-medium capitalize ${
                          risk.status.toLowerCase() === 'high' ? 'text-destructive' : 'text-warning'
                        }`}>{risk.status}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-center py-4 text-muted-foreground border border-dashed border-border">No pending escalations</p>
                )}
              </div>
              <button
                onClick={() => navigate("/escalation-log")}
                className="w-full mt-4 py-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                View All Escalations
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Site Summaries */}
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-primary">Site Summaries</h2>
              <div className="space-y-3">
                {siteSummariesArr.length > 0 ? siteSummariesArr.map((site: any, idx: number) => (
                  <div key={idx} className="border-b border-border pb-4 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-foreground">{site.house}</p>
                        <p className="text-sm text-muted-foreground">High Risks: {site.highRisks} | Escalations: {site.escalations}</p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-sm text-muted-foreground">Last Pulse: {site.lastPulse}</span>
                        <button 
                            onClick={() => navigate(`/reports?house_id=${site.id}&type=evidence`)}
                            className="mt-2 text-[10px] font-black uppercase bg-primary text-white px-2 py-1 hover:bg-black transition-all"
                        >
                            Evidence Pack
                        </button>
                      </div>
                    </div>
                    {site.narrativeDraft && (
                        <div className="bg-muted p-3 mt-3 border-l-2 border-primary text-xs italic text-muted-foreground font-medium">
                            <span className="block font-black uppercase not-italic text-[10px] text-foreground mb-1 tracking-widest">Narrative Draft</span>
                            {site.narrativeDraft}
                        </div>
                    )}
                  </div>
                )) : (
                  <p className="text-center py-4 text-muted-foreground border border-dashed border-border">No sites found</p>
                )}
              </div>
            </div>

            {/* Active Incidents */}
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-primary">Active Serious Incidents</h2>
              <div className="space-y-3">
                {activeIncidents.length > 0 ? activeIncidents.map((incident, idx) => (
                  <div key={idx} className="border-b border-border pb-3 last:border-b-0">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-foreground">{incident.id.split('-')[0]}...</p>
                        <p className="text-sm text-muted-foreground">{incident.house} - {incident.type}</p>
                        <p className="text-xs text-muted-foreground">{incident.date}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded shadow-sm ${
                          incident.status === 'In Progress' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {incident.status}
                        </span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-center py-4 text-muted-foreground border border-dashed border-border">No active incidents</p>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => navigate("/incidents")}
                  className="flex-1 py-2 px-4 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors"
                >
                  <Ambulance className="w-4 h-4 mr-2 inline" />
                  Manage All Incidents
                </button>
                <button
                  onClick={() => navigate("/incidents")}
                  className="flex-1 py-2 px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
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
                  onClick={() => navigate("/incidents")}
                  className="w-full py-3 px-4 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                >
                  <Ambulance className="w-4 h-4 mr-2 inline" />
                  Manage Serious Incidents
                </button>
                <button
                  onClick={() => navigate("/escalation-log")}
                  className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Review Escalations
                </button>
                <button
                  onClick={() => navigate("/reports")}
                  className="w-full py-3 px-4 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors"
                >
                  Generate Cross-Site Report
                </button>
                <button
                  onClick={() => navigate("/trends")}
                  className="w-full py-3 px-4 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors"
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
