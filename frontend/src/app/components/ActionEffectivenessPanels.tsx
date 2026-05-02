import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { directorApi } from "@/services/directorApi";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";

export function ActionEffectivenessPanels() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const summary = await directorApi.getEffectivenessSummary();
      setData(summary);
    } catch (err) {
      console.error("Failed to load effectiveness summary", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  if (!data) return null;

  return (
    <div className="space-y-6 mb-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Org Summary Card */}
        <Card className="border-2 border-primary/20 shadow-sm bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase italic tracking-tighter text-primary">Organisational Effectiveness (7D)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-card border-2 border-success/20">
              <span className="font-bold text-success uppercase text-xs">Effective Actions</span>
              <span className="text-2xl font-black">{data.org_summary?.effective || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-card border-2 border-warning/20">
              <span className="font-bold text-warning uppercase text-xs">Neutral Outcomes</span>
              <span className="text-2xl font-black">{data.org_summary?.neutral || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-card border-2 border-destructive/20">
              <span className="font-bold text-destructive uppercase text-xs">Ineffective Actions</span>
              <span className="text-2xl font-black">{data.org_summary?.ineffective || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Domain Analysis */}
        <Card className="lg:col-span-2 border-2 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase italic tracking-tighter text-primary">Effectiveness by Domain</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.domain_analysis || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="domain" fontSize={10} fontStyle="italic" fontWeight="bold" />
                <YAxis fontSize={10} />
                <Tooltip />
                <Bar dataKey="effective" fill="hsl(var(--success))" stackId="a" />
                <Bar dataKey="neutral" fill="hsl(var(--warning))" stackId="a" />
                <Bar dataKey="ineffective" fill="hsl(var(--destructive))" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Comparison */}
        <Card className="border-2 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase italic tracking-tighter text-primary">Service Performance Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-bold uppercase text-[10px]">Service Unit</TableHead>
                  <TableHead className="text-center font-bold uppercase text-[10px]">Effective</TableHead>
                  <TableHead className="text-center font-bold uppercase text-[10px]">Neutral</TableHead>
                  <TableHead className="text-center font-bold uppercase text-[10px]">Ineffective</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data.service_comparison || []).map((s: any) => (
                  <TableRow key={s.service_name} className="hover:bg-muted/20">
                    <TableCell className="font-bold">{s.service_name}</TableCell>
                    <TableCell className="text-center text-success font-black">{s.effective}</TableCell>
                    <TableCell className="text-center text-warning font-black">{s.neutral}</TableCell>
                    <TableCell className="text-center text-destructive font-black">{s.ineffective}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Daily Trend */}
        <Card className="border-2 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-black uppercase italic tracking-tighter text-primary">Organisational Trajectory</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.daily_trend || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" fontSize={10} />
                <YAxis fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="effective" stroke="hsl(var(--success))" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="ineffective" stroke="hsl(var(--destructive))" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
