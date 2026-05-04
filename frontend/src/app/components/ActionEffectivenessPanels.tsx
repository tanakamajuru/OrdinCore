import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, LabelList } from "recharts";
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
            <CardTitle className="text-lg  uppercase  tracking-tighter text-primary">Organisational Effectiveness (7D)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-card border-2 border-success/20">
              <span className=" text-success uppercase text-xs">Effective Actions</span>
              <span className="text-2xl ">{data.org_summary?.effective || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-card border-2 border-warning/20">
              <span className=" text-warning uppercase text-xs">Neutral Outcomes</span>
              <span className="text-2xl ">{data.org_summary?.neutral || 0}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-card border-2 border-destructive/20">
              <span className=" text-destructive uppercase text-xs">Ineffective Actions</span>
              <span className="text-2xl ">{data.org_summary?.ineffective || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Domain Analysis */}
        <Card className="lg:col-span-2 border-2 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg  uppercase  tracking-tighter text-primary">Effectiveness by Domain</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.domain_analysis || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="domain" fontSize={10} fontWeight="bold" tick={{ fill: 'hsl(var(--foreground))' }} />
                <YAxis fontSize={10} tick={{ fill: 'hsl(var(--foreground))' }} />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" />
                <Bar dataKey="effective" fill="#10B981" stackId="a" name="Effective" radius={[0, 0, 0, 0]}>
                  <LabelList dataKey="effective" position="center" style={{ fill: '#fff', fontSize: 10, fontWeight: 'bold' }} />
                </Bar>
                <Bar dataKey="neutral" fill="#F59E0B" stackId="a" name="Neutral">
                  <LabelList dataKey="neutral" position="center" style={{ fill: '#fff', fontSize: 10, fontWeight: 'bold' }} />
                </Bar>
                <Bar dataKey="ineffective" fill="#EF4444" stackId="a" name="Ineffective">
                  <LabelList dataKey="ineffective" position="center" style={{ fill: '#fff', fontSize: 10, fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Service Comparison */}
        <Card className="border-2 border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg  uppercase  tracking-tighter text-primary">Service Performance Matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-b-2 border-border">
                  <TableHead className=" uppercase text-[10px] font-bold">Service Unit</TableHead>
                  <TableHead className="text-center  uppercase text-[10px] font-bold">Effective</TableHead>
                  <TableHead className="text-center  uppercase text-[10px] font-bold">Neutral</TableHead>
                  <TableHead className="text-center  uppercase text-[10px] font-bold">Ineffective</TableHead>
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
            <CardTitle className="text-lg  uppercase  tracking-tighter text-primary">Organisational Trajectory</CardTitle>
          </CardHeader>
          <CardContent className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.daily_trend || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                <Line type="monotone" dataKey="ineffective" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, fill: '#EF4444', strokeWidth: 0 }} activeDot={{ r: 6 }} name="Ineffective" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
