import { useState } from "react";
import { TrendingUp, AlertTriangle, MapPin, Calendar, Filter, Search, Eye } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

interface RiskPattern {
  id: string;
  patternType: string;
  description: string;
  affectedHouses: string[];
  severity: "low" | "medium" | "high";
  firstDetected: string;
  frequency: number;
  trend: "increasing" | "stable" | "decreasing";
  relatedIncidents: number;
}

interface HouseSignal {
  houseId: string;
  houseName: string;
  signal: string;
  category: string;
  severity: "low" | "medium" | "high";
  detectedDate: string;
  frequency: number;
}

const mockPatterns: RiskPattern[] = [
  {
    id: "PATTERN-001",
    patternType: "Medication Refusal",
    description: "Increasing medication refusal patterns across multiple houses",
    affectedHouses: ["House B", "House D"],
    severity: "high",
    firstDetected: "2024-01-05",
    frequency: 8,
    trend: "increasing",
    relatedIncidents: 1
  },
  {
    id: "PATTERN-002", 
    patternType: "Staffing Pressure",
    description: "Staffing shortages reported during night shifts",
    affectedHouses: ["House A", "House C"],
    severity: "medium",
    firstDetected: "2024-01-08",
    frequency: 5,
    trend: "stable",
    relatedIncidents: 0
  },
  {
    id: "PATTERN-003",
    patternType: "Behavioral Escalation",
    description: "Weekend behavioral escalation patterns",
    affectedHouses: ["House B", "House E"],
    severity: "medium",
    firstDetected: "2024-01-12",
    frequency: 4,
    trend: "decreasing",
    relatedIncidents: 0
  }
];

const mockHouseSignals: HouseSignal[] = [
  {
    houseId: "house-b",
    houseName: "House B",
    signal: "Medication refusal increasing",
    category: "Clinical",
    severity: "high",
    detectedDate: "2024-01-05",
    frequency: 3
  },
  {
    houseId: "house-d",
    houseName: "House D", 
    signal: "Medication refusal increasing",
    category: "Clinical",
    severity: "medium",
    detectedDate: "2024-01-08",
    frequency: 2
  },
  {
    houseId: "house-a",
    houseName: "House A",
    signal: "Staffing pressure - night shifts",
    category: "Operational",
    severity: "medium",
    detectedDate: "2024-01-08",
    frequency: 2
  },
  {
    houseId: "house-c",
    houseName: "House C",
    signal: "Staffing pressure - night shifts", 
    category: "Operational",
    severity: "medium",
    detectedDate: "2024-01-10",
    frequency: 1
  }
];

export function CrossHousePatternDetection() {
  const [patterns, setPatterns] = useState<RiskPattern[]>(mockPatterns);
  const [houseSignals, setHouseSignals] = useState<HouseSignal[]>(mockHouseSignals);
  const [selectedPattern, setSelectedPattern] = useState<RiskPattern | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | "low" | "medium" | "high">("all");

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
      default: return "bg-gray-100 text-gray-800 border-gray-300";
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
      case "stable": return "text-gray-600";
      default: return "text-gray-600";
    }
  };

  const getRelatedSignals = (pattern: RiskPattern) => {
    return houseSignals.filter(signal => 
      signal.signal.toLowerCase().includes(pattern.patternType.toLowerCase()) ||
      pattern.affectedHouses.includes(signal.houseName)
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Cross-House Pattern Detection</h1>
          <p className="text-gray-600">Identify and analyze recurring risk patterns across all services</p>
        </div>

        {/* Filters */}
        <Card className="border-2 border-black mb-6">
          <CardContent className="p-6">
            <div className="flex gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search patterns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-black"
                />
              </div>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="px-3 py-2 border-2 border-black rounded"
              >
                <option value="all">All Severities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <Button variant="outline" className="border-black hover:bg-black hover:text-white">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patterns List */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-black">
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
                          ? "border-black bg-gray-50" 
                          : "border-gray-300 hover:border-black"
                      }`}
                      onClick={() => setSelectedPattern(pattern)}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-black">{pattern.patternType}</h3>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(pattern.severity)}`}>
                              {pattern.severity.toUpperCase()}
                            </span>
                            <span className={`text-sm font-medium ${getTrendColor(pattern.trend)}`}>
                              {getTrendIcon(pattern.trend)} {pattern.trend}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{pattern.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
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
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded border">
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
                <Card className="border-2 border-black">
                  <CardHeader>
                    <CardTitle className="text-lg">Pattern Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Pattern Type</div>
                        <div className="font-bold text-black">{selectedPattern.patternType}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Description</div>
                        <div className="text-sm text-gray-700">{selectedPattern.description}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Severity</div>
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(selectedPattern.severity)}`}>
                          {selectedPattern.severity.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Trend</div>
                        <div className={`font-medium ${getTrendColor(selectedPattern.trend)}`}>
                          {getTrendIcon(selectedPattern.trend)} {selectedPattern.trend}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Affected Houses</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedPattern.affectedHouses.map((house, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded border">
                              {house}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Related Signals */}
                <Card className="border-2 border-black">
                  <CardHeader>
                    <CardTitle className="text-lg">Related Signals</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {getRelatedSignals(selectedPattern).map((signal, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded border">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="font-medium text-black text-sm">{signal.houseName}</div>
                              <div className="text-sm text-gray-600">{signal.signal}</div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(signal.severity)}`}>
                              {signal.severity}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
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
                <Card className="border-2 border-black">
                  <CardHeader>
                    <CardTitle className="text-lg">Leadership Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                        <div className="font-medium text-orange-900 mb-1">Immediate Action Required</div>
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
                      
                      <Button className="w-full bg-black text-white hover:bg-gray-800">
                        <Eye className="w-4 h-4 mr-2" />
                        View Full Analysis
                      </Button>
                      <Button variant="outline" className="w-full border-black hover:bg-black hover:text-white">
                        Add to Governance Review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-2 border-black">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-gray-600">Select a pattern to view details</div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
