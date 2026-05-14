import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { TrendingUp, AlertTriangle, MapPin, Calendar, Filter, Search, Eye } from "lucide-react";
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

  const getRelatedSignals = (pattern: RiskPattern) => {
    return []; // Future implementation: fetch signals for cluster
  };

  const handleViewAnalysis = (pattern: RiskPattern) => {
    toast.info(`Opening detailed analysis for ${pattern.description}`);
    // Navigate to incidents with domain filter if possible, or just keep them here for now
    navigate("/incidents");
  };

  const handleAddToReview = async (pattern: RiskPattern) => {
    try {
      await apiClient.post('/director-governance/interventions', {
        service_id: pattern.houseIds[0], // Using first house as primary target
        intervention_type: 'Strategic Review',
        message: `Governance Pattern Detected: ${pattern.description}`,
        priority: pattern.severity === 'high' ? 'Critical' : 'High'
      });
      toast.success("Pattern added to Governance Review queue");
    } catch (err) {
      toast.error("Failed to add pattern to review");
    }
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
          <h1 className="text-3xl  text-foreground mb-2">Cross-House Pattern Detection</h1>
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
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <Button variant="outline" className="border-border hover:bg-primary hover:text-primary-foreground">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                      onClick={() => setSelectedPattern(pattern)}
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
                        <div className="text-sm text-muted-foreground mb-1">Affected Houses</div>
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
                      {getRelatedSignals(selectedPattern).map((signal, index) => (
                        <div key={index} className="p-3 bg-muted rounded border">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className=" text-foreground text-sm">{signal.houseName}</div>
                              <div className="text-sm text-muted-foreground">{signal.signal}</div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs  border ${getSeverityColor(signal.severity)}`}>
                              {signal.severity}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{signal.category}</span>
                            <span>{signal.frequency} occurrences</span>
                            <span>{new Date(signal.detectedDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
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
                        onClick={() => handleViewAnalysis(selectedPattern)}
                        className="w-full bg-primary text-primary-foreground hover:bg-[#008394]"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Full Analysis
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleAddToReview(selectedPattern)}
                        className="w-full border-border hover:bg-primary hover:text-primary-foreground"
                      >
                        Add to Governance Review
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
