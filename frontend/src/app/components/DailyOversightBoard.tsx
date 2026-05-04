import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  AlertCircle, 
  TrendingDown, 
  TrendingUp, 
  Zap, 
  CheckCircle, 
  Clock, 
  ChevronRight,
  ShieldAlert,
  ArrowRightCircle,
  MoreVertical
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
import { useAuth } from "@/hooks/useAuth";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

interface DashboardData {
  highPriority: any[];
  pattern_signals: any[];
  risk_candidates: any[];
  actions: any[];
}

export function DailyOversightBoard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await apiClient.get('/pulses/dashboard');
      setData(res.data.data);
    } catch (err) {
      toast.error("Failed to load oversight board");
    } finally {
      setIsLoading(false);
    }
  };

  const TriageSignal = ({ signal }: any) => (
    <div className="flex items-center justify-between p-4 bg-background border-2 border-border border-l-4 border-l-destructive hover:border-primary transition-all group">
      <div className="flex gap-4 items-center">
        <div className="w-10 h-10 bg-destructive/10 text-destructive flex items-center justify-center rounded-lg">
          <AlertCircle size={20} />
        </div>
        <div>
          <div className=" text-foreground">{signal.house_name} – {signal.signal_type}</div>
          <p className="text-sm text-muted-foreground line-clamp-1">{signal.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs  text-muted-foreground uppercase">{new Date(signal.entry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
        <button onClick={() => navigate(`/signals/${signal.id}`)} className="p-2 hover:bg-muted rounded-full">
           <ChevronRight size={20} className="text-primary" />
        </button>
      </div>
    </div>
  );

  const PatternCard = ({ cluster }: any) => (
    <div className="p-4 bg-background border-2 border-border hover:border-primary transition-all">
       <div className="flex justify-between items-start mb-2">
         <span className="text-[10px]  uppercase text-muted-foreground tracking-widest">{cluster.risk_domain}</span>
         {cluster.trajectory === 'Deteriorating' || cluster.trajectory === 'Critical' ? (
           <TrendingDown size={16} className="text-destructive animate-pulse" />
         ) : <TrendingUp size={16} className="text-success" />}
       </div>
       <div className=" text-foreground mb-1">{cluster.cluster_label}</div>
       <div className="flex justify-between items-center mt-4">
         <span className="text-xs bg-primary/10 text-primary px-2 py-1 ">{cluster.signal_count} Signals</span>
         <button onClick={() => navigate(`/clusters/${cluster.id}`)} className="text-xs  text-primary flex items-center gap-1 hover:underline underline-offset-4">
           Review <ArrowRightCircle size={14} />
         </button>
       </div>
    </div>
  );

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 md:px-12 lg:px-20 pt-28">
        
        <div className="flex justify-between items-end mb-8 border-b-2 border-border pb-6">
          <div>
            <h1 className="text-4xl  text-primary tracking-tighter uppercase ">RM Daily Oversight</h1>
            <p className="text-muted-foreground mt-1">Defensible governance feed – Last 48 hours</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-card border-2 border-border px-6 py-2 shadow-sm text-center">
              <div className="text-xs  text-muted-foreground uppercase mb-1">High Risk</div>
              <div className="text-2xl  text-destructive">{data?.highPriority.length || 0}</div>
            </div>
            <div className="bg-card border-2 border-border px-6 py-2 shadow-sm text-center">
              <div className="text-xs  text-muted-foreground uppercase mb-1">Patterns</div>
              <div className="text-2xl  text-warning">{data?.pattern_signals.length || 0}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Section A: High Priority Signals */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={20} className="text-destructive fill-destructive" />
              <h2 className="text-xl  text-foreground uppercase tracking-tight">High Priority Signals</h2>
            </div>
            <div className="flex flex-col gap-3">
              {data?.highPriority.map(s => <TriageSignal key={s.id} signal={s} />)}
              {data?.highPriority.length === 0 && (
                <div className="p-8 border-2 border-dashed border-border text-center text-muted-foreground">
                   No high priority signals in last 48 hours
                </div>
              )}
            </div>
          </div>

          {/* Section B: Pattern Signals */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={20} className="text-warning" />
              <h2 className="text-xl  text-foreground uppercase tracking-tight">Emerging Patterns</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.pattern_signals.map(c => <PatternCard key={c.id} cluster={c} />)}
              {data?.pattern_signals.length === 0 && (
                <div className="col-span-2 p-8 border-2 border-dashed border-border text-center text-muted-foreground">
                   No active patterns detected
                </div>
              )}
            </div>
          </div>

          {/* Section C: Risk Touchpoint */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert size={20} className="text-primary" />
              <h2 className="text-xl  text-foreground uppercase tracking-tight">Risk Candidates</h2>
            </div>
            <div className="bg-card border-2 border-border h-full min-h-[300px]">
               {data?.risk_candidates.map(c => (
                 <div key={c.id} className="p-4 border-b-2 border-border last:border-b-0 flex justify-between items-center">
                    <div>
                      <div className=" text-foreground">{c.cluster_label}</div>
                      <div className="text-xs text-muted-foreground uppercase  mt-1">{c.risk_domain} • {c.signal_count} Signals</div>
                    </div>
                    <button 
                      onClick={() => navigate(`/risks/promote?cluster_id=${c.id}`)}
                      className="bg-primary text-primary-foreground px-4 py-2  text-sm hover:translate-x-1 transition-transform"
                    >
                      Promote to Risk
                    </button>
                 </div>
               ))}
               {data?.risk_candidates.length === 0 && (
                <div className="p-8 text-center text-muted-foreground  h-full flex items-center justify-center">
                   No clusters ready for promotion
                </div>
               )}
            </div>
          </div>

          {/* Section D: Actions Panel */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={20} className="text-success" />
              <h2 className="text-xl  text-foreground uppercase tracking-tight">Governance Actions</h2>
            </div>
            <div className="bg-card border-2 border-border h-full min-h-[300px]">
               {data?.actions.map(a => (
                 <div key={a.id} className="p-4 border-b-2 border-border last:border-b-0 flex justify-between items-center">
                    <div>
                      <div className=" text-foreground">{a.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">Due: {new Date(a.due_date).toLocaleDateString()} • {a.risk_title || "General"}</div>
                    </div>
                    <div className={`px-2 py-1 text-[10px]  uppercase ${a.status === 'Overdue' ? 'bg-destructive text-primary-foreground' : 'bg-warning text-foreground'}`}>
                      {a.status}
                    </div>
                 </div>
               ))}
               {data?.actions.length === 0 && (
                <div className="p-8 text-center text-muted-foreground  h-full flex items-center justify-center">
                   No urgent actions pending
                </div>
               )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
