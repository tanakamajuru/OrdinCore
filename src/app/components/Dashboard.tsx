import { Navigation } from "./Navigation";
import { useNavigate } from "react-router";

export function Dashboard() {
  const navigate = useNavigate();

  const weeklySnapshot = [
    { label: "High Risk Days", value: "3" },
    { label: "Safeguarding Days", value: "2" },
    { label: "Escalations", value: "2" },
    { label: "Staffing Avg", value: "Emerging Pressure" },
  ];

  const activeHighRisks = [
    { house: "Oakwood", description: "Medication administration errors", date: "2026-02-15" },
    { house: "Riverside", description: "Staffing below minimum ratios", date: "2026-02-18" },
    { house: "Maple Grove", description: "Fire safety equipment malfunction", date: "2026-02-20" },
    { house: "Sunset Villa", description: "Resident injury - fall prevention", date: "2026-02-21" },
  ];

  const escalationsThisWeek = [
    { date: "2026-02-24", house: "Oakwood", risk: "Medication errors requiring protocol review" },
    { date: "2026-02-23", house: "Riverside", risk: "Critical staffing shortage" },
    { date: "2026-02-22", house: "Maple Grove", risk: "Fire safety system failure" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-black">Governance Overview</h1>
          <p className="text-gray-600 mt-1">Is anything emerging that I don't know about?</p>
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

            {/* Weekly Snapshot Summary */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Weekly Snapshot Summary</h2>
              <div className="grid grid-cols-2 gap-4">
                {weeklySnapshot.map((stat) => (
                  <div key={stat.label} className="border border-gray-300 p-4">
                    <span className="block text-sm text-gray-600 mb-1">{stat.label}</span>
                    <span className="text-xl font-semibold text-black">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Active High Risks */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Active High Risks</h2>
              <div className="space-y-2">
                {activeHighRisks.map((risk, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate("/risk-register")}
                    className="p-3 border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-black font-medium">{risk.house}</p>
                        <p className="text-sm text-gray-600 truncate">{risk.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{risk.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Escalations This Week */}
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-4 text-black">Escalations This Week</h2>
              <div className="space-y-2">
                {escalationsThisWeek.map((esc, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate("/escalation-log")}
                    className="p-3 border border-gray-300 cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-600">{esc.date}</p>
                        <p className="text-black font-medium">{esc.house}</p>
                        <p className="text-sm text-gray-600 truncate">{esc.risk}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
