import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { TrendingUp, AlertTriangle, MapPin, Calendar, Filter, Search, ShieldAlert } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { apiClient } from "@/services/api";
import { toast } from "sonner";

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
}

export function CrossHousePatternDetection() {
  const navigate = useNavigate();
  const [patterns, setPatterns] = useState<RiskPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPattern, setSelectedPattern] = useState<RiskPattern | null>(null);
  const [relatedSignals, setRelatedSignals] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | "low" | "medium" | "high">("all");

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/governance/clusters');
      const data = (res as any).data || [];
      
      const formatted: RiskPattern[] = data.map((c: any) => ({
        id: c.id,
        patternType: c.risk_domain,
        description: c.cluster_label,
        affectedHouses: [c.house_name], // Backend returns one house per cluster for now, but we can aggregate if needed
        houseIds: [c.house_id],
        severity: c.trajectory === 'Critical' ? 'high' : c.trajectory === 'Deteriorating' ? 'high' : 'medium',
        firstDetected: c.first_signal_date,
        lastDetected: c.last_signal_date,
        frequency: parseInt(c.signal_count),
        trend: c.trajectory.toLowerCase(),
        relatedIncidents: 0 // Will need another query or join
      }));
      
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

  const handleViewAnalysis = (pattern: RiskPattern) => goToPromote(pattern);
  const handleAddToReview = (pattern: RiskPattern) => goToPromote(pattern);

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
          <h1 className="text-3xl  text-foreground mb-2">Cross-Service Pattern Detection</h1>
          <p className="text-muted-foreground">Identify and analyze recurring risk patterns across all services</p>
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
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className=" text-foreground">{pattern.patternType}</h3>
                            <span className={`px-2 py-1 rounded text-xs  border ${getSeverityColor(pattern.severity)}`}>
                              {pattern.severity.toUpperCase()}
                            </span>
                            <span className={`text-sm  ${getTrendColor(pattern.trend)}`}>
                              {getTrendIcon(pattern.trend)} {pattern.trend}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{pattern.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {pattern.affectedHouses.length} houses
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Since {new Date(pattern.firstDetected).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              {pattern.frequency} signals
                            </div>
                            {pattern.relatedIncidents > 0 && (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertTriangle className="w-3 h-3" />
                                {pattern.relatedIncidents} incidents
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {pattern.affectedHouses.map((house, index) => (
                          <span key={index} className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded border">
                            {house}
                          </span>
                        ))}
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
                          <div key={signal.id || index} className="p-3 bg-muted rounded border">
                            <div className="flex justify-between items-start mb-2">
                              <div className="min-w-0">
                                <div className="text-foreground text-sm font-medium">{signal.related_person || signal.house_name || 'Signal'}</div>
                                <div className="text-sm text-muted-foreground truncate">{signal.description}</div>
                              </div>
                              <span className={`px-2 py-1 rounded text-xs border shrink-0 ${getSeverityColor(sevClass)}`}>{sev || '—'}</span>
                            </div>
                            <div className="flex justify-between gap-2 text-xs text-muted-foreground">
                              <span className="truncate">{theme}</span>
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
                      
                      <Button
                        onClick={() => goToPromote(selectedPattern)}
                        className="w-full bg-primary text-primary-foreground hover:bg-[#008394]"
                      >
                        <ShieldAlert className="w-4 h-4 mr-2" />
                        Promote to Risk
                      </Button>
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
    </div>
  );
}
