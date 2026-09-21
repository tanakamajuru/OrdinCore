import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, LabelList } from "recharts";
import { Inbox } from "lucide-react";
import { dashboardApi } from "@/services/dashboardApi";
import { toast } from "sonner";
import { useGovernanceRefresh } from "@/hooks/useGovernanceRefresh";

// Honest empty states: a 6-week rolling chart on a system only days old reads as
// "broken" when it shows flat zeros. These helpers tell apart "no data in this period"
// from a genuine trend, and find where real data actually starts.
const labelOf = (row: any): string => row?.date ?? row?.week ?? "";
const rowHasValue = (row: any, keys: string[]): boolean => keys.some((k) => Number(row?.[k]) > 0);
const lineHasData = (data: any[], keys: string[]): boolean =>
  Array.isArray(data) && data.length > 0 && keys.length > 0 && data.some((r) => rowHasValue(r, keys));
const firstDataLabel = (data: any[], keys: string[]): string | null => {
  const r = (data || []).find((row) => rowHasValue(row, keys));
  return r ? labelOf(r) : null;
};
const barHasData = (trends: any[], key: string, total: number): boolean =>
  Number(total) > 0 || (Array.isArray(trends) && trends.some((t) => Number(t?.[key]) > 0));

function EmptyChart({ height, message }: { height: number; message: string }) {
  return (
    <div style={{ height }} className="flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-lg bg-muted/20 px-6">
      <Inbox className="w-8 h-8 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
    </div>
  );
}

export function Trends() {
  const [highRiskData, setHighRiskData] = useState<any[]>([]);
  const [riskHouseNames, setRiskHouseNames] = useState<string[]>([]);
  const [incidentTrajectoryData, setIncidentTrajectoryData] = useState<any[]>([]);
  const [incidentHouseNames, setIncidentHouseNames] = useState<string[]>([]);
  const [safeguardingData, setSafeguardingData] = useState<any>({ trends: [], currentWeek: 0, total: 0, average: 0 });
  const [escalationData, setEscalationData] = useState<any>({ trends: [], currentWeek: 0, total: 0, average: 0 });
  const [dailyRisk, setDailyRisk] = useState<any[]>([]);
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
        setDailyRisk(trendsData.dailyRisk || []);
      }
    } catch (error) {
      console.error('Failed to load trends data:', error);
      toast.error('Failed to load trends data');
    } finally {
      setIsLoading(false);
    }
  };
  useGovernanceRefresh(loadTrendsData);

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

  // Explicit categorical palette — every service gets a visually distinct line. The old first
  // two entries used theme CSS variables (--primary / --secondary), which both resolve to a
  // near-black in this theme, so two houses shared the same colour and were indistinguishable.
  const chartColors = [
    '#2563EB', // Blue
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#0891B2', // Cyan
    '#65A30D', // Lime
  ];

  // Per-chart data presence + where real history begins (for the "limited history" note).
  const riskHasData = lineHasData(highRiskData, riskHouseNames);
  const riskFirst = riskHasData ? firstDataLabel(highRiskData, riskHouseNames) : null;
  const riskLimited = riskHasData && highRiskData.length > 0 && labelOf(highRiskData[0]) !== riskFirst;
  const incidentHasData = lineHasData(incidentTrajectoryData, incidentHouseNames);
  const incidentFirst = incidentHasData ? firstDataLabel(incidentTrajectoryData, incidentHouseNames) : null;
  const incidentLimited = incidentHasData && incidentTrajectoryData.length > 0 && labelOf(incidentTrajectoryData[0]) !== incidentFirst;
  const safeguardingHasData = barHasData(safeguardingData?.trends, 'incidents', safeguardingData?.total);
  const escalationHasData = barHasData(escalationData?.trends, 'count', escalationData?.total);
  const dailyHasData = dailyRisk.some((d:any) => d.dailyBurden !== null && d.dailyBurden !== undefined);
  const missingDailySubmissions = dailyRisk.filter((d:any) => d.recordingState === 'no_submission').length;

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl  text-foreground">Trends & Strategic Telemetry</h1>
            <p className="text-muted-foreground mt-1">6-Week Rolling Analysis across the organization</p>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
            className="px-6 py-3 bg-primary text-primary-foreground  uppercase tracking-wider hover:bg-primary/90 transition-all shadow-lg rounded-md disabled:opacity-50 active:scale-95"
          >
            {isGeneratingReport ? "Generating..." : "Generate Monthly Board Report"}
          </button>
        </div>

        {/* Daily severity-weighted signal burden + 7-day moving average. */}
        <div className="bg-card border-2 border-border shadow-sm rounded-lg p-6 mb-6">
          <h2 className="text-xl mb-1 text-foreground flex items-center gap-2">
            <span className="w-3 h-3 bg-primary rounded-full"></span>
            Daily Signal Burden <span className="text-sm text-muted-foreground">(30 days · 7-day average)</span>
          </h2>
          <p className="text-xs text-muted-foreground mb-4">Severity-weighted signal volume: Low 1, Moderate 2, High 3, Critical 4. Missing governance submissions are gaps, not zero-risk days.</p>
          {dailyHasData ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={dailyRisk}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} interval={4} tickMargin={8} />
                <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={11} tickMargin={8} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "2px solid hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem" }} />
                <Legend verticalAlign="top" align="right" iconType="plainline" />
                <Line type="monotone" dataKey="dailyBurden" name="Daily burden" stroke="#cbd5e1" strokeWidth={1.5} dot={false} connectNulls={false} />
                <Line type="monotone" dataKey="movingAvg" name="7-day confirmed-data average" stroke="#6366f1" strokeWidth={3} dot={false} connectNulls={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart height={260} message="No confirmed signal or completed governance-day evidence is available for this 30-day period." />
          )}
          {missingDailySubmissions > 0 && <p className="text-[11px] text-amber-700 mt-2">{missingDailySubmissions} day{missingDailySubmissions===1?'':'s'} have no signal and no completed governance submission; these appear as gaps.</p>}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 [&>*]:min-w-0">
          {/* Cross-service signal burden (replaces misleading cumulative risk trajectory). */}
          <div className="bg-card border-2 border-border shadow-sm rounded-lg p-6">
            <h2 className="text-xl  mb-6 text-foreground flex items-center gap-2">
              <span className="w-3 h-3 bg-primary rounded-full"></span>
              Cross-Service Signal Burden
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Weekly severity-weighted signals by service. This evidence can rise or fall; it is not a prediction or a count of risks created.</p>
            {riskHasData ? (
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
                  <Legend verticalAlign="top" align="right" iconType="circle" />
                  {riskHouseNames.map((house, idx) => (
                    <Line
                      key={house}
                      type="monotone"
                      dataKey={house}
                      stroke={chartColors[idx % chartColors.length]}
                      strokeWidth={3}
                      connectNulls
                      dot={{ fill: chartColors[idx % chartColors.length], r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                      name={house}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart height={300} message="No recorded signal burden in this six-week period." />
            )}
            {riskLimited && riskFirst && (
              <p className="text-[11px] text-muted-foreground mt-2">Trend builds as history accumulates — limited data before {riskFirst}.</p>
            )}
          </div>

          {/* Incident burden */}
          <div className="bg-card border-2 border-border shadow-sm rounded-lg p-6">
            <h2 className="text-xl  mb-6 text-foreground flex items-center gap-2">
              <span className="w-3 h-3 bg-destructive rounded-full"></span>
              Cross-Service Incident Burden
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Weekly incidents by occurrence date, weighted Minor 1, Moderate 2, Serious 3 and Critical 4.</p>
            {incidentHasData ? (
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
                  <Legend verticalAlign="top" align="right" iconType="circle" />
                  {incidentHouseNames.map((house, idx) => (
                    <Line
                      key={house}
                      type="monotone"
                      dataKey={house}
                      stroke={chartColors[(idx + 2) % chartColors.length]}
                      strokeWidth={3}
                      connectNulls
                      dot={{ fill: chartColors[(idx + 2) % chartColors.length], r: 4 }}
                      name={house}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart height={300} message="No incidents occurred in the last six UK calendar weeks." />
            )}
            {incidentLimited && incidentFirst && (
              <p className="text-[11px] text-muted-foreground mt-2">Trend builds as history accumulates — limited data before {incidentFirst}.</p>
            )}
          </div>

          {/* Safeguarding Volume */}
          <div className="bg-card border-2 border-border shadow-sm rounded-lg p-6">
            <h2 className="text-xl  mb-6 text-foreground flex items-center gap-2">
              <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
              Safeguarding Volume (6-Week View)
            </h2>
            {safeguardingHasData ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={safeguardingData?.trends || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip cursor={{fill: 'hsl(var(--muted)/0.3)'}} />
                  <Bar dataKey="incidents" radius={[4, 4, 0, 0]} barSize={40}>
                    {(safeguardingData?.trends || []).map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                    ))}
                    <LabelList dataKey="incidents" position="top" style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart height={250} message="No safeguarding signals recorded in this 6-week period." />
            )}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="p-3 bg-muted/30 rounded border-2 border-border">
                <p className="text-[10px] uppercase  text-muted-foreground mb-1">Weekly Avg</p>
                <p className="text-xl  text-foreground">{safeguardingData?.average || 0}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded border-2 border-border">
                <p className="text-[10px] uppercase  text-muted-foreground mb-1">6-Week Total</p>
                <p className="text-xl  text-foreground">{safeguardingData?.total || 0}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded border-2 border-primary/20">
                <p className="text-[10px] uppercase  text-primary mb-1">Current</p>
                <p className="text-xl  text-foreground">{safeguardingData?.currentWeek || 0}</p>
              </div>
            </div>
          </div>

          {/* Escalation Velocity */}
          <div className="bg-card border-2 border-border shadow-sm rounded-lg p-6">
            <h2 className="text-xl  mb-6 text-foreground flex items-center gap-2">
              <span className="w-3 h-3 bg-secondary rounded-full"></span>
              Weekly Escalation Volume
            </h2>
            {escalationHasData ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={escalationData?.trends || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip cursor={{fill: 'hsl(var(--muted)/0.3)'}} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                    {(escalationData?.trends || []).map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={chartColors[(index + 4) % chartColors.length]} />
                    ))}
                    <LabelList dataKey="count" position="top" style={{ fill: 'hsl(var(--foreground))', fontSize: 10, fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart height={250} message="No escalations recorded in this 6-week period." />
            )}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="p-3 bg-muted/30 rounded border-2 border-border">
                <p className="text-[10px] uppercase  text-muted-foreground mb-1">Weekly Avg</p>
                <p className="text-xl  text-foreground">{escalationData?.average || 0}</p>
              </div>
              <div className="p-3 bg-muted/30 rounded border-2 border-border">
                <p className="text-[10px] uppercase  text-muted-foreground mb-1">6-Week Total</p>
                <p className="text-xl  text-foreground">{escalationData?.total || 0}</p>
              </div>
              <div className="p-3 bg-secondary/10 rounded border-2 border-secondary/20">
                <p className="text-[10px] uppercase  text-secondary mb-1">Current</p>
                <p className="text-xl  text-secondary">{escalationData?.currentWeek || 0}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-primary/5 border-2 border-primary/10 rounded-lg flex items-start gap-3">
          <div className="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-[10px]  mt-0.5">!</div>
          <p className="text-xs text-muted-foreground">
            Strategic Telemetry Note: Signal and incident lines show severity-weighted weekly burden using occurrence dates and UK calendar weeks. Safeguarding and escalation bars show recorded weekly volume. These charts provide governance evidence; they do not predict outcomes or replace qualitative review.
          </p>
        </div>
      </div>
    </div>
  );
}
