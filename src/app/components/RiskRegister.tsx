import { useState } from "react";
import { Navigation } from "./Navigation";
import { useNavigate } from "react-router";
import { ChevronDown, AlertTriangle, Plus } from "lucide-react";

interface Risk {
  id: string;
  house: string;
  description: string;
  category: string;
  severity: "High" | "Medium" | "Low";
  dateIdentified: string;
  mitigation: string;
  reviewDate: string;
  status: "Open" | "Under Review" | "Escalated" | "Closed";
  escalated: boolean;
  source: "Pulse" | "Out-of-Cycle" | "Manual";
  pulseDate?: string;
  createdBy: string;
  lastUpdated: string;
  updateHistory: Array<{
    date: string;
    field: string;
    oldValue: any;
    newValue: any;
    updatedBy: string;
  }>;
}

export function RiskRegister() {
  const navigate = useNavigate();
  const [houseFilter, setHouseFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAddRisk, setShowAddRisk] = useState(false);
  const [showOutOfCycle, setShowOutOfCycle] = useState(false);

  const [risks, setRisks] = useState<Risk[]>([
    { 
      id: "RISK-001", 
      house: "Oakwood", 
      description: "Medication administration errors", 
      category: "Clinical", 
      severity: "High", 
      dateIdentified: "2026-02-15", 
      mitigation: "Double-check protocol implemented", 
      reviewDate: "2026-02-25", 
      status: "Open", 
      escalated: true,
      source: "Pulse",
      pulseDate: "2026-02-15",
      createdBy: "Jane Smith",
      lastUpdated: "2026-02-15",
      updateHistory: []
    },
    { 
      id: "RISK-002", 
      house: "Riverside", 
      description: "Staffing below minimum ratios", 
      category: "Operational", 
      severity: "High", 
      dateIdentified: "2026-02-18", 
      mitigation: "Emergency staffing plan activated", 
      reviewDate: "2026-02-24", 
      status: "Open", 
      escalated: true,
      source: "Pulse",
      pulseDate: "2026-02-18",
      createdBy: "Michael Chen",
      lastUpdated: "2026-02-18",
      updateHistory: []
    },
    { 
      id: "RISK-003", 
      house: "Maple Grove", 
      description: "Fire safety equipment malfunction", 
      category: "Environmental", 
      severity: "High", 
      dateIdentified: "2026-02-20", 
      mitigation: "Immediate repair scheduled", 
      reviewDate: "2026-02-26", 
      status: "Under Review", 
      escalated: true,
      source: "Pulse",
      pulseDate: "2026-02-20",
      createdBy: "Sarah Johnson",
      lastUpdated: "2026-02-20",
      updateHistory: []
    },
    { 
      id: "RISK-004", 
      house: "Sunset Villa", 
      description: "Resident injury - fall prevention", 
      category: "Safety", 
      severity: "High", 
      dateIdentified: "2026-02-21", 
      mitigation: "Enhanced monitoring and risk assessment", 
      reviewDate: "2026-02-27", 
      status: "Open", 
      escalated: false,
      source: "Pulse",
      pulseDate: "2026-02-21",
      createdBy: "David Brown",
      lastUpdated: "2026-02-21",
      updateHistory: []
    },
    { 
      id: "RISK-005", 
      house: "Oakwood", 
      description: "Documentation delays", 
      category: "Administrative", 
      severity: "Medium", 
      dateIdentified: "2026-02-10", 
      mitigation: "Staff retraining scheduled", 
      reviewDate: "2026-03-01", 
      status: "Open", 
      escalated: false,
      source: "Pulse",
      pulseDate: "2026-02-10",
      createdBy: "Jane Smith",
      lastUpdated: "2026-02-10",
      updateHistory: []
    }
  ]);

  // New risk form state
  const [newRisk, setNewRisk] = useState<Partial<Risk>>({
    house: "",
    description: "",
    category: "",
    severity: "Medium",
    dateIdentified: new Date().toISOString().split('T')[0],
    mitigation: "",
    reviewDate: "",
    status: "Open",
    escalated: false,
    source: "Pulse",
    createdBy: "Current User",
    lastUpdated: new Date().toISOString().split('T')[0],
    updateHistory: []
  });

  // Out-of-cycle risk form state
  const [outOfCycleRisk, setOutOfCycleRisk] = useState({
    house: "",
    description: "",
    category: "",
    severity: "High",
    reason: "",
    requiresImmediateReview: false,
    createdBy: "Current User"
  });

  const houses = ["All", "Oakwood", "Riverside", "Maple Grove", "Sunset Villa", "Birchwood"];
  const severities = ["All", "High", "Medium", "Low"];
  const statuses = ["All", "Open", "Under Review", "Escalated", "Closed"];
  const categories = ["Clinical", "Operational", "Environmental", "Safety", "Administrative"];

  const filteredRisks = risks.filter((risk) => {
    if (houseFilter !== "All" && risk.house !== houseFilter) return false;
    if (severityFilter !== "All" && risk.severity !== severityFilter) return false;
    if (statusFilter !== "All" && risk.status !== statusFilter) return false;
    return true;
  });

  const handleAddRisk = () => {
    if (newRisk.house && newRisk.description && newRisk.category) {
      const risk: Risk = {
        id: `RISK-${String(risks.length + 1).padStart(3, '0')}`,
        house: newRisk.house || "",
        description: newRisk.description || "",
        category: newRisk.category || "",
        severity: newRisk.severity || "Medium",
        dateIdentified: newRisk.dateIdentified || new Date().toISOString().split('T')[0],
        mitigation: newRisk.mitigation || "",
        reviewDate: newRisk.reviewDate || "",
        status: newRisk.status || "Open",
        escalated: newRisk.escalated || false,
        source: "Pulse",
        createdBy: newRisk.createdBy || "Current User",
        lastUpdated: new Date().toISOString().split('T')[0],
        updateHistory: []
      };
      setRisks([...risks, risk]);
      setNewRisk({
        house: "",
        description: "",
        category: "",
        severity: "Medium",
        dateIdentified: new Date().toISOString().split('T')[0],
        mitigation: "",
        reviewDate: "",
        status: "Open",
        escalated: false,
        source: "Pulse",
        createdBy: "Current User",
        lastUpdated: new Date().toISOString().split('T')[0],
        updateHistory: []
      });
      setShowAddRisk(false);
    }
  };

  const handleOutOfCycleRisk = () => {
    if (outOfCycleRisk.house && outOfCycleRisk.description && outOfCycleRisk.reason) {
      const risk: Risk = {
        id: `RISK-${String(risks.length + 1).padStart(3, '0')}`,
        house: outOfCycleRisk.house,
        description: outOfCycleRisk.description,
        category: outOfCycleRisk.category,
        severity: outOfCycleRisk.severity as "High" | "Medium" | "Low",
        dateIdentified: new Date().toISOString().split('T')[0],
        mitigation: "To be determined at next Pulse review",
        reviewDate: outOfCycleRisk.requiresImmediateReview ? new Date().toISOString().split('T')[0] : "",
        status: "Open",
        escalated: outOfCycleRisk.severity === "High",
        source: "Out-of-Cycle",
        createdBy: outOfCycleRisk.createdBy,
        lastUpdated: new Date().toISOString().split('T')[0],
        updateHistory: [{
          date: new Date().toISOString().split('T')[0],
          field: "creation",
          oldValue: null,
          newValue: "Out-of-cycle risk created",
          updatedBy: outOfCycleRisk.createdBy
        }]
      };
      
      setRisks([...risks, risk]);
      setOutOfCycleRisk({
        house: "",
        description: "",
        category: "",
        severity: "High",
        reason: "",
        requiresImmediateReview: false,
        createdBy: "Current User"
      });
      setShowOutOfCycle(false);
      
      alert(`Out-of-cycle risk created: ${risk.id}\nThis will appear in the next Governance Pulse for mandatory review.`);
    }
  };

  const updateRisk = (id: string, field: keyof Risk, value: any) => {
    setRisks(prev => prev.map(risk => {
      if (risk.id === id) {
        const oldValue = risk[field];
        const updatedRisk = { 
          ...risk, 
          [field]: value,
          lastUpdated: new Date().toISOString().split('T')[0],
          updateHistory: [
            ...risk.updateHistory,
            {
              date: new Date().toISOString().split('T')[0],
              field: field as string,
              oldValue: oldValue,
              newValue: value,
              updatedBy: "Current User"
            }
          ]
        };
        return updatedRisk;
      }
      return risk;
    }));
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "Pulse":
        return <span className="px-2 py-1 bg-gray-100 border border-gray-300 text-xs">Pulse</span>;
      case "Out-of-Cycle":
        return <span className="px-2 py-1 bg-black text-white text-xs">Out-of-Cycle</span>;
      case "Manual":
        return <span className="px-2 py-1 border border-gray-300 text-xs">Manual</span>;
      default:
        return <span className="px-2 py-1 border border-gray-300 text-xs">{source}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-semibold text-black">Risk Register</h1>
            <p className="text-gray-600 mt-1">Live register of all identified risks</p>
            <div className="mt-2 flex gap-2">
              <span className="text-xs text-gray-500">Pulse-originated risks are created through Governance Pulse rhythm</span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500">Out-of-cycle for urgent incidents</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowOutOfCycle(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black border-2 border-gray-300 hover:border-gray-500 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              Out-of-Cycle Risk
            </button>
            <button
              onClick={() => setShowAddRisk(true)}
              className="flex items-center gap-2 px-6 py-3 bg-black text-white hover:bg-gray-800 transition-colors font-medium"
            >
              <Plus className="w-4 h-4" />
              Add Risk
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-2 text-black font-medium">Filter by House</label>
              <div className="relative">
                <select
                  value={houseFilter}
                  onChange={(e) => setHouseFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black appearance-none cursor-pointer"
                >
                  {houses.map((house) => (
                    <option key={house} value={house}>
                      {house}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              </div>
            </div>

            <div className="flex-1">
              <label className="block mb-2 text-black font-medium">Filter by Severity</label>
              <div className="relative">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black appearance-none cursor-pointer"
                >
                  {severities.map((severity) => (
                    <option key={severity} value={severity}>
                      {severity}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              </div>
            </div>

            <div className="flex-1">
              <label className="block mb-2 text-black font-medium">Filter by Status</label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black appearance-none cursor-pointer"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Risk Table */}
        <div className="bg-white border-2 border-black">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-black text-white">
                  <th className="border border-gray-300 px-4 py-3 text-left">Risk ID</th>
                  <th className="border border-gray-300 px-4 py-3 text-left">House</th>
                  <th className="border border-gray-300 px-4 py-3 text-left">Description</th>
                  <th className="border border-gray-300 px-4 py-3 text-left">Category</th>
                  <th className="border border-gray-300 px-4 py-3 text-left">Severity</th>
                  <th className="border border-gray-300 px-4 py-3 text-left">Date Identified</th>
                  <th className="border border-gray-300 px-4 py-3 text-left">Source</th>
                  <th className="border border-gray-300 px-4 py-3 text-left">Mitigation</th>
                  <th className="border border-gray-300 px-4 py-3 text-left">Escalated</th>
                  <th className="border border-gray-300 px-4 py-3 text-left">Status</th>
                  <th className="border border-gray-300 px-4 py-3 text-left">Review Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredRisks.map((risk, idx) => (
                  <tr
                    key={risk.id}
                    onClick={() => navigate(`/risk-register/${risk.id}`)}
                    className={`cursor-pointer hover:bg-gray-100 transition-colors ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="border border-gray-300 px-4 py-3 font-semibold">{risk.id}</td>
                    <td className="border border-gray-300 px-4 py-3">{risk.house}</td>
                    <td className="border border-gray-300 px-4 py-3 max-w-xs truncate">{risk.description}</td>
                    <td className="border border-gray-300 px-4 py-3">{risk.category}</td>
                    <td className="border border-gray-300 px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs ${
                          risk.severity === "High"
                            ? "bg-black text-white"
                            : risk.severity === "Medium"
                            ? "border-2 border-black"
                            : "bg-gray-200"
                        }`}
                      >
                        {risk.severity}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">{risk.dateIdentified}</td>
                    <td className="border border-gray-300 px-4 py-3">{getSourceBadge(risk.source)}</td>
                    <td className="border border-gray-300 px-4 py-3 max-w-xs truncate">{risk.mitigation}</td>
                    <td className="border border-gray-300 px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 text-xs ${
                        risk.escalated ? "bg-black text-white" : "border border-gray-300"
                      }`}>
                        {risk.escalated ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs ${
                          risk.status === "Open"
                            ? "border-2 border-black"
                            : risk.status === "Under Review"
                            ? "bg-gray-200"
                            : risk.status === "Escalated"
                            ? "bg-black text-white"
                            : "bg-gray-100"
                        }`}
                      >
                        {risk.status}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">{risk.reviewDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 text-center text-gray-600">
          Showing {filteredRisks.length} of {risks.length} risks
        </div>
      </div>

      {/* Add Risk Modal */}
      {showAddRisk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border-2 border-black p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4 text-black">Add New Risk</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-2 text-black font-medium">House</label>
                <select
                  value={newRisk.house}
                  onChange={(e) => setNewRisk({...newRisk, house: e.target.value})}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                >
                  <option value="">Select house</option>
                  {houses.filter(h => h !== "All").map((house) => (
                    <option key={house} value={house}>
                      {house}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block mb-2 text-black font-medium">Risk Title</label>
                <input
                  type="text"
                  value={newRisk.description}
                  onChange={(e) => setNewRisk({...newRisk, description: e.target.value})}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-black font-medium">Category</label>
                <select
                  value={newRisk.category}
                  onChange={(e) => setNewRisk({...newRisk, category: e.target.value})}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block mb-2 text-black font-medium">Severity</label>
                <select
                  value={newRisk.severity}
                  onChange={(e) => setNewRisk({...newRisk, severity: e.target.value as "High" | "Medium" | "Low"})}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              
              <div>
                <label className="block mb-2 text-black font-medium">Date Identified</label>
                <input
                  type="date"
                  value={newRisk.dateIdentified}
                  onChange={(e) => setNewRisk({...newRisk, dateIdentified: e.target.value})}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-black font-medium">Review Date</label>
                <input
                  type="date"
                  value={newRisk.reviewDate}
                  onChange={(e) => setNewRisk({...newRisk, reviewDate: e.target.value})}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-black font-medium">Mitigation</label>
              <textarea
                value={newRisk.mitigation}
                onChange={(e) => setNewRisk({...newRisk, mitigation: e.target.value})}
                className="w-full h-24 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
              />
            </div>
            
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowAddRisk(false)}
                className="px-6 py-2 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRisk}
                className="px-6 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
              >
                Add Risk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Out-of-Cycle Risk Modal */}
      {showOutOfCycle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border-2 border-black p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-black" />
              <h2 className="text-xl font-semibold text-black">Create Out-of-Cycle Risk</h2>
            </div>
            
            <div className="bg-gray-50 border-2 border-gray-300 p-4 mb-4">
              <p className="text-sm text-gray-600">
                Use this only for serious incidents or safeguarding events that occur between Governance Pulses. 
                This risk will be flagged for mandatory review at the next scheduled Pulse.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-2 text-black font-medium">House</label>
                <select
                  value={outOfCycleRisk.house}
                  onChange={(e) => setOutOfCycleRisk({...outOfCycleRisk, house: e.target.value})}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                >
                  <option value="">Select house</option>
                  {houses.filter(h => h !== "All").map((house) => (
                    <option key={house} value={house}>
                      {house}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block mb-2 text-black font-medium">Category</label>
                <select
                  value={outOfCycleRisk.category}
                  onChange={(e) => setOutOfCycleRisk({...outOfCycleRisk, category: e.target.value})}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block mb-2 text-black font-medium">Severity</label>
                <select
                  value={outOfCycleRisk.severity}
                  onChange={(e) => setOutOfCycleRisk({...outOfCycleRisk, severity: e.target.value})}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-black font-medium">Risk Description</label>
              <textarea
                value={outOfCycleRisk.description}
                onChange={(e) => setOutOfCycleRisk({...outOfCycleRisk, description: e.target.value})}
                className="w-full h-24 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                placeholder="Describe the incident or concern..."
              />
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-black font-medium">Reason for Out-of-Cycle Creation</label>
              <textarea
                value={outOfCycleRisk.reason}
                onChange={(e) => setOutOfCycleRisk({...outOfCycleRisk, reason: e.target.value})}
                className="w-full h-20 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                placeholder="Explain why this risk requires immediate creation outside the normal Pulse rhythm..."
              />
            </div>
            
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={outOfCycleRisk.requiresImmediateReview}
                  onChange={(e) => setOutOfCycleRisk({...outOfCycleRisk, requiresImmediateReview: e.target.checked})}
                  className="w-4 h-4 border-2 border-black"
                />
                <span className="text-black font-medium">Requires immediate review at next Pulse</span>
              </label>
            </div>
            
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowOutOfCycle(false)}
                className="px-6 py-2 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOutOfCycleRisk}
                className="px-6 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
              >
                Create Out-of-Cycle Risk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
