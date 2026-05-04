import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { Shield, Ambulance, AlertTriangle, ArrowRight, Activity, Zap } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

export function RegisteredManagerDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [house, setHouse] = useState<any>(null);
  
  const [riskCandidates, setRiskCandidates] = useState<any[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
  const [riskStats, setRiskStats] = useState({ total: 0, critical: 0, high: 0 });
  const [incidentStats, setIncidentStats] = useState({ total: 0, open: 0 });

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : {};
      
      const housesRes = await apiClient.get(`/users/${user.id}/houses`);
      const houses = housesRes.data?.data || housesRes.data || [];
      const myHouse = houses[0];
      
      if (myHouse) {
        setHouse(myHouse);
        const hid = myHouse.id;

        const [candidatesRes, incidentsRes, risksRes] = await Promise.all([
          apiClient.get(`/governance/risk-candidates?house_id=${hid}&status=New&limit=3`),
          apiClient.get(`/incidents?house_id=${hid}&limit=5`),
          apiClient.get(`/risks?house_id=${hid}&status=Open`)
        ]);

        // Risk Candidates
        setRiskCandidates(candidatesRes.data?.data || (Array.isArray(candidatesRes.data) ? candidatesRes.data : []));

        // Incidents
        const incidentData = incidentsRes.data?.data || incidentsRes.data || [];
        setRecentIncidents(incidentData.slice(0, 3));
        setIncidentStats({
          total: incidentData.length,
          open: incidentData.filter((i: any) => i.status !== 'Resolved').length
        });

        // Risk Register Summary
        const riskData = risksRes.data?.data || risksRes.data || [];
        setRiskStats({
          total: riskData.length,
          critical: riskData.filter((r: any) => r.severity === 'Critical').length,
          high: riskData.filter((r: any) => r.severity === 'High').length
        });
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
      toast.error('Failed to load dashboard summaries');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
      <span className=" uppercase  tracking-tighter">Initializing RM Dashboard...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      
      <div className="p-6 pt-28 max-w-[95%] mx-auto">
        
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-4 border-primary pb-6">
          <div>
            <h1 className="text-4xl  text-primary tracking-tighter uppercase  leading-none"> Dashboard</h1>
            <p className="text-muted-foreground  mt-2 tracking-wide uppercase text-sm">
              Service: <span className="text-primary">{house?.name}</span> | Operational Overview
            </p>
          </div>
      
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Card 1: Risk Candidates */}
          <div className="bg-card border-4 border-border p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6 text-primary">
              <Shield size={24} />
              <h2 className="text-xl  uppercase  tracking-tighter">Emerging Risk Candidates</h2>
            </div>
            <div className="space-y-4 flex-1">
              {riskCandidates.length > 0 ? (
                riskCandidates.map(rc => (
                  <div 
                    key={rc.id} 
                    onClick={() => navigate(`/risks/promote?candidate_id=${rc.id}`)}
                    className="p-4 border-2 border-border bg-destructive/5 cursor-pointer hover:bg-destructive/10 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                       <span className="bg-destructive text-primary-foreground px-2 py-0.5 text-[9px]  uppercase  tracking-widest">
                         {rc.candidate_type}
                       </span>
                       <span className="text-[9px]  uppercase text-muted-foreground">
                         {new Date(rc.created_at).toLocaleDateString()}
                       </span>
                    </div>
                    <h3 className="text-sm  uppercase  tracking-tighter">{rc.risk_domain} Candidate</h3>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center border-2 border-dashed border-border text-muted-foreground uppercase text-xs">
                  No pending candidates
                </div>
              )}
            </div>
            <button 
              onClick={() => navigate('/oversight-board')}
              className="mt-6 w-full py-3 border-2 border-primary text-primary  uppercase  text-[10px] tracking-widest hover:bg-primary hover:text-primary-foreground transition-all"
            >
              View All Candidates
            </button>
          </div>

          {/* Card 2: Serious Incidents Summary */}
          <div className="bg-card border-4 border-border p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6 text-primary">
              <Ambulance size={24} />
              <h2 className="text-xl  uppercase  tracking-tighter">Serious Incidents</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-muted/30 p-4 border-2 border-border text-center">
                <span className="block text-[10px]  uppercase text-muted-foreground mb-1">Total Logs</span>
                <span className="text-2xl ">{incidentStats.total}</span>
              </div>
              <div className="bg-destructive/10 p-4 border-2 border-destructive/20 text-center">
                <span className="block text-[10px]  uppercase text-destructive mb-1">Open/Active</span>
                <span className="text-2xl  text-destructive">{incidentStats.open}</span>
              </div>
            </div>
            <div className="space-y-3 flex-1">
              <h3 className="text-[10px]  uppercase tracking-widest text-muted-foreground mb-2">Recent Notifications</h3>
              {recentIncidents.map(i => (
                <div key={i.id} onClick={() => navigate(`/incidents/${i.id}`)} className="p-3 border-2 border-border hover:bg-muted cursor-pointer transition-all">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs  ">{i.incident_type}</span>
                    <span className={`text-[8px]  uppercase px-1.5 py-0.5 ${i.status === 'Resolved' ? 'bg-success text-primary-foreground' : 'bg-warning text-foreground'}`}>
                      {i.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{i.description}</p>
                </div>
              ))}
            </div>
            <button 
              onClick={() => navigate('/incidents')}
              className="mt-6 w-full py-3 border-2 border-primary text-primary  uppercase  text-[10px] tracking-widest hover:bg-primary hover:text-primary-foreground transition-all"
            >
              Incident Management Hub
            </button>
          </div>

          {/* Card 3: Risk Register Summary */}
          <div className="bg-card border-4 border-border p-6 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6 text-primary">
              <AlertTriangle size={24} />
              <h2 className="text-xl  uppercase  tracking-tighter">Risk Register Status</h2>
            </div>
            <div className="space-y-4 flex-1">
               <div className="p-6 border-2 border-border bg-primary/5 flex justify-between items-center">
                  <div>
                    <span className="block text-3xl ">{riskStats.total}</span>
                    <span className="text-[10px]  uppercase text-muted-foreground tracking-widest">Active Risks</span>
                  </div>
                  <Activity size={32} className="text-primary/20" />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border-2 border-destructive bg-destructive/5">
                    <span className="block text-2xl  text-destructive">{riskStats.critical}</span>
                    <span className="text-[9px]  uppercase text-destructive tracking-widest">Critical</span>
                  </div>
                  <div className="p-4 border-2 border-warning bg-warning/5">
                    <span className="block text-2xl  text-warning">{riskStats.high}</span>
                    <span className="text-[9px]  uppercase text-warning tracking-widest">High Severity</span>
                  </div>
               </div>

               <div className="mt-4 p-4 border-2 border-dashed border-border bg-muted/10">
                  <div className="flex items-center gap-2 mb-2 text-primary">
                    <Zap size={14} />
                    <span className="text-[10px]  uppercase tracking-widest">Governance Pulse</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Automated trajectory monitoring is ACTIVE. Critical risks without progress in 24h will trigger an immediate RI escalation.
                  </p>
               </div>
            </div>
            <button 
              onClick={() => navigate('/risk-register')}
              className="mt-6 w-full py-3 bg-primary text-primary-foreground  uppercase  text-[10px] tracking-widest hover:translate-x-1 hover:translate-y-1 transition-all"
            >
              Open Full Risk Register
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
