import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { AlertTriangle, TrendingUp, Users, FileText, Calendar, Clock, Activity, Ambulance } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export function DirectorDashboard() {
  const navigate = useNavigate();

  const organizationalSnapshot = [
    { label: "Total Sites", value: "5" },
    { label: "Active High Risks", value: "12" },
    { label: "Monthly Incidents", value: "8" },
    { label: "Compliance Rate", value: "94%" },
  ];

  const riskCategories = [
    { category: "Clinical", count: 5, trend: "up" },
    { category: "Operational", count: 4, trend: "stable" },
    { category: "Environmental", count: 2, trend: "down" },
    { category: "Safeguarding", count: 1, trend: "stable" },
  ];

  const sitePerformance = [
    { site: "Oakwood", performance: 92, risks: 3, incidents: 2 },
    { site: "Riverside", performance: 88, risks: 4, incidents: 3 },
    { site: "Maple Grove", performance: 95, risks: 2, incidents: 1 },
    { site: "Sunset Villa", performance: 97, risks: 1, incidents: 1 },
    { site: "Birchwood", performance: 90, risks: 2, incidents: 1 },
  ];

  const strategicInsights = [
    { type: "Risk Pattern", detail: "Staffing issues trending upwards across 3 sites", priority: "High" },
    { type: "Performance", detail: "Oakwood showing improvement in medication management", priority: "Medium" },
    { type: "Incident", detail: "Fire safety protocols require organizational review", priority: "High" },
  ];

  const seriousIncidentAlerts = [
    {
      id: "INC-001",
      house: "House B",
      incidentDate: "18 Jan",
      riskSignalsLogged: 3,
      escalationsTriggered: 2,
      leadershipReviews: 2,
      lastOversightReviewDays: 6,
      status: "under-review"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-black">Strategic Dashboard</h1>
          <p className="text-gray-600 mt-1">High-level strategic visibility across the organisation</p>
        </div>

        {/* Serious Incident Alert */}
        {seriousIncidentAlerts.length > 0 && (
          <div className="mb-6 bg-red-50 border-2 border-red-600 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-red-900">Serious Incident Alert</h2>
            </div>
            {seriousIncidentAlerts.map((alert) => (
              <div key={alert.id} className="bg-white border border-red-300 rounded p-4">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-3">
                  <div>
                    <div className="text-sm text-gray-500">Incident ID</div>
                    <div className="font-bold text-black">{alert.id}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Service</div>
                    <div className="font-bold text-black">{alert.house}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Date</div>
                    <div className="font-bold text-black">{alert.incidentDate}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Risk Signals</div>
                    <div className="font-bold text-black">{alert.riskSignalsLogged}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Escalations</div>
                    <div className="font-bold text-black">{alert.escalationsTriggered}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Last Oversight</div>
                    <div className="font-bold text-black">{alert.lastOversightReviewDays} days before</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/incidents/${alert.id}/timeline`)}
                    className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    <Ambulance className="w-4 h-4 mr-2" />
                    View Governance Timeline
                  </button>
                  <button
                    onClick={() => navigate(`/incidents/${alert.id}/report`)}
                    className="px-4 py-2 bg-white text-red-600 border border-red-600 hover:bg-red-50 transition-colors"
                  >
                    View Reconstruction Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Organizational Snapshot */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Organizational Overview</h2>
              <div className="space-y-3">
                {organizationalSnapshot.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-black">{item.label}</span>
                    <span className="font-semibold text-black">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Categories */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Risk Categories</h2>
              <div className="space-y-3">
                {riskCategories.map((category, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-black">{category.category}</p>
                      <p className="text-sm text-gray-600">{category.count} active risks</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        category.trend === "up" ? "bg-black" :
                        category.trend === "down" ? "bg-gray-400" :
                        "bg-gray-600"
                      }`}></span>
                      <span className="text-sm text-gray-600">{category.trend}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategic Insights */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Strategic Insights</h2>
              <div className="space-y-3">
                {strategicInsights.map((insight, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-black">{insight.type}</p>
                        <p className="text-sm text-gray-600">{insight.detail}</p>
                      </div>
                      <span className={`text-sm px-2 py-1 ${
                        insight.priority === "High" ? "bg-black text-white" :
                        "bg-gray-200 text-black"
                      }`}>
                        {insight.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Site Performance */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Site Performance</h2>
              <div className="space-y-3">
                {sitePerformance.map((site, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-black">{site.site}</p>
                        <p className="text-sm text-gray-600">Risks: {site.risks} | Incidents: {site.incidents}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-semibold text-black">{site.performance}%</span>
                        <p className="text-sm text-gray-600">Performance</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Strategic Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/incidents")}
                  className="w-full py-3 px-4 bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  <Ambulance className="w-4 h-4 mr-2" />
                  Manage Serious Incidents
                </button>
                <button
                  onClick={() => navigate("/reports")}
                  className="w-full py-3 px-4 bg-black text-white hover:bg-gray-800 transition-colors"
                >
                  Generate Monthly Report
                </button>
                <button
                  onClick={() => navigate("/trends")}
                  className="w-full py-3 px-4 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
                >
                  View Risk Trends
                </button>
                <button
                  onClick={() => navigate("/reports")}
                  className="w-full py-3 px-4 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
                >
                  Site Performance Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
