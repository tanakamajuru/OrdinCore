import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { Ambulance, Plus } from "lucide-react";

export function RegisteredManagerDashboard() {
  const navigate = useNavigate();
  
  // Registered Manager is tied to a specific house
  const managerHouse = "Oakwood"; // This will come from API later

  const weeklySnapshot = [
    { label: "High Risk Days", value: "3" },
    { label: "Safeguarding Days", value: "2" },
    { label: "Escalations", value: "2" },
    { label: "Active Incidents", value: "1" },
  ];

  const activeHighRisks = [
    { house: "Oakwood", description: "Fire safety equipment malfunction", date: "2026-02-20" },
    { house: "Oakwood", description: "Resident injury - fall prevention", date: "2026-02-21" },
    { house: "Oakwood", description: "Medication storage temperature issue", date: "2026-02-19" },
  ];

  const houseIncidents = [
    { id: "INC-001", type: "Safeguarding", date: "2024-01-18", status: "under-review" },
  ];

  const recentUpdates = [
    { date: "2026-02-24", type: "Governance Pulse", house: "Oakwood", detail: "Staffing pressure identified" },
    { date: "2026-02-23", type: "Risk Added", house: "Oakwood", detail: "Fire safety equipment malfunction" },
    { date: "2026-02-22", type: "Escalation", house: "Oakwood", detail: "Resident fall incident" },
    { date: "2026-02-21", type: "Staffing Update", house: "Oakwood", detail: "Night shift coverage adjusted" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-black">{managerHouse} Dashboard</h1>
          <p className="text-gray-600 mt-1">Real-time overview of your house governance</p>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Today's Governance Pulse */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Today's Governance Pulse</h2>
              <div className="mb-4">
                <p className="text-gray-600">Status: Not yet started</p>
              </div>
              <button
                onClick={() => navigate("/governance-pulse")}
                className="w-full py-3 px-4 bg-black text-white hover:bg-gray-800 transition-colors"
              >
                Start Pulse
              </button>
            </div>

            {/* Weekly Governance Snapshot */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Weekly Governance Snapshot</h2>
              <div className="space-y-3">
                {weeklySnapshot.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center">
                    <span className="text-black">{item.label}</span>
                    <span className="font-semibold text-black">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Active High Risk Cases */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Active High Risk Cases</h2>
              <div className="space-y-3">
                {activeHighRisks.map((risk, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-black">{risk.description}</p>
                        <p className="text-sm text-gray-600">{risk.house}</p>
                      </div>
                      <span className="text-sm text-gray-600">{risk.date}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate("/risk-register")}
                className="w-full mt-4 py-2 px-4 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
              >
                View All Risks
              </button>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* House Incidents */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">House Incidents</h2>
              <div className="space-y-3">
                {houseIncidents.map((incident, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-black">{incident.id}</p>
                        <p className="text-sm text-gray-600">{incident.type}</p>
                        <p className="text-sm text-gray-500">{incident.date}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded ${
                        incident.status === 'under-review' 
                          ? 'bg-black text-white' 
                          : 'bg-gray-200 text-gray-800'
                      }`}>
                        {incident.status}
                      </span>
                    </div>
                  </div>
                ))}
                {houseIncidents.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No active incidents for your house
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => navigate("/incidents")}
                  className="flex-1 py-2 px-4 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
                >
                  <Ambulance className="w-4 h-4 mr-2 inline" />
                  Manage Incidents
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

            {/* Recent Governance Updates */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Recent Governance Updates</h2>
              <div className="space-y-3">
                {recentUpdates.map((update, idx) => (
                  <div key={idx} className="border-b border-gray-300 pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-black">{update.type}</p>
                        <p className="text-sm text-gray-600">{update.detail}</p>
                        <p className="text-sm text-gray-600">{update.house}</p>
                      </div>
                      <span className="text-sm text-gray-600">{update.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Quick Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={() => navigate("/risk-register?addRisk=true")}
                  className="w-full py-3 px-4 bg-black text-white hover:bg-gray-800 transition-colors"
                >
                  Add New Risk
                </button>
                <button
                  onClick={() => navigate("/reports")}
                  className="w-full py-3 px-4 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
                >
                  Generate Report
                </button>
                <button
                  onClick={() => navigate("/incidents")}
                  className="w-full py-3 px-4 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
                >
                  Record Serious Incident
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
