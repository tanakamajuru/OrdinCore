import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { TrendingUp, AlertTriangle, MapPin, Calendar, Filter, Search, ShieldAlert, CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { apiClient } from "@/services/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface RiskPattern {
  id: string;
  patternType: string;
  description: string;
  affectedHouses: string[];
  houseIds: string[];
  severity: "low" | "medium" | "high";
  firstDetected: string;
  lastDetected: string;
  frequency: number;
  trend: "increasing" | "stable" | "decreasing";
  relatedIncidents: number;
  // Promotion readiness + state (Issues 2 & 3)
  signalCount: number;
  threshold: number;
  hasCritical: boolean;
  promotedRiskId: string | null;
  promotedAt: string | null;
}

type Readiness = "promoted" | "ready" | "nearly" | "forming";
const readinessOf = (p: RiskPattern): Readiness => {
  if (p.promotedRiskId) return "promoted";
  if (p.signalCount >= p.threshold || p.hasCritical) return "ready";
  if (p.signalCount === p.threshold - 1) return "nearly";
  return "forming";
};
const READINESS_WEIGHT: Record<Readiness, number> = { ready: 0, nearly: 1, forming: 2, promoted: 3 };

export function CrossHousePatternDetection() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Patterns is the canonical decision surface, but the decision itself is the RM's
  // ("system proposes, RM decides"). For the Director/RI it is read-only — the promote
  // and dismiss actions are hidden here and blocked server-side (risks/clusters routes).
  const userRole = ((user?.role || localStorage.getItem("userRole") || "").toUpperCase().replace(/-/g, "_"));
  const canDecide = userRole === "REGISTERED_MANAGER";
  const [patterns, setPatterns] = useState<RiskPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPattern, setSelectedPattern] = useState<RiskPattern | null>(null);
  const [relatedSignals, setRelatedSignals] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [dismissTarget, setDismissTarget] = useState<RiskPattern | null>(null);
  const [dismissReason, setDismissReason] = useState("");
  const [dismissing, setDismissing] = useState(false);

  const submitDismiss = async () => {
    if (!dismissTarget) return;
    if (dismissReason.trim().length < 10) { toast.error("Please give a reason (at least 10 characters)."); return; }
    setDismissing(true);
    try {
      await apiClient.post(`/clusters/${dismissTarget.id}/dismiss`, { reason: dismissReason.trim() });
      toast.success("Pattern dismissed");
      setPatterns(prev => prev.filter(p => p.id !== dismissTarget.id));
      if (selectedPattern?.id === dismissTarget.id) setSelectedPattern(null);
      setDismissTarget(null); setDismissReason("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to dismiss pattern");
    } finally { setDismissing(false); }
  };

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/governance/clusters');
      const data = (res as any).data || [];
      
      const domainLabel = (rd: any): string => Array.isArray(rd) ? (rd[0] || '') : (rd || '');
      const formatted: RiskPattern[] = data.map((c: any) => ({
        id: c.id,
        patternType: domainLabel(c.risk_domain),
        description: c.cluster_label,
        affectedHouses: [c.house_name].filter(Boolean),
        houseIds: [c.house_id],
        severity: c.trajectory === 'Critical' ? 'high' : c.trajectory === 'Deteriorating' ? 'high' : 'medium',
        firstDetected: c.first_signal_date,
        lastDetected: c.last_signal_date,
        frequency: parseInt(c.signal_count) || 0,
        trend: String(c.trajectory || 'stable').toLowerCase(),
        relatedIncidents: 0,
        signalCount: parseInt(c.signal_count) || 0,
        threshold: c.promotion_threshold ?? 3,
        hasCritical: !!c.has_critical,
        promotedRiskId: c.linked_risk_id || null,
        promotedAt: c.promoted_at || null,
      }));

      // Ready-first, then nearly, then forming, with already-promoted patterns last.
      formatted.sort((a, b) => READINESS_WEIGHT[readinessOf(a)] - READINESS_WEIGHT[readinessOf(b)]
        || b.signalCount - a.signalCount);
      setPatterns(formatted);
    } catch (err) {
      toast.error("Failed to load patterns");
    } finally {
      setLoading(false);
    }
  };

  const filteredPatterns = patterns.filter(pattern => {
    const matchesSearch = pattern.patternType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pattern.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === "all" || pattern.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "bg-red-100 text-red-800 border-red-300";
      case "medium": return "bg-orange-100 text-orange-800 border-orange-300";
      case "low": return "bg-green-100 text-green-800 border-green-300";
      default: return "bg-muted text-foreground border-border";
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing": return "↑";
      case "decreasing": return "↓";
      case "stable": return "→";
      default: return "→";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "increasing": return "text-red-600";
      case "decreasing": return "text-green-600";
      case "stable": return "text-muted-foreground";
      default: return "text-muted-foreground";
    }
  };

  // Select a pattern and fetch its real linked signals (the evidence behind it).
  const selectPattern = async (pattern: RiskPattern) => {
    setSelectedPattern(pattern);
    setRelatedSignals([]);
    try {
      const res = await apiClient.get(`/governance/clusters/${pattern.id}/signals`);
      const data = (res as any).data?.data || (res as any).data || [];
      setRelatedSignals(Array.isArray(data) ? data : []);
    } catch {
      setRelatedSignals([]);
    }
  };

  const getRelatedSignals = (_pattern: RiskPattern) => relatedSignals;

  // The doctrine action for a pattern is to PROMOTE the cluster to a risk (the RM
  // decides). Send the user to the promotion form with this cluster — works for the
  // RM (unlike the Director-only intervention endpoint), and opens the evidence.
  const goToPromote = (pattern: RiskPattern) => {
    navigate(`/risks/promote?cluster_id=${pattern.id}`, { state: { cluster_id: pattern.id } });
  };
  const viewRisk = (pattern: RiskPattern) => {
    if (pattern.promotedRiskId) navigate(`/risks/${pattern.promotedRiskId}`);
  };

  // Readiness badge + 3-segment distance-to-promotion meter (Issue 2 / 3).
  const ReadinessBadge = ({ p }: { p: RiskPattern }) => {
    const r = readinessOf(p);
    if (r === "promoted") return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-success/10 text-success border border-success/30 inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Promoted</span>;
    if (r === "ready") return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-success/10 text-success border border-success/30">Ready to promote</span>;
    if (r === "nearly") return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-700 border border-amber-300">1 from promotion</span>;
    return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-muted-foreground border border-border">Forming ({p.signalCount} of {p.threshold})</span>;
  };
  const PromotionMeter = ({ p }: { p: RiskPattern }) => {
    const r = readinessOf(p);
    const filled = Math.min(p.signalCount, p.threshold);
    const tone = (r === "ready" || r === "promoted") ? "bg-success" : r === "nearly" ? "bg-amber-500" : "bg-primary/40";
    return (
      <div className="flex gap-1 mt-2 max-w-[160px]">
        {Array.from({ length: p.threshold }).map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < filled ? tone : "bg-muted"}`} />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-border"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl  text-foreground mb-2">Pattern Detection</h1>
          <p className="text-muted-foreground">Recurring signal patterns by service and person — review a pattern and, when the floor is met, promote it to a risk.</p>
        </div>

        {/* Filters */}
        <Card className="border-2 border-border mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search patterns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-border"
                />
              </div>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="px-3 py-2 border-2 border-border rounded"
              >
                <option value="all">All Severities</option>
                <option value="high">High</option>
                <option value="moderate">Moderate</option>
                <option value="low">Low</option>
              </select>
              <Button variant="outline" className="border-border hover:bg-primary hover:text-primary-foreground">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 [&>*]:min-w-0">
          {/* Patterns List */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Detected Patterns ({filteredPatterns.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {filteredPatterns.map((pattern) => (
                    <div
                      key={pattern.id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedPattern?.id === pattern.id 
                          ? "border-border bg-muted" 
                          : "border-border hover:border-border"
                      }`}
                      onClick={() => selectPattern(pattern)}
                    >
                      <div className="flex justify-between items-start mb-3 gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className=" text-foreground">{pattern.patternType}</h3>
                            <span className={`px-2 py-1 rounded text-xs  border ${getSeverityColor(pattern.severity)}`}>
                              {pattern.severity.toUpperCase()}
                            </span>
                            <span className={`text-sm  ${getTrendColor(pattern.trend)}`}>
                              {getTrendIcon(pattern.trend)} {pattern.trend}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{pattern.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {pattern.affectedHouses[0] || `${pattern.affectedHouses.length} houses`}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Since {new Date(pattern.firstDetected).toLocaleDateString('en-GB')}
                            </div>
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {pattern.frequency} signals
                            </div>
                          </div>
                        </div>
                        <ReadinessBadge p={pattern} />
                      </div>

                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <PromotionMeter p={pattern} />
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {readinessOf(pattern) === 'promoted' ? `Promoted${pattern.promotedAt ? ' · ' + new Date(pattern.promotedAt).toLocaleDateString('en-GB') : ''} — in the Risk Register`
                              : readinessOf(pattern) === 'ready' ? (pattern.hasCritical && pattern.signalCount < pattern.threshold ? 'Critical signal — ready to promote' : 'Threshold met — ready to promote')
                              : readinessOf(pattern) === 'nearly' ? '1 signal from promotion'
                              : `Needs ${pattern.threshold - pattern.signalCount} more signal${pattern.threshold - pattern.signalCount === 1 ? '' : 's'}`}
                          </p>
                        </div>
                        {readinessOf(pattern) === 'promoted' ? (
                          <button onClick={(e) => { e.stopPropagation(); viewRisk(pattern); }}
                            className="shrink-0 text-xs font-semibold text-success inline-flex items-center gap-1 hover:underline underline-offset-4">
                            View risk <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : readinessOf(pattern) === 'ready' ? (
                          canDecide ? (
                            <button onClick={(e) => { e.stopPropagation(); goToPromote(pattern); }}
                              className="shrink-0 text-xs font-semibold text-primary-foreground bg-primary rounded px-3 py-1.5 inline-flex items-center gap-1 hover:bg-primary/90">
                              Promote ‣
                            </button>
                          ) : (
                            <span className="shrink-0 text-[11px] font-semibold text-success">Ready to promote</span>
                          )
                        ) : (
                          <span className="shrink-0 text-[11px] text-muted-foreground">Review →</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pattern Details */}
          <div className="space-y-6">
            {selectedPattern ? (
              <>
                {/* Pattern Overview */}
                <Card className="border-2 border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Pattern Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Pattern Type</div>
                        <div className=" text-foreground">{selectedPattern.patternType}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Description</div>
                        <div className="text-sm text-muted-foreground">{selectedPattern.description}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Severity</div>
                        <span className={`px-2 py-1 rounded text-xs  border ${getSeverityColor(selectedPattern.severity)}`}>
                          {selectedPattern.severity.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Trend</div>
                        <div className={` ${getTrendColor(selectedPattern.trend)}`}>
                          {getTrendIcon(selectedPattern.trend)} {selectedPattern.trend}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Affected Services</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedPattern.affectedHouses.map((house, index) => (
                            <span key={index} className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded border">
                              {house}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Related Signals */}
                <Card className="border-2 border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Related Signals</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {getRelatedSignals(selectedPattern).length === 0 ? (
                        <p className="text-sm text-muted-foreground">No linked signals found for this pattern.</p>
                      ) : getRelatedSignals(selectedPattern).map((signal: any, index: number) => {
                        const sev = String(signal.severity || '');
                        const sevClass = (sev === 'Critical' || sev === 'High') ? 'high' : sev === 'Moderate' ? 'medium' : 'low';
                        const theme = Array.isArray(signal.risk_domain) ? signal.risk_domain[0] : (signal.risk_domain || signal.signal_type);
                        return (
                          <div key={signal.id || index} onClick={() => signal.id && navigate(`/signals/${signal.id}`)}
                            className={`p-3 bg-muted rounded border ${signal.id ? 'cursor-pointer hover:border-primary' : ''}`}>
                            <div className="flex justify-between items-start mb-2 gap-2">
                              <div className="min-w-0">
                                <div className="text-foreground text-sm font-medium">{signal.related_person || signal.house_name || 'Signal'}</div>
                                <div className="text-sm text-muted-foreground">{signal.description}</div>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs border shrink-0 ${getSeverityColor(sevClass)}`}>{sev || '—'}</span>
                            </div>
                            <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                              <span>{theme}</span>
                              {signal.pattern_concern && <span className="shrink-0">{signal.pattern_concern}</span>}
                              <span className="shrink-0">{signal.entry_date ? new Date(signal.entry_date).toLocaleDateString('en-GB') : ''}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card className="border-2 border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">Leadership Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                        <div className=" text-orange-900 mb-1">Immediate Action Required</div>
                        <div className="text-sm text-orange-800">
                          {selectedPattern.severity === "high" && 
                            "Schedule organizational review due to high severity pattern"
                          }
                          {selectedPattern.severity === "medium" && 
                            "Monitor pattern and discuss in next governance review"
                          }
                          {selectedPattern.severity === "low" && 
                            "Continue monitoring and document in weekly review"
                          }
                        </div>
                      </div>
                      
                      {readinessOf(selectedPattern) === 'promoted' ? (
                        <Button onClick={() => viewRisk(selectedPattern)} className="w-full bg-success text-success-foreground hover:bg-success/90">
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Promoted — View Risk
                        </Button>
                      ) : readinessOf(selectedPattern) === 'ready' ? (
                        canDecide ? (
                          <Button onClick={() => goToPromote(selectedPattern)} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                            <ShieldAlert className="w-4 h-4 mr-2" /> Promote to Risk
                          </Button>
                        ) : (
                          <div className="w-full text-center text-sm text-success bg-success/5 rounded-lg py-2.5 px-3">
                            Ready to promote — the Registered Manager promotes from here.
                          </div>
                        )
                      ) : (
                        <div className="w-full text-center text-sm text-muted-foreground bg-muted rounded-lg py-2.5 px-3">
                          {readinessOf(selectedPattern) === 'nearly'
                            ? '1 more signal needed before this pattern can be promoted.'
                            : `Forming — needs ${selectedPattern.threshold - selectedPattern.signalCount} more signal${selectedPattern.threshold - selectedPattern.signalCount === 1 ? '' : 's'} (or one Critical) to promote.`}
                        </div>
                      )}

                      {readinessOf(selectedPattern) !== 'promoted' && canDecide && (
                        <Button variant="outline" onClick={() => { setDismissReason(""); setDismissTarget(selectedPattern); }}
                          className="w-full border-destructive/40 text-destructive hover:bg-destructive/5">
                          Dismiss Pattern
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-2 border-border">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-muted-foreground">Select a pattern to view details</div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dismiss pattern — reason required (every dismiss carries a name + reason) */}
      {dismissTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/70 backdrop-blur-sm p-4" onClick={() => !dismissing && setDismissTarget(null)}>
          <div className="bg-card border-2 border-border rounded-lg w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border">
              <h3 className="font-semibold text-foreground">Dismiss this pattern?</h3>
              <p className="text-sm text-muted-foreground mt-1">{dismissTarget.patternType} — {dismissTarget.description}</p>
            </div>
            <div className="p-5 space-y-2">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Why are you dismissing this pattern? <span className="text-amber-600">(required)</span></label>
              <textarea
                value={dismissReason}
                onChange={(e) => setDismissReason(e.target.value)}
                placeholder="Record your reasoning — this is stored as the governance justification."
                className="w-full h-28 bg-input-background border-2 border-border rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
            <div className="p-5 pt-0 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDismissTarget(null)} disabled={dismissing}>Cancel</Button>
              <Button onClick={submitDismiss} disabled={dismissing || dismissReason.trim().length < 10}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {dismissing ? "Dismissing…" : "Dismiss Pattern"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
