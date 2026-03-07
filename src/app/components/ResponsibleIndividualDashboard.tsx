import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { Ambulance, AlertTriangle, Plus } from "lucide-react";

export function ResponsibleIndividualDashboard() {
  const navigate = useNavigate();

  const crossSiteSnapshot = [
    { label: "Total Sites", value: "5" },
    { label: "Active High Risks", value: "12" },
    { label: "Pending Escalations", value: "3" },
    { label: "Active Incidents", value: "4" },
  ];

  const escalatedRisks = [
    { house: "Oakwood", risk: "Medication administration errors", escalatedDate: "2026-02-24", status: "Pending" },
    { house: "Riverside", risk: "Critical staffing shortage", escalatedDate: "2026-02-23", status: "Under Review" },
    { house: "Maple Grove", risk: "Fire safety system failure", escalatedDate: "2026-02-22", status: "Pending" },
  ];

  const activeIncidents = [
    { id: "INC-001", house: "Oakwood", type: "Safeguarding", date: "2024-01-18", status: "under-review" },
    { id: "INC-002", house: "Riverside", type: "Medication Error", date: "2024-01-22", status: "under-review" },
    { id: "INC-003", house: "Maple Grove", type: "Behavioral", date: "2024-01-25", status: "closed" },
    { id: "INC-004", house: "Sunset Villa", type: "Environmental", date: "2024-02-01", status: "under-review" },
    { id: "INC-005", house: "Birchwood", type: "Resident Injury", date: "2024-02-05", status: "under-review" },
  ];

  const siteSummaries = [
    { house: "Oakwood", highRisks: 3, escalations: 1, lastPulse: "2026-02-24" },
    { house: "Riverside", highRisks: 4, escalations: 1, lastPulse: "2026-02-23" },
    { house: "Maple Grove", highRisks: 2, escalations: 1, lastPulse: "2026-02-22" },
    { house: "Sunset Villa", highRisks: 1, escalations: 0, lastPulse: "2026-02-24" },
    { house: "Birchwood", highRisks: 2, escalations: 0, lastPulse: "2026-02-23" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-black">Cross-Site Dashboard</h1>
          <p className="text-gray-600 mt-1">Aggregated view across all houses</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Cross-Site Snapshot */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Cross-Site Governance Snapshot</h2>
              <div className="space-y-3">
                {crossSiteSnapshot.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-black">{item.label}</span>
                    <span className="font-semibold text-black">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Escalations */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Pending Escalations</h2>
              <div className="space-y-3">
                {escalatedRisks.map((risk, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-black">{risk.risk}</p>
                        <p className="text-sm text-gray-600">{risk.house}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-600">{risk.escalatedDate}</span>
                        <p className="text-sm font-medium text-black">{risk.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate("/escalation-log")}
                className="w-full mt-4 py-2 px-4 bg-black text-white hover:bg-gray-800 transition-colors"
              >
                View All Escalations
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Site Summaries */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Site Summaries</h2>
              <div className="space-y-3">
                {siteSummaries.map((site, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-black">{site.house}</p>
                        <p className="text-sm text-gray-600">High Risks: {site.highRisks} | Escalations: {site.escalations}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-600">Last Pulse</span>
                        <p className="text-sm font-medium text-black">{site.lastPulse}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active Incidents */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Active Serious Incidents</h2>
              <div className="space-y-3">
                {activeIncidents.map((incident, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-black">{incident.id}</p>
                        <p className="text-sm text-gray-600">{incident.house} - {incident.type}</p>
                        <p className="text-xs text-gray-500">{incident.date}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded ${
                          incident.status === 'under-review' 
                            ? 'bg-black text-white' 
                            : 'bg-gray-200 text-gray-800'
                        }`}>
                          {incident.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => navigate("/incidents")}
                  className="flex-1 py-2 px-4 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
                >
                  <Ambulance className="w-4 h-4 mr-2 inline" />
                  Manage All Incidents
                </button>
                <button
                  onClick={() => navigate("/incidents")}
                  className="flex-1 py-2 px-4 bg-black text-white hover:bg-gray-800 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2 inline" />
                  Add Incident
                </button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/incidents")}
                  className="w-full py-3 px-4 bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  <Ambulance className="w-4 h-4 mr-2 inline" />
                  Manage Serious Incidents
                </button>
                <button
                  onClick={() => navigate("/escalation-log")}
                  className="w-full py-3 px-4 bg-black text-white hover:bg-gray-800 transition-colors"
                >
                  Review Escalations
                </button>
                <button
                  onClick={() => navigate("/reports")}
                  className="w-full py-3 px-4 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
                >
                  Generate Cross-Site Report
                </button>
                <button
                  onClick={() => navigate("/trends")}
                  className="w-full py-3 px-4 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
                >
                  View Trend Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
