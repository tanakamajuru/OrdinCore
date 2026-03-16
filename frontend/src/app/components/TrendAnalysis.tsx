import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { TrendingUp, BarChart3, PieChart, Activity, MapPin, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

export function TrendAnalysis() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [trends, setTrends] = useState<any>(null);
  const [performance, setPerformance] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const [trendsRes, perfRes, compRes] = await Promise.all([
        apiClient.get('/analytics/risk-trends?days=30'),
        apiClient.get('/analytics/site-performance'),
        apiClient.get('/analytics/governance-compliance?days=30')
      ]);

      setTrends(trendsRes.data.data);
      setPerformance(perfRes.data.data);
      setCompliance(compRes.data.data);
    } catch (err) {
      console.error('Failed to load analytics', err);
      toast.error('Failed to load trend analysis data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3">
            <TrendingUp className="w-8 h-8" />
            Trend Analysis
          </h1>
          <p className="text-gray-600">Organizational telemetry and governance performance monitoring</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b-2 border-black mb-8">
          {["overview", "performance", "compliance"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 text-sm font-bold uppercase transition-colors ${
                activeTab === tab ? "bg-black text-white" : "text-gray-500 hover:text-black hover:bg-gray-100"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Risk Trends Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-2 border-black">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-500 uppercase">30-Day Risk Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black">{compliance?.overall?.total || 0}</span>
                    <span className="text-green-600 flex items-center text-sm font-bold">
                      <ArrowDownRight className="w-4 h-4" /> 12%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">vs previous 30 days</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-black">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-500 uppercase">Avg Compliance Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black">{compliance?.overall?.avg_compliance || 0}%</span>
                    <span className="text-red-600 flex items-center text-sm font-bold">
                      <ArrowUpRight className="w-4 h-4" /> 2.4%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Cross-site average</p>
                </CardContent>
              </Card>
              <Card className="border-2 border-black">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-gray-500 uppercase">Resolved Escalations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black">{compliance?.overall?.completed || 0}</span>
                    <span className="text-gray-500 text-sm font-medium">/ {compliance?.overall?.total || 0}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total pulses completed</p>
                </CardContent>
              </Card>
            </div>

            {/* Risk Distribution Chart (Visualized with simple bars) */}
            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Risk Severity Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trends?.by_status?.map((status: any) => (
                    <div key={status.status}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize font-medium">{status.status.replace('_', ' ')}</span>
                        <span className="font-bold">{status.count}</span>
                      </div>
                      <div className="w-full h-4 bg-gray-100 border border-gray-200">
                        <div 
                          className="h-full bg-black transition-all" 
                          style={{ width: `${(status.count / trends.by_status.reduce((a:any, b:any) => a + parseInt(b.count), 0)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "performance" && (
          <Card className="border-2 border-black">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Site Performance Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase text-gray-500 border-b border-gray-200">
                      <th className="pb-3 px-2">Site Name</th>
                      <th className="pb-3 px-2 text-center">Open Risks</th>
                      <th className="pb-3 px-2 text-center">Critical</th>
                      <th className="pb-3 px-2 text-center">Incidents</th>
                      <th className="pb-3 px-2 text-center">Compliance</th>
                      <th className="pb-3 px-2 text-right">Escalations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {performance.map((site) => (
                      <tr key={site.house_id} className="text-sm hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-2 font-bold flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {site.house_name}
                        </td>
                        <td className="py-4 px-2 text-center">{site.open_risks}</td>
                        <td className="py-4 px-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${site.critical_risks > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                            {site.critical_risks}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-center font-medium">{site.open_incidents}</td>
                        <td className="py-4 px-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${parseFloat(site.avg_compliance_score) > 90 ? 'bg-green-500' : 'bg-black'}`}
                                style={{ width: `${site.avg_compliance_score}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-bold">{Math.round(site.avg_compliance_score)}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <span className={`font-bold ${site.pending_escalations > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {site.pending_escalations}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "compliance" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Pulse Completion Rates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {compliance?.by_house?.map((house: any) => (
                    <div key={house.house_id}>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold">{house.house_name}</span>
                        <span className="text-gray-500">{house.completed_pulses} / {house.total_pulses} Pulses</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-3 bg-gray-100 border border-gray-200">
                          <div 
                            className="h-full bg-black" 
                            style={{ width: `${house.completion_rate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-black w-12 text-right">{Math.round(house.completion_rate)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle>Compliance Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="relative w-48 h-48 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="currentColor"
                        strokeWidth="16"
                        fill="transparent"
                        className="text-gray-100"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="currentColor"
                        strokeWidth="16"
                        fill="transparent"
                        strokeDasharray={552.92}
                        strokeDashoffset={552.92 * (1 - (compliance?.overall?.avg_compliance || 0) / 100)}
                        className="text-black"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-black">{compliance?.overall?.avg_compliance || 0}%</span>
                      <span className="text-xs font-bold text-gray-500 uppercase">Avg Score</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-gray-50 p-4 border border-gray-200">
                    <p className="text-2xl font-black">{compliance?.overall?.completed || 0}</p>
                    <p className="text-xs font-bold text-gray-500 uppercase">Completed</p>
                  </div>
                  <div className="bg-red-50 p-4 border border-red-100">
                    <p className="text-2xl font-black text-red-600">{compliance?.overall?.overdue || 0}</p>
                    <p className="text-xs font-bold text-red-400 uppercase">Overdue</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
