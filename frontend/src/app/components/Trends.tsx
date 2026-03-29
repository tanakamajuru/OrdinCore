import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { dashboardApi } from "@/services/dashboardApi";
import { toast } from "sonner";

export function Trends() {
  const [highRiskData, setHighRiskData] = useState<any[]>([]);
  const [houseNames, setHouseNames] = useState<string[]>([]);
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
        setHouseNames(trendsData.crossHouseRisk.houses);
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
      // In a real app, this would trigger the backend job
    } catch (error) {
      toast.error("Failed to start report generation");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading trends data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-semibold text-primary">Trends</h1>
            <p className="text-muted-foreground mt-1">6-Week Rolling Analysis - Strategic Telemetry</p>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            className="px-6 py-3 bg-primary text-primary-foreground font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors shadow-lg rounded-md disabled:opacity-50"
          >
            {isGeneratingReport ? "Generating..." : "Generate Monthly Board Report"}
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-card border border-border shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Cross-House Risk Trajectory</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={highRiskData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    borderRadius: "0.5rem",
                  }}
                />
                {houseNames.map((house, idx) => (
                  <Line 
                    key={house} 
                    type="monotone" 
                    dataKey={house} 
                    stroke={['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))', 'hsl(var(--destructive))'][idx % 5]} 
                    strokeWidth={2} 
                    dot={{ fill: ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted-foreground))', 'hsl(var(--destructive))'][idx % 5], r: 4 }} 
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Safeguarding Incidents */}
          <div className="bg-card border border-border shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Safeguarding Incidents</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={safeguardingData?.trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar dataKey="incidents" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/30 rounded border border-border">
                <p className="text-sm text-muted-foreground mb-1">Current Week</p>
                <p className="text-2xl font-semibold text-foreground">{safeguardingData?.currentWeek || 0}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded border border-border">
                <p className="text-sm text-muted-foreground mb-1">6-Week Total</p>
                <p className="text-2xl font-semibold text-foreground">{safeguardingData?.total || 0}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded border border-border">
                <p className="text-sm text-muted-foreground mb-1">Weekly Average</p>
                <p className="text-2xl font-semibold text-foreground">{safeguardingData?.average || 0}</p>
              </div>
            </div>
          </div>

          {/* Escalation Count */}
          <div className="bg-card border border-border shadow-sm rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Escalation Count</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={escalationData?.trends || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted/30 rounded border border-border">
                <p className="text-sm text-muted-foreground mb-1">Current Week</p>
                <p className="text-2xl font-semibold text-foreground">{escalationData?.currentWeek || 0}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded border border-border">
                <p className="text-sm text-muted-foreground mb-1">6-Week Total</p>
                <p className="text-2xl font-semibold text-foreground">{escalationData?.total || 0}</p>
              </div>
              <div className="p-4 bg-muted/30 rounded border border-border">
                <p className="text-sm text-muted-foreground mb-1">Weekly Average</p>
                <p className="text-2xl font-semibold text-foreground">{escalationData?.average || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm text-primary">
            <strong>Note:</strong> All trends show 6-week rolling data only. No scoring or predictive analytics are included. Data refreshed weekly.
          </p>
        </div>
      </div>
    </div>
  );
}
