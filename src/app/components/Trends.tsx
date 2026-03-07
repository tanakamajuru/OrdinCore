import { Navigation } from "./Navigation";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

export function Trends() {
  // 6-week rolling data only - no scoring
  const highRiskData = [
    { week: "Week 1", count: 8 },
    { week: "Week 2", count: 10 },
    { week: "Week 3", count: 9 },
    { week: "Week 4", count: 11 },
    { week: "Week 5", count: 13 },
    { week: "Week 6", count: 12 },
  ];

  const safeguardingData = [
    { week: "Week 1", incidents: 2 },
    { week: "Week 2", incidents: 3 },
    { week: "Week 3", incidents: 1 },
    { week: "Week 4", incidents: 4 },
    { week: "Week 5", incidents: 2 },
    { week: "Week 6", incidents: 3 },
  ];

  const escalationData = [
    { week: "Week 1", count: 5 },
    { week: "Week 2", count: 7 },
    { week: "Week 3", count: 6 },
    { week: "Week 4", count: 8 },
    { week: "Week 5", count: 9 },
    { week: "Week 6", count: 8 },
  ];

  const staffingStability = {
    current: 92,
    previous: 89,
    trend: "up",
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-black">Trends</h1>
          <p className="text-gray-600 mt-1">6-Week Rolling Analysis - Raw Data Only</p>
        </div>

        <div className="space-y-6">
          {/* High Risk Trend */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">High Risk Count</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={highRiskData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis dataKey="week" stroke="#666666" />
                <YAxis stroke="#666666" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    border: "2px solid #000000",
                    color: "#000000",
                  }}
                />
                <Line type="monotone" dataKey="count" stroke="#000000" strokeWidth={2} dot={{ fill: "#000000", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="p-3 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">Current Week</p>
                <p className="text-2xl font-semibold text-black">12</p>
              </div>
              <div className="p-3 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">6-Week Average</p>
                <p className="text-2xl font-semibold text-black">10.5</p>
              </div>
              <div className="p-3 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">Week 1 to Week 6</p>
                <p className="text-2xl font-semibold text-black">+4</p>
              </div>
            </div>
          </div>

          {/* Safeguarding Incidents */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Safeguarding Incidents</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={safeguardingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis dataKey="week" stroke="#666666" />
                <YAxis stroke="#666666" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    border: "2px solid #000000",
                    color: "#000000",
                  }}
                />
                <Bar dataKey="incidents" fill="#000000" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="p-3 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">Current Week</p>
                <p className="text-2xl font-semibold text-black">3</p>
              </div>
              <div className="p-3 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">6-Week Total</p>
                <p className="text-2xl font-semibold text-black">15</p>
              </div>
              <div className="p-3 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">Weekly Average</p>
                <p className="text-2xl font-semibold text-black">2.5</p>
              </div>
            </div>
          </div>

          {/* Escalation Count */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Escalation Count</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={escalationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis dataKey="week" stroke="#666666" />
                <YAxis stroke="#666666" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#FFFFFF",
                    border: "2px solid #000000",
                    color: "#000000",
                  }}
                />
                <Bar dataKey="count" fill="#333333" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="p-3 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">Current Week</p>
                <p className="text-2xl font-semibold text-black">8</p>
              </div>
              <div className="p-3 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">6-Week Total</p>
                <p className="text-2xl font-semibold text-black">43</p>
              </div>
              <div className="p-3 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">Weekly Average</p>
                <p className="text-2xl font-semibold text-black">7.2</p>
              </div>
            </div>
          </div>

          {/* Staffing Stability */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Staffing Stability</h2>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className="text-6xl font-semibold text-black">{staffingStability.current}%</div>
                  {staffingStability.trend === "up" ? (
                    <TrendingUp className="w-16 h-16 text-black" />
                  ) : (
                    <TrendingDown className="w-16 h-16 text-black" />
                  )}
                </div>
                <p className="text-gray-600 mb-2">Current Stability Rate</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-black text-lg">
                    {staffingStability.trend === "up" ? "+" : "-"}
                    {Math.abs(staffingStability.current - staffingStability.previous)}%
                  </span>
                  <span className="text-gray-600">vs previous period</span>
                </div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="p-3 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">Previous Period</p>
                <p className="text-2xl font-semibold text-black">{staffingStability.previous}%</p>
              </div>
              <div className="p-3 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">Target</p>
                <p className="text-2xl font-semibold text-black">95%</p>
              </div>
              <div className="p-3 border-2 border-black">
                <p className="text-sm text-gray-600 mb-1">Direction</p>
                <p className="text-2xl font-semibold text-black capitalize">{staffingStability.trend}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-white border-2 border-black">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> All trends show 6-week rolling data only. No scoring or predictive analytics are included. Data refreshed weekly.
          </p>
        </div>
      </div>
    </div>
  );
}
