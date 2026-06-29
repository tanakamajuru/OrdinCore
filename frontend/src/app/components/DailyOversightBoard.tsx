import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Minus,
  Zap,
  CheckCircle,
  Clock,
  ChevronRight,
  ShieldAlert,
  ArrowRightCircle,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

interface DashboardData {
  highPriority: any[];
  pattern_signals: any[];
  risk_candidates: any[];
  actions: any[];
  promotion_threshold?: number;
  open_escalations?: number;
}

// risk_domain is a TEXT[] in the schema — render the first element, never the raw {…}.
const domainOf = (c: any): string => {
  const d = c?.risk_domain;
  if (Array.isArray(d)) return d[0] || c?.cluster_label || "";
  if (typeof d === "string") return d.replace(/[{}]/g, "").split(",")[0] || c?.cluster_label || "";
  return c?.cluster_label || "";
};

export function DailyOversightBoard() {
  const navigate = useNavigate();
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

  const THRESHOLD = data?.promotion_threshold ?? 3;
  const patterns = data?.pattern_signals ?? [];
  const isReady = (c: any) => (c.signal_count >= THRESHOLD) || c.has_critical;
  const isNearly = (c: any) => !isReady(c) && c.signal_count === THRESHOLD - 1;
  const goPromote = (c: any) => navigate('/risks/promote', { state: { cluster_id: c.id } });

  // Shape-of-the-day counts — all derived from the same pattern array so they can't disagree.
  const deterioratingCount = patterns.filter((c) => c.trajectory === 'Deteriorating' || c.trajectory === 'Critical').length;
  const nearlyCount = patterns.filter(isNearly).length;
  const readyCount = patterns.filter(isReady).length;
  const openEsc = data?.open_escalations ?? 0;

  const TriageSignal = ({ signal }: any) => (
    <div className="flex items-center justify-between gap-3 p-4 bg-background border-2 border-border border-l-4 border-l-destructive hover:border-primary transition-all group min-w-0">
      <div className="flex gap-4 items-center min-w-0">
        <div className="w-10 h-10 shrink-0 bg-destructive/10 text-destructive flex items-center justify-center rounded-lg">
          <AlertCircle size={20} />
        </div>
        <div className="min-w-0">
          <div className="text-foreground truncate">{signal.house_name} – {signal.signal_type}</div>
          <p className="text-sm text-muted-foreground line-clamp-1">{signal.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-muted-foreground uppercase whitespace-nowrap">{new Date(signal.entry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
        <button onClick={() => navigate(`/signals/${signal.id}`)} className="p-2 hover:bg-muted rounded-full">
           <ChevronRight size={20} className="text-primary" />
        </button>
      </div>
    </div>
  );

  const TrajectoryChip = ({ trajectory }: { trajectory: string }) => {
    const t = (trajectory || 'Stable');
    if (t === 'Deteriorating' || t === 'Critical')
      return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive"><TrendingDown size={13} /> Deteriorating</span>;
    if (t === 'Improving')
      return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success"><TrendingUp size={13} /> Improving</span>;
    return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"><Minus size={13} /> Stable</span>;
  };

  // 3-segment distance-to-promotion meter.
  const PromotionMeter = ({ cluster }: any) => {
    const count = Math.min(cluster.signal_count, THRESHOLD);
    const ready = isReady(cluster);
    const nearly = isNearly(cluster);
    const tone = ready ? 'bg-success' : nearly ? 'bg-amber-500' : 'bg-primary/40';
    const caption = ready
      ? (cluster.has_critical && cluster.signal_count < THRESHOLD ? 'Critical signal — ready to promote' : 'Threshold met — ready to promote')
      : nearly ? `${THRESHOLD - 1} of ${THRESHOLD} — 1 signal from promotion`
      : `${cluster.signal_count} of ${THRESHOLD} signals`;
    const captionTone = ready ? 'text-success' : nearly ? 'text-amber-600' : 'text-muted-foreground';
    return (
      <div className="mt-3">
        <div className="flex gap-1 mb-1.5">
          {Array.from({ length: THRESHOLD }).map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < count ? tone : 'bg-muted'}`} />
          ))}
        </div>
        <p className={`text-[11px] font-medium ${captionTone}`}>{caption}</p>
      </div>
    );
  };

  const PatternCard = ({ cluster }: any) => {
    const ready = isReady(cluster);
    const nearly = isNearly(cluster);
    const borderTone = ready ? 'border-success/60' : (cluster.trajectory === 'Deteriorating' || cluster.trajectory === 'Critical') ? 'border-destructive/50' : nearly ? 'border-amber-400/60' : 'border-border';
    return (
      <div className={`p-4 bg-background border-2 ${borderTone} hover:border-primary transition-all min-w-0 flex flex-col`}>
        <div className="flex justify-between items-start gap-2 mb-1">
          <span className="text-[10px] uppercase text-muted-foreground tracking-widest truncate">{domainOf(cluster)}</span>
          <TrajectoryChip trajectory={cluster.trajectory} />
        </div>
        <div className="text-foreground font-medium leading-snug">{cluster.cluster_label}</div>
        <PromotionMeter cluster={cluster} />
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/50">
          <span className="text-xs text-muted-foreground">{cluster.signal_count} signal{cluster.signal_count === 1 ? '' : 's'}</span>
          {ready ? (
            <button onClick={() => goPromote(cluster)} className="text-xs font-semibold text-success flex items-center gap-1 hover:underline underline-offset-4">
              Promote <ArrowRightCircle size={14} />
            </button>
          ) : (
            <button onClick={() => goPromote(cluster)} className="text-xs font-medium text-primary flex items-center gap-1 hover:underline underline-offset-4">
              Review <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const ShapeCell = ({ value, label, tone }: { value: number; label: string; tone?: 'critical' | 'moss' | 'amber' }) => {
    const bg = value > 0 && tone === 'critical' ? 'bg-destructive/5 border-destructive/30'
      : value > 0 && tone === 'moss' ? 'bg-success/5 border-success/30'
      : value > 0 && tone === 'amber' ? 'bg-amber-50 border-amber-300'
      : 'bg-card border-border';
    const valTone = value > 0 && tone === 'critical' ? 'text-destructive'
      : value > 0 && tone === 'moss' ? 'text-success'
      : value > 0 && tone === 'amber' ? 'text-amber-600'
      : 'text-foreground';
    return (
      <div className={`border-2 ${bg} rounded-lg p-3 min-w-0`}>
        <div className={`text-2xl font-bold ${valTone}`}>{value}</div>
        <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{label}</div>
      </div>
    );
  };

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 md:px-12 lg:px-20 pt-28 max-w-[1400px] mx-auto">

        <div className="mb-6 border-b-2 border-border pb-5">
          <h1 className="text-4xl text-primary tracking-tighter uppercase">RM Daily Oversight</h1>
          <p className="text-muted-foreground mt-1">Defensible governance feed — last 48 hours</p>
        </div>

        {/* Shape of the day — at-a-glance posture, computed from the live payload */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <ShapeCell value={patterns.length} label="Active patterns" />
          <ShapeCell value={deterioratingCount} label="Deteriorating" tone="critical" />
          <ShapeCell value={nearlyCount} label="Nearly promotable" tone="amber" />
          <ShapeCell value={readyCount} label="Ready to promote" tone="moss" />
          <ShapeCell value={data?.highPriority.length || 0} label="High-priority · 48h" tone="critical" />
          <ShapeCell value={openEsc} label="Open escalations" tone="critical" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Section A: High Priority Signals */}
          <div className="space-y-4 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={20} className="text-destructive fill-destructive" />
              <h2 className="text-xl text-foreground uppercase tracking-tight">High Priority Signals</h2>
            </div>
            <div className="flex flex-col gap-3">
              {data?.highPriority.map(s => <TriageSignal key={s.id} signal={s} />)}
              {data?.highPriority.length === 0 && (
                <div className="p-8 border-2 border-dashed border-border text-center text-muted-foreground">
                   No High or Critical signals in the last 48 hours — high-priority signals surface here the moment they're recorded.
                </div>
              )}
            </div>
          </div>

          {/* Section B: Pattern Signals */}
          <div className="space-y-4 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={20} className="text-warning" />
              <h2 className="text-xl text-foreground uppercase tracking-tight">Emerging Patterns</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patterns.map(c => <PatternCard key={c.id} cluster={c} />)}
              {patterns.length === 0 && (
                <div className="md:col-span-2 p-8 border-2 border-dashed border-border text-center text-muted-foreground">
                   No active patterns — clusters appear here as signals group by theme and person.
                </div>
              )}
            </div>
          </div>

          {/* Section C: Ready to Promote */}
          <div className="space-y-4 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <ShieldAlert size={20} className="text-primary" />
              <h2 className="text-xl text-foreground uppercase tracking-tight">Ready to Promote</h2>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">Clusters that crossed the threshold (≥{THRESHOLD} signals, or one Critical). Your decision queue — promote with a reason, or it waits.</p>
            <div className="bg-card border-2 border-border min-h-[260px]">
               {data?.risk_candidates.map(c => (
                 <div key={c.id} className="p-4 border-b-2 border-border last:border-b-0 flex justify-between items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="text-foreground font-medium truncate">{c.cluster_label}</div>
                      <div className="text-xs text-muted-foreground uppercase mt-1 truncate">
                        {domainOf(c)} • {c.has_critical && c.signal_count < THRESHOLD ? 'Critical signal' : `${c.signal_count} signals · threshold met`}{c.trajectory === 'Deteriorating' ? ' · deteriorating' : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => goPromote(c)}
                      className="bg-primary text-primary-foreground px-4 py-2 text-sm hover:translate-x-1 transition-transform shrink-0 rounded"
                    >
                      Promote ‣
                    </button>
                 </div>
               ))}
               {data?.risk_candidates.length === 0 && (
                <div className="p-8 text-center text-muted-foreground min-h-[260px] flex items-center justify-center">
                   No clusters ready for promotion yet. Patterns appear here the moment they reach {THRESHOLD} signals — or instantly if a Critical signal is recorded.
                </div>
               )}
            </div>
          </div>

          {/* Section D: Actions Panel */}
          <div className="space-y-4 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={20} className="text-success" />
              <h2 className="text-xl text-foreground uppercase tracking-tight">Governance Actions</h2>
            </div>
            <div className="bg-card border-2 border-border min-h-[260px]">
               {data?.actions.map(a => (
                 <div key={a.id} className="p-4 border-b-2 border-border last:border-b-0 flex justify-between items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="text-foreground font-medium truncate">{a.title}</div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">Due: {a.due_date ? new Date(a.due_date).toLocaleDateString('en-GB') : '—'} • {a.risk_title || "General"}</div>
                    </div>
                    <div className={`px-2 py-1 text-[10px] uppercase shrink-0 ${a.status === 'Overdue' ? 'bg-destructive text-primary-foreground' : 'bg-warning text-foreground'}`}>
                      {a.status}
                    </div>
                 </div>
               ))}
               {data?.actions.length === 0 && (
                <div className="p-8 text-center text-muted-foreground min-h-[260px] flex items-center justify-center">
                   <span className="flex items-center gap-2"><Clock size={15} /> No actions due or overdue today.</span>
                </div>
               )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
