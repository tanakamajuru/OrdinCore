import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, LabelList } from "recharts";
import { apiClient } from "@/services/api";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useGovernanceRefresh } from "@/hooks/useGovernanceRefresh";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const OUTCOMES = ["Effective", "Partially Effective", "Not Effective", "Too Early To Assess"] as const;

export function ActionEffectivenessPanels() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const canRate = String((user as any)?.role || "").toUpperCase().replace(/-/g, "_") === "REGISTERED_MANAGER";
  // Inline effectiveness rating — works for any completed action awaiting a verdict, including
  // signal/service actions with no linked risk (which have no risk-detail page to rate from).
  const [rating, setRating] = useState<any>(null);
  const [outcome, setOutcome] = useState<string>("");
  const [evidence, setEvidence] = useState("");
  const [saving, setSaving] = useState(false);
  const openRating = (a: any) => { setRating(a); setOutcome(""); setEvidence(""); };
  const submitRating = async () => {
    if (!outcome) { toast.error("Choose an effectiveness outcome."); return; }
    if (outcome !== "Too Early To Assess" && evidence.trim().length < 20) { toast.error("Record the evidence for this outcome (at least 20 characters)."); return; }
    setSaving(true);
    try {
      await apiClient.patch(`/actions/${rating.id}/effectiveness`, { outcome, evidence: evidence.trim() });
      toast.success("Effectiveness recorded");
      setRating(null);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || "Could not record effectiveness");
    } finally { setSaving(false); }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response: any = await apiClient.get('/actions/effectiveness-summary');
      setData(response?.data?.data ?? response?.data ?? response);
    } catch (err) {
      console.error("Failed to load effectiveness summary", err);
      setData({ error: err instanceof Error ? err.message : 'Effectiveness information could not be loaded.' });
    } finally {
      setIsLoading(false);
    }
  };
  useGovernanceRefresh(loadData);

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  if (!data) return null;
  if (data.error) return <Card className="border-destructive/40"><CardContent className="p-5 text-sm text-destructive">{data.error}</CardContent></Card>;

  // Cast PG BigInt count strings to true JavaScript Numbers for Recharts compatibility
  const domainAnalysisWithNumbers = (data.domain_analysis || []).map((item: any) => ({
    ...item,
    effective: Number(item.effective || 0),
    neutral: Number(item.neutral || 0),
    ineffective: Number(item.ineffective || 0)
  }));

  const dailyTrendWithNumbers = (data.daily_trend || []).map((item: any) => ({
    ...item,
    effective: Number(item.effective || 0),
    partial: Number(item.partial || 0),
    ineffective: Number(item.ineffective || 0)
  }));

  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Org Summary Card */}
        <Card className="border-2 border-primary/20 shadow-sm bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg  uppercase  tracking-tighter text-foreground">Organisational Effectiveness (7D)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-card border-2 border-success/20">
              <span className=" text-success uppercase text-xs">Effective Actions</span>
              <span className="text-2xl ">{data.org_summary?.effective || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-card border-2 border-warning/20">
              <span className=" text-warning uppercase text-xs">Partially Effective</span>
              <span className="text-2xl ">{data.org_summary?.neutral || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-card border-2 border-destructive/20">
              <span className=" text-destructive uppercase text-xs">Not Effective</span>
              <span className="text-2xl ">{data.org_summary?.ineffective || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Domain Analysis */}
        <Card className="lg:col-span-2 border-2 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg  uppercase  tracking-tighter text-foreground">Effectiveness by Domain</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={domainAnalysisWithNumbers} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="domain" fontSize={10} fontWeight="bold" tick={{ fill: 'hsl(var(--foreground))' }} />
                <YAxis fontSize={10} tick={{ fill: 'hsl(var(--foreground))' }} />
                <Tooltip 
                  cursor={false}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" />
                <Bar dataKey="effective" fill="#10B981" stackId="a" name="Effective" radius={[0, 0, 0, 0]}>
                  <LabelList dataKey="effective" position="center" content={(props: any) => {
                    const { x, y, width, height, value } = props;
                    if (!value || Number(value) === 0) return null;
                    return (
                      <text x={x + width / 2} y={y + height / 2} fill="#fff" fontSize={10} fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                        {value}
                      </text>
                    );
                  }} />
                </Bar>
                <Bar dataKey="neutral" fill="#F59E0B" stackId="a" name="Partially Effective">
                  <LabelList dataKey="neutral" position="center" content={(props: any) => {
                    const { x, y, width, height, value } = props;
                    if (!value || Number(value) === 0) return null;
                    return (
                      <text x={x + width / 2} y={y + height / 2} fill="#fff" fontSize={10} fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                        {value}
                      </text>
                    );
                  }} />
                </Bar>
                <Bar dataKey="ineffective" fill="#EF4444" stackId="a" name="Not Effective">
                  <LabelList dataKey="ineffective" position="center" content={(props: any) => {
                    const { x, y, width, height, value } = props;
                    if (!value || Number(value) === 0) return null;
                    return (
                      <text x={x + width / 2} y={y + height / 2} fill="#fff" fontSize={10} fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                        {value}
                      </text>
                    );
                  }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      {(data.pending || []).length > 0 && (
        <Card className="border-2 border-border shadow-sm">
          <CardHeader><CardTitle className="text-lg uppercase tracking-tighter text-foreground">Awaiting effectiveness review ({data.pending_count})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.pending.map((a: any) => <div key={a.id} className="border-b border-border pb-2 text-sm flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-muted-foreground">{a.risk_title || a.signal_label || 'Governance action'} · {a.house_name || 'Organisation-wide'}{a.review_overdue ? ' · overdue' : ''}</p>
              </div>
              {canRate && <button onClick={() => openRating(a)} className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90">Review</button>}
            </div>)}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Comparison */}
        <Card className="border-2 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg  uppercase  tracking-tighter text-foreground">Service Performance Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b-2 border-border">
                  <TableHead className=" uppercase text-[10px] font-bold">Service Unit</TableHead>
                  <TableHead className="text-center  uppercase text-[10px] font-bold">Effective</TableHead>
                  <TableHead className="text-center  uppercase text-[10px] font-bold">Partially Effective</TableHead>
                  <TableHead className="text-center  uppercase text-[10px] font-bold">Not Effective</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.service_comparison || []).length > 0 ? (data.service_comparison || []).map((s: any) => (
                  <TableRow key={s.service_name} className="hover:bg-muted/20 border-b border-border">
                    <TableCell className=" font-medium">{s.service_name}</TableCell>
                    <TableCell className="text-center text-success font-bold">{s.effective}</TableCell>
                    <TableCell className="text-center text-warning font-bold">{s.neutral}</TableCell>
                    <TableCell className="text-center text-destructive font-bold">{s.ineffective}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">No data available for the current period</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card className="border-2 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg  uppercase  tracking-tighter text-foreground">Organisational Trajectory</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            {(!dailyTrendWithNumbers || dailyTrendWithNumbers.length === 0) ? (
              <div className="h-full flex items-center justify-center text-center px-6">
                <p className="text-sm text-muted-foreground max-w-sm">No effectiveness ratings yet — the trajectory builds as completed actions are reviewed and rated.</p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrendWithNumbers} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="day" 
                  fontSize={10} 
                  tick={{ fill: 'hsl(var(--foreground))' }}
                  tickFormatter={(val) => new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                />
                <YAxis fontSize={10} tick={{ fill: 'hsl(var(--foreground))' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" />
                <Line type="monotone" dataKey="effective" stroke="#10B981" strokeWidth={3} dot={{ r: 4, fill: '#10B981', strokeWidth: 0 }} activeDot={{ r: 6 }} name="Effective" />
                <Line type="monotone" dataKey="partial" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, fill: '#F59E0B', strokeWidth: 0 }} activeDot={{ r: 6 }} name="Partially Effective" />
                <Line type="monotone" dataKey="ineffective" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: '#EF4444', strokeWidth: 0 }} activeDot={{ r: 6 }} name="Not Effective" />
              </LineChart>
            </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {rating && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !saving && setRating(null)}>
          <div className="bg-card border-2 border-border rounded-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-foreground mb-1">Rate effectiveness</h2>
            <p className="text-sm text-muted-foreground mb-4">{rating.title}</p>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Did the action reduce the risk?</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {OUTCOMES.map((o) => (
                <button key={o} onClick={() => setOutcome(o)}
                  className={`px-3 py-2 rounded-lg border text-sm ${outcome === o ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>{o}</button>
              ))}
            </div>
            <label className="block text-sm text-muted-foreground mb-1">Evidence{outcome === "Too Early To Assess" ? " (optional)" : ""}</label>
            <textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} rows={3}
              className="w-full rounded-lg border-2 border-border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="What tells you this — recurrence, observation, records…" />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setRating(null)} disabled={saving} className="px-4 py-2 rounded-lg border border-border text-sm">Cancel</button>
              <button onClick={submitRating} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">{saving ? "Saving…" : "Record"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
