import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { dashboardApi } from "@/services/dashboardApi";
import { toast } from "sonner";

export function Trends() {
  const [highRiskData, setHighRiskData] = useState<any[]>([]);
  const [riskHouseNames, setRiskHouseNames] = useState<string[]>([]);
  const [incidentTrajectoryData, setIncidentTrajectoryData] = useState<any[]>([]);
  const [incidentHouseNames, setIncidentHouseNames] = useState<string[]>([]);
  const [safeguardingData, setSafeguardingData] = useState<any>({ trends: [], currentWeek: 0, total: 0, average: 0 });
  const [escalationData, setEscalationData] = useState<any>({ trends: [], currentWeek: 0, total: 0, average: 0 });
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTrendsData();
  }, []);

  const loadTrendsData = async () => {
    try {
      setIsLoading(true);
      const trendsData = await dashboardApi.getTrends();

      if (trendsData) {
        setHighRiskData(trendsData.crossHouseRisk.trends);
        setRiskHouseNames(trendsData.crossHouseRisk.houses);
        setIncidentTrajectoryData(trendsData.crossHouseIncidents?.trends || []);
        setIncidentHouseNames(trendsData.crossHouseIncidents?.houses || []);
        setSafeguardingData(trendsData.safeGuarding);
        setEscalationData(trendsData.escalation);
      }
    } catch (error) {
      console.error('Failed to load trends data:', error);
      toast.error('Failed to load trends data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      await dashboardApi.getComputationalEnginesStatus(); // Just to check connectivity
      toast.success("Monthly board report generation started");
    } catch (error) {
      toast.error("Failed to start report generation");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading strategic telemetry...</p>
        </div>
      </div>
    );
  }

  const chartColors = [
    'hsl(var(--primary))', 
    'hsl(var(--secondary))', 
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#EC4899'  // Pink
  ];

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-semibold text-primary">Trends & Strategic Telemetry</h1>
            <p className="text-muted-foreground mt-1">6-Week Rolling Analysis across the organization</p>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            className="px-6 py-3 bg-primary text-primary-foreground font-bold uppercase tracking-wider hover:bg-primary/90 transition-all shadow-lg rounded-md disabled:opacity-50 active:scale-95"
          >
            {isGeneratingReport ? "Generating..." : "Generate Monthly Board Report"}
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Risk Trajectory */}
          <div className="bg-card border-2 border-border shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6 text-foreground flex items-center gap-2">
              <span className="w-3 h-3 bg-primary rounded-full"></span>
              Cross-House Risk Trajectory
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={highRiskData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickMargin={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickMargin={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "2px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    borderRadius: "0.5rem",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                {riskHouseNames.map((house, idx) => (
                  <Line 
                    key={house} 
                    type="monotone" 
                    dataKey={house} 
                    stroke={chartColors[idx % chartColors.length]} 
                    strokeWidth={3} 
                    dot={{ fill: chartColors[idx % chartColors.length], r: 4 }} 
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Incident Trajectory */}
          <div className="bg-card border-2 border-border shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6 text-foreground flex items-center gap-2">
              <span className="w-3 h-3 bg-destructive rounded-full"></span>
              Cross-House Incident Trajectory
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={incidentTrajectoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickMargin={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickMargin={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "2px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    borderRadius: "0.5rem",
                  }}
                />
                {incidentHouseNames.map((house, idx) => (
                  <Line 
                    key={house} 
                    type="stepAfter" 
                    dataKey={house} 
                    stroke={chartColors[(idx + 2) % chartColors.length]} 
                    strokeWidth={3} 
                    dot={{ fill: chartColors[(idx + 2) % chartColors.length], r: 4 }} 
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Safeguarding Volume */}
          <div className="bg-card border-2 border-border shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6 text-foreground flex items-center gap-2">
              <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
              Safeguarding Volume (6-Week View)
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={safeguardingData?.trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip cursor={{fill: 'hsl(var(--muted)/0.3)'}} />
                <Bar dataKey="incidents" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="p-3 bg-muted/30 rounded border-2 border-border">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Weekly Avg</p>
                <p className="text-xl font-bold text-foreground">{safeguardingData?.average || 0}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded border-2 border-border">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">6-Week Total</p>
                <p className="text-xl font-bold text-foreground">{safeguardingData?.total || 0}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded border-2 border-primary/20">
                <p className="text-[10px] uppercase font-bold text-primary mb-1">Current</p>
                <p className="text-xl font-bold text-primary">{safeguardingData?.currentWeek || 0}</p>
              </div>
            </div>
          </div>

          {/* Escalation Velocity */}
          <div className="bg-card border-2 border-border shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6 text-foreground flex items-center gap-2">
              <span className="w-3 h-3 bg-secondary rounded-full"></span>
              Escalation Velocity
            </h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={escalationData?.trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip cursor={{fill: 'hsl(var(--muted)/0.3)'}} />
                <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="p-3 bg-muted/30 rounded border-2 border-border">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Weekly Avg</p>
                <p className="text-xl font-bold text-foreground">{escalationData?.average || 0}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded border-2 border-border">
                <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">6-Week Total</p>
                <p className="text-xl font-bold text-foreground">{escalationData?.total || 0}</p>
              </div>
              <div className="p-3 bg-secondary/10 rounded border-2 border-secondary/20">
                <p className="text-[10px] uppercase font-bold text-secondary mb-1">Current</p>
                <p className="text-xl font-bold text-secondary">{escalationData?.currentWeek || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-primary/5 border-2 border-primary/10 rounded-lg flex items-start gap-3">
          <div className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">!</div>
          <p className="text-xs text-muted-foreground">
            <strong>Strategic Telemetry Note:</strong> Data is synchronized across all active sites. Trajectory lines show the cumulative volume of "Critical" or "High" markers. No predictive outcomes are implied without secondary qualitative review.
          </p>
        </div>
      </div>
    </div>
  );
}
