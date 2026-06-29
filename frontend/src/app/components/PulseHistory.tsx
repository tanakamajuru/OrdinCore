import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  ArrowLeft, 
  Search, 
  Calendar, 
  AlertCircle, 
  ExternalLink,
  ChevronRight,
  X
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

interface PulseRecord {
  id: string;
  house_name: string;
  signal_type: string;
  risk_domain?: string[] | string;   // the theme(s) — what the dashboard shows
  related_person?: string;           // the client
  severity: string;
  review_status: string;
  entry_date: string;
  entry_time: string;
  description: string;
}

// The "theme" is the risk domain (e.g. "Mental Health Stability"); signal_type is
// the generic category (Concern/Observation/Incident). Show the theme, fall back.
const themeOf = (p: PulseRecord): string =>
  Array.isArray(p.risk_domain) ? (p.risk_domain[0] || p.signal_type)
    : (p.risk_domain || p.signal_type);

export function PulseHistory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pulses, setPulses] = useState<PulseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;
  const isTL = (user?.role || '').toUpperCase().replace('-', '_') === 'TEAM_LEADER' || (user?.role || '').toUpperCase() === 'TL';
  // For a Team Leader, signals split three ways: what they OWN (allocated to me —
  // the work queue), everything at their site(s), and what they personally raised.
  const [view, setView] = useState<'allocated' | 'all' | 'raised'>('allocated');

  useEffect(() => {
    if (user) {
      loadPulseHistory();
    }
  }, [user, view]);

  // Reset to the first page whenever the filters change.
  useEffect(() => { setPage(1); }, [searchTerm, searchDate]);

  const openSignal = (id?: string) => { if (id) navigate(`/signals/${id}`); };

  const loadPulseHistory = async () => {
    try {
      setIsLoading(true);
      const params: any = { limit: 100 };
      // Team Leader views: allocated to me (default), all site signals, or raised by me.
      // Other roles see all org signals (house-scoped server-side) as before.
      if (isTL) {
        if (view === 'allocated') params.assigned_to = user?.id;
        else if (view === 'raised') params.created_by = user?.id;
        // 'all' => no extra filter; server scopes to the TL's assigned house(s)
      }

      const res = await apiClient.get('/pulses', { params });
      const data = (res.data as any).data || res.data;
      setPulses(data);
    } catch (err) {
      console.error('Failed to load pulse history:', err);
      toast.error("Failed to load your pulse history");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPulses = pulses.filter(p => {
    const q = searchTerm.toLowerCase();
    const matchesText = !q ||
      themeOf(p).toLowerCase().includes(q) ||
      (p.signal_type || '').toLowerCase().includes(q) ||
      (p.related_person || '').toLowerCase().includes(q) ||
      (p.house_name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q);

    // Normalise both sides to YYYY-MM-DD: entry_date may arrive as a date or a
    // full ISO timestamp, so a raw substring match (the old bug) was unreliable.
    const pulseDay = p.entry_date ? new Date(p.entry_date).toISOString().slice(0, 10) : '';
    const matchesDate = !searchDate || pulseDay === searchDate;

    return matchesText && matchesDate;
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB');

  const totalPages = Math.max(1, Math.ceil(filteredPulses.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredPulses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors mb-6 underline "
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl  text-primary tracking-tighter uppercase ">Pulse History</h1>
            <p className="text-muted-foreground ">
              {isTL
                ? (view === 'allocated' ? "Signals allocated to you for follow-up"
                  : view === 'raised' ? "Signals you personally raised"
                  : "All signals across your site(s)")
                : "All governance signals for your organisation"}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search history..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border-2 border-border focus:border-primary outline-none transition-all "
              />
            </div>
            <div className="relative flex-1 sm:w-48">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border-2 border-border focus:border-primary outline-none transition-all  appearance-none"
              />
              {searchDate && (
                <button 
                  onClick={() => setSearchDate('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {isTL && (
          <div className="flex gap-1 mb-4 border-b-2 border-border">
            {([
              { key: 'allocated', label: 'Allocated to me' },
              { key: 'all', label: 'All site signals' },
              { key: 'raised', label: 'Raised by me' },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setView(t.key)}
                className={`px-4 py-2 text-sm font-medium -mb-0.5 border-b-2 transition-colors ${
                  view === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : filteredPulses.length > 0 ? (
          <div className="bg-card border-2 border-border shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b-2 border-border">
                    <th className="p-4  uppercase text-xs tracking-widest">Date / Time</th>
                    <th className="p-4  uppercase text-xs tracking-widest">Service</th>
                    <th className="p-4  uppercase text-xs tracking-widest">Theme</th>
                    <th className="p-4  uppercase text-xs tracking-widest">Client</th>
                    <th className="p-4  uppercase text-xs tracking-widest">Severity</th>
                    <th className="p-4  uppercase text-xs tracking-widest">Status</th>
                    <th className="p-4  uppercase text-xs tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((pulse) => (
                    <tr
                      key={pulse.id}
                      onClick={() => openSignal(pulse.id)}
                      className="border-b border-border hover:bg-muted/30 transition-colors group cursor-pointer"
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className=" text-foreground">{formatDate(pulse.entry_date)}</span>
                          <span className="text-xs text-muted-foreground ">{pulse.entry_time.slice(0, 5)}</span>
                        </div>
                      </td>
                      <td className="p-4  text-foreground">{pulse.house_name}</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-foreground font-medium">{themeOf(pulse)}</span>
                          <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] uppercase tracking-tighter w-fit rounded">
                            {pulse.signal_type}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{pulse.related_person || "—"}</td>
                      <td className="p-4">
                        <span className={` ${
                          pulse.severity === 'High' || pulse.severity === 'Critical' ? 'text-destructive' : 'text-foreground'
                        }`}>
                          {pulse.severity}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-xs  text-muted-foreground uppercase">{pulse.review_status}</span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); openSignal(pulse.id); }}
                          className="p-2 hover:bg-primary hover:text-primary-foreground transition-all rounded border-2 border-transparent hover:border-primary group-hover:shadow-md"
                          title="View Details"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between gap-4 px-4 py-3 border-t-2 border-border bg-muted/30">
              <span className="text-xs text-muted-foreground">
                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredPulses.length)} of {filteredPulses.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 text-sm border-2 border-border rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">Page {safePage} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 text-sm border-2 border-border rounded hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 bg-card border-2 border-dashed border-border">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground  ">No pulse records found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
