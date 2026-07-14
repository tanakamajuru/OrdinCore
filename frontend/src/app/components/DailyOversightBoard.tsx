import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  AlertCircle,
  Zap,
  Clock,
  ChevronRight,
  ArrowRightCircle,
  Eye,
  ShieldCheck,
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

export function DailyOversightBoard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [house, setHouse] = useState<any>(null);
  const [isDeputyCover, setIsDeputyCover] = useState(false);
  const [dailyNote, setDailyNote] = useState("");
  const [isSigningOff, setIsSigningOff] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const userId = user.id || user.user_id;
      const [dashRes, housesRes] = await Promise.all([
        apiClient.get('/pulses/dashboard'),
        userId ? apiClient.get(`/users/${userId}/houses`).catch(() => ({ data: {} })) : Promise.resolve({ data: {} }),
      ]);
      setData(dashRes.data.data);
      const houses = (housesRes as any).data?.data || (housesRes as any).data || [];
      const myHouse = Array.isArray(houses) ? houses[0] : null;
      setHouse(myHouse);
      setIsDeputyCover(!!myHouse && myHouse.deputy_rm_id === userId);
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

  // Shape-of-the-day counts — all derived from the same payload so they can't disagree.
  // The cluster decision itself lives on Patterns; here we only surface the posture.
  const deterioratingCount = patterns.filter((c) => c.trajectory === 'Deteriorating' || c.trajectory === 'Critical').length;
  const nearlyCount = patterns.filter(isNearly).length;
  const readyCount = patterns.filter(isReady).length;
  const openEsc = data?.open_escalations ?? 0;
  const highPriority = data?.highPriority ?? [];
  const actions = data?.actions ?? [];
  const hasSafeguardingOverride = isDeputyCover && highPriority.length > 0;

  const handleSignOff = async () => {
    if (!dailyNote.trim()) {
      toast.error("A daily governance narrative is mandatory for sign-off.");
      return;
    }
    if (!house?.id) {
      toast.error("Could not determine your service. Please reload.");
      return;
    }
    setIsSigningOff(true);
    try {
      const openRes = await apiClient.post('/governance/daily-log/open', { house_id: house.id });
      const logId = openRes.data?.id || openRes.data?.data?.id;
      await apiClient.post(`/governance/daily-log/${logId}/complete`, {
        note: dailyNote,
        is_deputy_review: isDeputyCover,
      });
      toast.success('Daily governance signed off');
      setDailyNote("");
      loadDashboard();
    } catch (err) {
      toast.error('Sign-off failed');
    } finally {
      setIsSigningOff(false);
    }
  };

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
          <h1 className="text-4xl text-foreground tracking-tighter uppercase">RM Daily Oversight</h1>
          <p className="text-muted-foreground mt-1">Today's actionable slice — last 48 hours. Cluster decisions live in Patterns.</p>
        </div>

        {/* Shape of the day — at-a-glance posture, computed from the live payload */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <ShapeCell value={patterns.length} label="Active patterns" />
          <ShapeCell value={deterioratingCount} label="Deteriorating" tone="critical" />
          <ShapeCell value={nearlyCount} label="Nearly promotable" tone="amber" />
          <ShapeCell value={readyCount} label="Ready to promote" tone="moss" />
          <ShapeCell value={highPriority.length} label="High-priority · 48h" tone="critical" />
          <ShapeCell value={openEsc} label="Open escalations" tone="critical" />
        </div>

        {/* Patterns hand-off — the single canonical cluster/promotion surface */}
        <button
          onClick={() => navigate('/rm5')}
          className="w-full mb-8 flex items-center justify-between gap-3 p-4 bg-card border-2 border-primary/30 hover:border-primary rounded-lg transition-all text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 bg-primary/10 text-primary flex items-center justify-center rounded-lg">
              <Eye size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-foreground font-medium">
                {readyCount > 0 ? `${readyCount} cluster${readyCount === 1 ? '' : 's'} ready to promote` : 'Review emerging patterns'}
              </div>
              <p className="text-sm text-muted-foreground">
                Promote, dismiss and track the promotion meter on Patterns — the one place cluster decisions are made.
              </p>
            </div>
          </div>
          <span className="shrink-0 text-sm font-semibold text-primary flex items-center gap-1">
            See all patterns <ArrowRightCircle size={16} />
          </span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* High Priority Signals — the unique 48h triage feed */}
          <div className="space-y-4 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={20} className="text-destructive fill-destructive" />
              <h2 className="text-xl text-foreground uppercase tracking-tight">High Priority Signals</h2>
            </div>
            <div className="flex flex-col gap-3">
              {highPriority.map((s: any) => <TriageSignal key={s.id} signal={s} />)}
              {highPriority.length === 0 && (
                <div className="p-8 border-2 border-dashed border-border text-center text-muted-foreground">
                   No High or Critical signals in the last 48 hours — high-priority signals surface here the moment they're recorded.
                </div>
              )}
            </div>
          </div>

          {/* Governance Actions due today */}
          <div className="space-y-4 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={20} className="text-warning" />
              <h2 className="text-xl text-foreground uppercase tracking-tight">Governance Actions</h2>
            </div>
            <div className="bg-card border-2 border-border min-h-[260px]">
               {actions.map((a: any) => (
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
               {actions.length === 0 && (
                <div className="p-8 text-center text-muted-foreground min-h-[260px] flex items-center justify-center">
                   <span className="flex items-center gap-2"><Clock size={15} /> No actions due or overdue today.</span>
                </div>
               )}
            </div>
          </div>

        </div>

        {/* Daily Governance Sign-Off — rehomed from the retired Oversight Board.
            The mandatory daily narrative is a CQC Well-Led audit point. */}
        <div className="mt-10 bg-card border-2 border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck size={20} className="text-primary" />
            <h2 className="text-xl text-foreground uppercase tracking-tight">Daily Governance Sign-Off</h2>
          </div>

          {hasSafeguardingOverride && (
            <div className="p-4 border-2 border-destructive bg-destructive/10 mb-5">
              <p className="text-destructive font-semibold uppercase text-sm mb-1">Safeguarding override detected</p>
              <p className="text-sm">
                High/Critical signals exist while a Deputy RM is reviewing. Signing off will trigger an immediate
                director notification and flag this log for enhanced oversight.
              </p>
            </div>
          )}

          <label className="block mb-2 text-sm uppercase tracking-widest text-muted-foreground">Daily governance narrative (mandatory)</label>
          <textarea
            value={dailyNote}
            onChange={(e) => setDailyNote(e.target.value)}
            className="w-full h-40 p-4 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-background"
            placeholder="Considering all triage, patterns and actions above — what is the service position today?"
          />
          <div className="mt-4 p-4 border-2 border-border bg-muted/20 text-sm text-muted-foreground">
            I {isDeputyCover ? 'as Deputy RM ' : ''}certify that I have reviewed today's oversight for {house?.name || 'this service'}.
            This entry constitutes a forensic audit point for CQC Well-Led inspections.
          </div>
          <button
            onClick={handleSignOff}
            disabled={isSigningOff || !dailyNote.trim()}
            className="mt-4 w-full py-4 bg-primary text-primary-foreground uppercase font-semibold tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50 rounded-lg"
          >
            {isSigningOff ? 'Signing off…' : 'Sign off daily governance'}
          </button>
        </div>

      </div>
    </div>
  );
}
