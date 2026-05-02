import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { AlertTriangle, Ambulance } from "lucide-react";
import { dashboardApi } from "@/services/dashboardApi";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import { ActionEffectivenessPanels } from "./ActionEffectivenessPanels";
import { ControlFailurePanel } from "./ControlFailurePanel";
import { directorApi } from "@/services/directorApi";
import { Shield, Clock, AlertCircle } from "lucide-react";


export function DirectorDashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [patternDetections, setPatternDetections] = useState<any[]>([]);
  const [sitePerformance, setSitePerformance] = useState<any[]>([]);
  const [unacknowledgedIncidents, setUnacknowledgedIncidents] = useState<any[]>([]);


  useEffect(() => {
    loadDashboardData();
    loadPatternDetections();
    loadPerformance();
    loadUnacknowledgedIncidents();
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
      let thresholdEvents = [];
      try {
        const tRes = await apiClient.get('/threshold-events?output_type=Control Failure');
        thresholdEvents = (tRes as any).data || [];
      } catch (err) {
        // Fallback or ignore if endpoint doesn't exist
      }
      
      const formattedEvents = thresholdEvents.map((t: any) => ({
        type: t.rule_name || "Control Failure",
        detail: t.description || "Repeated control failure detected",
        priority: "High"
      }));

      const formattedPatterns = patterns.map((pattern: any) => ({
        type: pattern.patternType || "Pattern Detection",
        detail: pattern.patternDescription || "Pattern detected",
        priority: pattern.severity === 'critical' ? 'High' : pattern.severity === 'high' ? 'High' : 'Medium'
      }));

      setPatternDetections([...formattedEvents, ...formattedPatterns]);
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

  const loadUnacknowledgedIncidents = async () => {
    try {
      const data = await directorApi.getUnacknowledgedIncidents();
      setUnacknowledgedIncidents(data);
    } catch (err) {
      console.error('Failed to load unacknowledged incidents:', err);
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

  const strategicInsights = patternDetections;

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-primary">Strategic Dashboard</h1>
          <p className="text-muted-foreground mt-1">High-level strategic visibility across the organisation</p>
        </div>

        {/* P1: Statutory Escalation View - Unacknowledged Serious Incidents */}
        {unacknowledgedIncidents.length > 0 && (
          <div className="mb-6 bg-destructive/10 border-4 border-destructive p-6 shadow-[8px_8px_0px_rgba(239,68,68,0.2)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-destructive" />
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-destructive">Statutory Escalation: Unacknowledged Incidents</h2>
              </div>
              <span className="bg-destructive text-primary-foreground px-3 py-1 font-black uppercase text-sm animate-pulse">Critical Governance Breach</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unacknowledgedIncidents.map((incident: any) => (
                <div key={incident.id} className="bg-card border-2 border-destructive p-4 group hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase bg-destructive text-primary-foreground px-2 py-0.5">{incident.severity}</span>
                    <span className="flex items-center gap-1 text-[10px] font-bold text-destructive">
                      <Clock className="w-3 h-3" />
                      {Math.round(incident.age_hours)}H UNACKNOWLEDGED
                    </span>
                  </div>
                  <h3 className="font-black text-primary uppercase italic tracking-tighter mb-1">{incident.title}</h3>
                  <p className="text-xs font-bold text-muted-foreground mb-3">{incident.house_name}</p>
                  <Button 
                    className="w-full bg-destructive text-primary-foreground hover:bg-destructive/90 font-bold uppercase text-xs rounded-none"
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                  >
                    Direct Intervention
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* P0: Action Effectiveness Summary */}
        <ActionEffectivenessPanels />

        {/* P0: Control Failure Detection */}
        <ControlFailurePanel />


        {/* Governance Oversight: Services Without RM Review - NEW */}
        <div className="mb-6 bg-warning/5 border-2 border-warning/20 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-warning" />
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-primary">Governance Oversight: RM Reviews</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sitePerformance.filter(s => (s.compliance_score || 0) < 100).map((site: any) => (
              <div key={site.house_id} className="bg-card border-2 border-border p-4 flex justify-between items-center group hover:border-warning/50 transition-all">
                <div>
                  <p className="font-black text-foreground uppercase italic tracking-tighter">{site.house_name}</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase">Last Review: {site.last_review_date ? new Date(site.last_review_date).toLocaleDateString() : 'NEVER'}</p>
                </div>
                <div className="text-right">
                   <span className={`text-[10px] font-black uppercase px-2 py-1 ${
                     !site.last_review_date || new Date(site.last_review_date) < new Date(Date.now() - 48*60*60*1000) 
                       ? 'bg-destructive text-destructive-foreground' 
                       : 'bg-warning text-warning-foreground'
                   }`}>
                     {!site.last_review_date || new Date(site.last_review_date) < new Date(Date.now() - 48*60*60*1000) ? '48H+ OVERDUE' : 'DUE'}
                   </span>
                </div>
              </div>
            ))}
            {sitePerformance.filter(s => (s.compliance_score || 0) < 100).length === 0 && (
              <div className="col-span-3 text-center py-6 text-muted-foreground border border-dashed border-border font-bold italic uppercase tracking-widest text-sm opacity-50">
                All services have completed daily oversight reviews.
              </div>
            )}
          </div>
        </div>

        {/* Serious Incident Alert */}

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
            {/* <div className="bg-card border-2 border-border p-6 shadow-sm">
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
            </div> */}
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
                {/* <button
                  onClick={() => navigate("/engines")}
                  className="w-full py-3 px-4 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  Manage Computational Engines
                </button> */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
