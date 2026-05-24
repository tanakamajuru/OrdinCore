import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { 
  Activity, 
  ShieldAlert, 
  BarChart3, 
  LayoutGrid, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Clock,
  UserCheck
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function ResponsibleIndividualDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  // Pagination states
  const [pageA, setPageA] = useState(1);
  const [pageB, setPageB] = useState(1);
  const [pageC, setPageC] = useState(1);
  const [pageD, setPageD] = useState(1);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/ri-governance/dashboard/overview');
      setData(res.data);
    } catch (error) {
      console.error('Failed to load RI dashboard data:', error);
      toast.error('Failed to load assurance data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (incidentId: string) => {
    try {
        await apiClient.post(`/ri-governance/incidents/${incidentId}/acknowledge`, {
            acknowledgement_text: "Reviewed and accepted RM mitigation plan.",
            is_statutory_notification: true
        });
        toast.success("Incident acknowledged and signed off");
        loadDashboardData();
    } catch (err) {
        toast.error("Failed to acknowledge incident");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-xs  uppercase tracking-widest text-muted-foreground">Loading Assurance Telemetry...</p>
        </div>
      </div>
    );
  }

  // Memoized/derived calculations for pagination
  const heatmapSites = data?.heatmap?.reduce((acc: any[], curr: any) => {
      const existing = acc.find(h => h.house_id === curr.house_id);
      if (existing) {
          existing.days.push(curr);
      } else {
          acc.push({ house_id: curr.house_id, house_name: curr.house_name, days: [curr] });
      }
      return acc;
  }, []) || [];
  const itemsPerPageA = 5;
  const totalPagesA = Math.ceil(heatmapSites.length / itemsPerPageA);
  const paginatedHeatmapSites = heatmapSites.slice((pageA - 1) * itemsPerPageA, pageA * itemsPerPageA);

  const ospLadderSites = data?.osp_ladder || [];
  const itemsPerPageB = 4;
  const totalPagesB = Math.ceil(ospLadderSites.length / itemsPerPageB);
  const paginatedOspLadderSites = ospLadderSites.slice((pageB - 1) * itemsPerPageB, pageB * itemsPerPageB);

  const effectivenessList = data?.effectiveness || [];
  const itemsPerPageC = 3;
  const totalPagesC = Math.ceil(effectivenessList.length / itemsPerPageC);
  const paginatedEffectivenessList = effectivenessList.slice((pageC - 1) * itemsPerPageC, pageC * itemsPerPageC);

  const seriousIncidents = data?.serious_incidents || [];
  const itemsPerPageD = 2;
  const totalPagesD = Math.ceil(seriousIncidents.length / itemsPerPageD);
  const paginatedSeriousIncidents = seriousIncidents.slice((pageD - 1) * itemsPerPageD, pageD * itemsPerPageD);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground">
      <RoleBasedNavigation />
      
      <div className="p-8 w-full pt-24 max-w-[1600px] mx-auto">
        {/* 4-Quadrant Grid */}
        <div className="grid grid-cols-2 gap-8">
          
          {/* QUADRANT A: Governance Compliance Heatmap */}
          <Card className="border-4 border-border rounded-none bg-card h-[520px] flex flex-col">
            <CardHeader className="border-b-2 border-border bg-muted/30">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <LayoutGrid className="w-6 h-6 text-primary" />
                    <span className="text-xl uppercase tracking-tighter">Quadrant A: Governance Heatmap</span>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Process Adherence</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-between overflow-hidden">
              <div className="overflow-x-auto flex-1">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-border">
                      <th className="py-2 text-left text-[10px] uppercase tracking-widest text-muted-foreground">Service Name</th>
                      <th className="py-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">D-1</th>
                      <th className="py-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">D-2</th>
                      <th className="py-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">D-3</th>
                      <th className="py-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">D-4</th>
                      <th className="py-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">D-5</th>
                      <th className="py-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">D-6</th>
                      <th className="py-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground">D-7</th>
                      <th className="py-2 text-center text-[10px] uppercase tracking-widest text-muted-foreground border-l-2 border-border pl-2">Weekly Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedHeatmapSites.map((site: any) => (
                      <tr key={site.house_id} className="group hover:bg-muted/50 transition-colors">
                        <td className="py-3 text-sm uppercase tracking-tighter">{site.house_name}</td>
                        {site.days.map((day: any, idx: number) => (
                          <td key={idx} className="py-3 text-center">
                            <div className={`w-3 h-3 mx-auto rounded-none border border-border ${
                                day.daily_status === 'completed' ? 'bg-success' : 'bg-destructive'
                            }`} />
                          </td>
                        ))}
                        <td className="py-3 text-center border-l-2 border-border">
                            <div className={`w-3 h-3 mx-auto rounded-none border border-border ${
                                site.days[0]?.weekly_completed_this_week ? 'bg-success' : 'bg-muted'
                            }`} title={site.days[0]?.weekly_completed_this_week ? 'Weekly Review Completed' : 'Weekly Review Pending'} />
                        </td>
                      </tr>
                    ))}
                    {paginatedHeatmapSites.length === 0 && (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-xs text-muted-foreground">
                          No site adherence data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalPagesA > 1 && (
                <div className="flex justify-between items-center mt-4 pt-2 border-t border-border">
                  <button 
                    disabled={pageA === 1}
                    onClick={() => setPageA(prev => prev - 1)}
                    className="px-3 py-1.5 text-xs border-2 border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">Page {pageA} of {totalPagesA}</span>
                  <button 
                    disabled={pageA === totalPagesA}
                    onClick={() => setPageA(prev => prev + 1)}
                    className="px-3 py-1.5 text-xs border-2 border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QUADRANT B: Overall Service Position (OSP) Ladder */}
          <Card className="border-4 border-border rounded-none bg-card h-[520px] flex flex-col">
            <CardHeader className="border-b-2 border-border bg-muted/30">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Activity className="w-6 h-6 text-primary" />
                        <span className="text-xl uppercase tracking-tighter">Quadrant B: OSP Ladder</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Site Ranking</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-between overflow-hidden">
              <div className="space-y-4 flex-1 overflow-y-auto pr-1">
                {paginatedOspLadderSites.map((site: any) => (
                  <div 
                    key={site.house_id}
                    onClick={() => navigate(`/ri-governance/houses/${site.house_id}/evidence-pack`)}
                    className="group border-2 border-border p-4 flex justify-between items-center hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer hover:shadow-none translate-x-[-2px] translate-y-[-2px] hover:translate-x-0 hover:translate-y-0"
                  >
                    <div>
                      <h3 className="text-lg uppercase tracking-tighter">{site.house_name}</h3>
                      <div className="flex gap-2 items-center mt-1">
                        <span className={`text-[10px] px-2 py-0.5 uppercase border border-current ${
                            site.overall_position === 'Stable' ? 'text-success' : 
                            site.overall_position === 'Watch' ? 'text-warning' : 'text-destructive'
                        }`}>
                            {site.overall_position || 'No Review'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Rank: {site.position_rank}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <ArrowUpRight className="w-5 h-5 text-success group-hover:text-success-foreground" />
                        <span className="text-[10px] uppercase mt-1">Evidence Pack</span>
                    </div>
                  </div>
                ))}
                {paginatedOspLadderSites.length === 0 && (
                  <div className="text-center py-10 border-2 border-dashed border-border">
                    <p className="text-[10px] uppercase text-muted-foreground">No site positions reviewed</p>
                  </div>
                )}
              </div>

              {totalPagesB > 1 && (
                <div className="flex justify-between items-center mt-4 pt-2 border-t border-border">
                  <button 
                    disabled={pageB === 1}
                    onClick={() => setPageB(prev => prev - 1)}
                    className="px-3 py-1.5 text-xs border-2 border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">Page {pageB} of {totalPagesB}</span>
                  <button 
                    disabled={pageB === totalPagesB}
                    onClick={() => setPageB(prev => prev + 1)}
                    className="px-3 py-1.5 text-xs border-2 border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QUADRANT C: Action Effectiveness Trends */}
          <Card className="border-4 border-border rounded-none bg-card h-[520px] flex flex-col">
            <CardHeader className="border-b-2 border-border bg-muted/30">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="w-6 h-6 text-primary" />
                        <span className="text-xl uppercase tracking-tighter">Quadrant C: Effectiveness Trends</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Domain Analysis</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col justify-between overflow-hidden">
              <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                {paginatedEffectivenessList.map((domain: any) => {
                  const total = parseInt(domain.effective_count) + parseInt(domain.neutral_count) + parseInt(domain.ineffective_count);
                  const effectivePct = (parseInt(domain.effective_count) / total) * 100;
                  const neutralPct = (parseInt(domain.neutral_count) / total) * 100;
                  const ineffectivePct = (parseInt(domain.ineffective_count) / total) * 100;

                  return (
                    <div key={domain.category_id}>
                      <div className="flex justify-between text-[10px] uppercase mb-2 tracking-widest">
                        <span>{domain.domain}</span>
                        <span className="text-muted-foreground">{total} MEASUREMENTS</span>
                      </div>
                      <div className="w-full h-8 flex border-2 border-border">
                        <div style={{ width: `${effectivePct}%` }} className="bg-success h-full flex items-center justify-center text-[10px] text-primary-foreground">{effectivePct > 10 && 'EFF'}</div>
                        <div style={{ width: `${neutralPct}%` }} className="bg-muted h-full flex items-center justify-center text-[10px] text-muted-foreground">{neutralPct > 10 && 'NEU'}</div>
                        <div style={{ width: `${ineffectivePct}%` }} className="bg-destructive h-full flex items-center justify-center text-[10px] text-primary-foreground">{ineffectivePct > 10 && 'INE'}</div>
                      </div>
                    </div>
                  );
                })}
                {effectivenessList.length === 0 && (
                    <div className="text-center py-10 border-2 border-dashed border-border">
                        <p className="text-[10px] uppercase text-muted-foreground">Insufficient effectiveness data collected</p>
                    </div>
                )}
              </div>

              {totalPagesC > 1 && (
                <div className="flex justify-between items-center mt-4 pt-2 border-t border-border">
                  <button 
                    disabled={pageC === 1}
                    onClick={() => setPageC(prev => prev - 1)}
                    className="px-3 py-1.5 text-xs border-2 border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">Page {pageC} of {totalPagesC}</span>
                  <button 
                    disabled={pageC === totalPagesC}
                    onClick={() => setPageC(prev => prev + 1)}
                    className="px-3 py-1.5 text-xs border-2 border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* QUADRANT D: Serious Incidents & Statutory Sign-Off */}
          <Card className="border-4 border-border rounded-none bg-card overflow-hidden h-[520px] flex flex-col">
            <CardHeader className="border-b-2 border-border bg-destructive/10">
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-destructive">
                        <AlertCircle className="w-6 h-6" />
                        <span className="text-xl uppercase tracking-tighter">Quadrant D: Serious Incidents</span>
                    </div>
                    <span className="bg-destructive text-primary-foreground text-[10px] px-2 py-0.5 uppercase tracking-widest animate-pulse">Statutory Sign-Off Required</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col justify-between overflow-hidden">
              <div className="divide-y-2 divide-black flex-1 overflow-y-auto">
                {paginatedSeriousIncidents.length > 0 ? paginatedSeriousIncidents.map((incident: any) => (
                  <div key={incident.id} className="p-6 bg-card hover:bg-muted/30 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="max-w-[70%]">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 uppercase">{incident.house_name}</span>
                            <span className="text-[10px] uppercase text-destructive tracking-widest">{incident.severity}</span>
                        </div>
                        <h4 className="text-lg leading-tight uppercase tracking-tighter">{incident.title}</h4>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{incident.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-[10px] uppercase text-muted-foreground mb-1">
                            <Clock className="w-3 h-3" />
                            {new Date(incident.occurred_at).toLocaleDateString('en-GB')}
                        </div>
                        <span className="text-[9px] uppercase block text-muted-foreground tracking-tighter">ID: {incident.id.split('-')[0]}...</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => handleAcknowledge(incident.id)}
                            className="flex-1 bg-primary text-primary-foreground py-3 px-4 text-xs uppercase tracking-widest hover:bg-success hover:text-primary-foreground transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <UserCheck className="w-4 h-4" />
                            Acknowledge Sign-Off
                        </button>
                        <button 
                            onClick={() => navigate(`/incidents/${incident.id}`)}
                            className="bg-card border-2 border-border py-3 px-6 text-xs uppercase tracking-widest hover:bg-muted transition-all cursor-pointer"
                        >
                            Forensics
                        </button>
                    </div>
                  </div>
                )) : (
                  <div className="p-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
                    <p className="text-[10px] uppercase text-muted-foreground tracking-widest">No outstanding statutory sign-offs</p>
                  </div>
                )}
              </div>

              {totalPagesD > 1 && (
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-border p-4 bg-muted/30">
                  <button 
                    disabled={pageD === 1}
                    onClick={() => setPageD(prev => prev - 1)}
                    className="px-3 py-1.5 text-xs border-2 border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">Page {pageD} of {totalPagesD}</span>
                  <button 
                    disabled={pageD === totalPagesD}
                    onClick={() => setPageD(prev => prev + 1)}
                    className="px-3 py-1.5 text-xs border-2 border-border bg-card text-foreground hover:bg-muted disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
