import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { AlertTriangle, Ambulance } from "lucide-react";
import { dashboardApi } from "@/services/dashboardApi";
import { toast } from "sonner";

export function DirectorDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [patternDetections, setPatternDetections] = useState<any[]>([]);
  const [sitePerformance, setSitePerformance] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
    loadPatternDetections();
    loadPerformance();
  }, []);

  const loadDashboardData = async () => {
    try {
      const data = await dashboardApi.getDashboardData('director');
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatternDetections = async () => {
    try {
      const patterns = await dashboardApi.getPatternDetections();
      setPatternDetections(patterns);
    } catch (error) {
           console.error('Failed to load pattern detections:', error);
    }
  };

  const loadPerformance = async () => {
    try {
      const perf = await dashboardApi.getSitePerformance();
      setSitePerformance(perf);
    } catch (error) {
      console.error('Failed to load site performance:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading strategic dashboard...</p>
        </div>
      </div>
    );
  }

  const organizationalSnapshot = dashboardData ? [
    { label: "Total Sites", value: dashboardData.overview.totalSites || sitePerformance.length || "5" },
    { label: "Active High Risks", value: dashboardData.overview.highPriorityRisks || "0" },
    { label: "Monthly Incidents", value: dashboardData.overview.seriousIncidents || "0" },
    { label: "Compliance Rate", value: `${(dashboardData.overview.complianceRate || 0).toFixed(1)}%` },
  ] : [];

  const seriousIncidentAlerts = dashboardData?.recentActivities
    ?.filter((activity: any) => activity.type === 'incident' && activity.severity === 'serious')
    .map((incident: any) => ({
      id: incident.id,
      house: incident.house,
      incidentDate: new Date(incident.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
      riskSignalsLogged: 3,
      escalationsTriggered: 2,
      leadershipReviews: 2,
      lastOversightReviewDays: 6,
      status: "under-review"
    })) || [];

  const riskCategories = dashboardData?.riskTrends ? 
    Object.entries(dashboardData.riskTrends.reduce((acc: any, trend: any) => {
      const category = trend.category || 'Other';
      if (!acc[category]) {
        acc[category] = { count: 0, trend: 'stable' };
      }
      acc[category].count += trend.count;
      return acc;
    }, {})).map(([category, data]: [string, any]) => ({
      category,
      count: data.count,
      trend: data.trend as string
    })) : [];

  const strategicInsights = patternDetections.map((pattern: any) => ({
    type: pattern.patternType || "Pattern Detection",
    detail: pattern.patternDescription || "Pattern detected",
    priority: pattern.severity === 'critical' ? 'High' : pattern.severity === 'high' ? 'High' : 'Medium'
  }));

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-primary">Strategic Dashboard</h1>
          <p className="text-muted-foreground mt-1">High-level strategic visibility across the organisation</p>
        </div>

        {/* Serious Incident Alert */}
        {seriousIncidentAlerts.length > 0 && (
          <div className="mb-6 bg-destructive/10 border-2 border-destructive p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <h2 className="text-xl font-bold text-destructive">Serious Incident Alert</h2>
            </div>
            {seriousIncidentAlerts.map((alert: any) => (
              <div key={alert.id} className="bg-card border border-destructive/20 rounded p-4 mb-4 last:mb-0 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Incident ID</div>
                    <div className="font-bold text-foreground">{alert.id.substring(0, 8)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Service</div>
                    <div className="font-bold text-foreground">{alert.house}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Date</div>
                    <div className="font-bold text-foreground">{alert.incidentDate}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Risk Signals</div>
                    <div className="font-bold text-foreground">{alert.riskSignalsLogged}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Escalations</div>
                    <div className="font-bold text-foreground">{alert.escalationsTriggered}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Last Oversight</div>
                    <div className="font-bold text-foreground">{alert.lastOversightReviewDays} days before</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/incidents/${alert.id}/timeline`)}
                    className="px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors text-sm font-medium shadow-sm"
                  >
                    View Governance Timeline
                  </button>
                  <button
                    onClick={() => navigate(`/incidents/${alert.id}/report`)}
                    className="px-4 py-2 bg-card text-destructive border border-destructive hover:bg-destructive/5 transition-colors text-sm font-medium shadow-sm"
                  >
                    View Reconstruction Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Organizational Snapshot */}
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-primary">Organizational Overview</h2>
              <div className="space-y-3">
                {organizationalSnapshot.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-foreground">{item.label}</span>
                    <span className="font-semibold text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Categories */}
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-primary">Risk Categories</h2>
              <div className="space-y-3">
                {riskCategories.length > 0 ? riskCategories.map((category: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-foreground">{category.category}</p>
                      <p className="text-sm text-muted-foreground">{category.count} active risks</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        category.trend === "up" ? "bg-destructive" :
                        category.trend === "down" ? "bg-success" :
                        "bg-warning"
                      }`}></span>
                      <span className="text-sm text-muted-foreground capitalize font-medium">{category.trend}</span>
                    </div>
                  </div>
                )) : (
                  <p className="text-muted-foreground text-center py-4 border border-dashed border-border rounded">No risk data available</p>
                )}
              </div>
            </div>

            {/* Strategic Insights */}
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-primary">Strategic Insights</h2>
              <div className="space-y-3">
                {strategicInsights.length > 0 ? (
                  strategicInsights.map((insight: any, idx: number) => (
                    <div key={idx} className="border-b border-border pb-3 last:border-b-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-foreground">{insight.type}</p>
                          <p className="text-sm text-muted-foreground">{insight.detail}</p>
                        </div>
                        <span className={`text-sm px-2 py-1 shadow-sm ${
                          insight.priority === "High" ? "bg-destructive text-destructive-foreground" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {insight.priority}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4 border border-dashed border-border rounded">No strategic insights available</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Site Performance */}
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-primary">Site Performance</h2>
              <div className="space-y-3">
                {sitePerformance.length > 0 ? sitePerformance.map((site: any, idx: number) => (
                  <div key={idx} className="border-b border-border pb-3 last:border-b-0">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-foreground">{site.house_name || 'Service Site'}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          Risks: <span className="text-foreground font-semibold">{site.risks_count}</span> | Incidents: <span className="text-foreground font-semibold">{site.incidents_count}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-bold ${
                          site.compliance_score > 90 ? "text-success" :
                          site.compliance_score > 70 ? "text-warning" :
                          "text-destructive"
                        }`}>
                          {Math.round(site.compliance_score || 0)}%
                        </span>
                        <p className="text-sm text-muted-foreground">Compliance</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-muted-foreground text-center py-4 border border-dashed border-border rounded">No site performance data available</p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card border-2 border-border p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4 text-primary">Strategic Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/incidents")}
                  className="w-full py-3 px-4 bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Ambulance className="w-5 h-5" />
                  Manage Serious Incidents
                </button>
                <button
                  onClick={() => navigate("/reports")}
                  className="w-full py-3 px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  Generate Monthly Report
                </button>
                <button
                  onClick={() => navigate("/trends")}
                  className="w-full py-3 px-4 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  View Risk Trends
                </button>
                <button
                  onClick={() => navigate("/engines")}
                  className="w-full py-3 px-4 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  Manage Computational Engines
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
