import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate, useLocation } from "react-router";
import { ChevronDown, AlertTriangle, Plus } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

interface Risk {
  id: string;
  house: string;
  description: string;
  impact: string;
  category: string;
  severity: "High" | "Medium" | "Low";
  dateIdentified: string;
  mitigation: string;
  rootCause: string;
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
  const location = useLocation();
  
  // All useState hooks must be declared first, before any conditional logic
  const [houseFilter, setHouseFilter] = useState("All");
  const [severityFilter, setSeverityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAddRisk, setShowAddRisk] = useState(false);
  const [showOutOfCycle, setShowOutOfCycle] = useState(false);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userHouseId, setUserHouseId] = useState<string | null>(null);
  const [userHouseName, setUserHouseName] = useState<string>('');
  const [allHousesData, setAllHouses] = useState<any[]>([]);
  const [categories, setCategoriesState] = useState<string[]>(["Clinical", "Operational", "Environmental", "Safety", "Administrative"]);
  const userRole = (localStorage.getItem('userRole') || '').toUpperCase();
  const userId = JSON.parse(localStorage.getItem('user') || '{}').id;

  // Form states - must be declared before any conditional returns
  const [newRisk, setNewRisk] = useState<Partial<Risk>>({
    house: "",
    description: "",
    impact: "",
    category: "",
    severity: "Medium",
    dateIdentified: new Date().toISOString().split('T')[0],
    mitigation: "",
    rootCause: "",
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

  // Load risks from API
  useEffect(() => {
    loadRisks();
  }, []);

  // Check for query parameter to trigger Add Risk modal
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('addRisk') === 'true') {
      setShowAddRisk(true);
      // Clear the query parameter
      navigate(location.pathname, { replace: true });
    }
  }, [location.search, navigate, location.pathname]);

  const loadRisks = async () => {
    try {
      // 1. Load all houses for the company (to populate filters and selection)
      const housesRes = await apiClient.get('/houses?limit=100');
      const housesData = (housesRes.data as any).data || (housesRes.data as any) || [];
      const allHouses = Array.isArray(housesData) ? housesData : [];
      setAllHouses(allHouses);

      // Get user's house for RM role scoping
      let houseId: string | null = null;
      if (userRole === 'REGISTERED_MANAGER') {
        const hRes = await apiClient.get(`/users/${userId}/houses`);
        const hData = (hRes.data as any).data || (hRes.data as any) || [];
        const myHouse = Array.isArray(hData) ? hData[0] : hData;
        if (myHouse) { 
          houseId = myHouse.id; 
          setUserHouseId(myHouse.id); 
          setUserHouseName(myHouse.name); 
        }
      }

      // Load categories from backend
      try {
        const catRes = await apiClient.get('/risks/categories');
        const catData = (catRes.data as any).data || (catRes.data as any) || [];
        const cats = catData.categories || catData.items || (Array.isArray(catData) ? catData : []);
        if (cats.length > 0) setCategoriesState(cats.map((c: any) => c.name));
      } catch { /* keep defaults */ }

      // Load risks, scoped to house for RM, or all for RI/Admin
      const params = houseId ? `?house_id=${houseId}&limit=100` : '?limit=100';
      const rRes = await apiClient.get(`/risks${params}`);
      const rData = (rRes.data as any).data || (rRes.data as any) || {};
      const rawRisks = rData.risks || rData.items || (Array.isArray(rData) ? rData : []);

      const mapped: Risk[] = rawRisks.map((r: any) => ({
        id: r.id,
        house: r.house_name || (r.house_id ? allHouses.find((h: any) => h.id === r.house_id)?.name : null) || userHouseName || 'Unknown',
        description: r.title || r.description,
        impact: r.description || '',
        category: r.category_name || r.category || 'General',
        severity: r.severity ? (r.severity.charAt(0).toUpperCase() + r.severity.slice(1)) as any : 'Medium',
        dateIdentified: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '',
        mitigation: r.metadata?.mitigation || '',
        rootCause: r.metadata?.rootCause || '',
        reviewDate: r.review_due_date ? new Date(r.review_due_date).toISOString().split('T')[0] : '',
        status: r.status ? (r.status.charAt(0).toUpperCase() + r.status.slice(1).replace('_', ' ')) as any : 'Open',
        escalated: r.status === 'escalated',
        source: r.metadata?.source || 'Manual',
        createdBy: r.created_by_name || '',
        lastUpdated: r.updated_at ? new Date(r.updated_at).toISOString().split('T')[0] : '',
        updateHistory: []
      }));
      setRisks(mapped);
    } catch (error) {
      console.error('Failed to load risks:', error);
      toast.error('Failed to load risk register');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading risk register...</p>
        </div>
      </div>
    );
  }

  const houses = ["All", ...allHousesData.map(h => h.name)];
  const severities = ["All", "High", "Medium", "Low"];
  const statuses = ["All", "Open", "Under Review", "Escalated", "Closed"];

  const filteredRisks = risks.filter((risk) => {
    if (houseFilter !== "All" && risk.house !== houseFilter) return false;
    if (severityFilter !== "All" && risk.severity !== severityFilter) return false;
    if (statusFilter !== "All" && risk.status !== statusFilter) return false;
    return true;
  });

  const handleAddRisk = async () => {
    if (!newRisk.description) { toast.error('Please enter a risk description'); return; }
    // If RI, use selected house; if RM, use assigned house
    const targetHouseId = userRole === 'REGISTERED_MANAGER' ? userHouseId : newRisk.house;
    if (!targetHouseId) { toast.error('House information required'); return; }
    try {
      const reviewDue = newRisk.reviewDate ? new Date(newRisk.reviewDate).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await apiClient.post('/risks', {
        house_id: targetHouseId,
        title: newRisk.description,
        description: newRisk.impact || newRisk.description,
        severity: (newRisk.severity || 'medium').toLowerCase(),
        status: 'open',
        likelihood: 3,
        impact: 3,
        review_due_date: reviewDue,
        metadata: { 
          mitigation: newRisk.mitigation, 
          rootCause: newRisk.rootCause, 
          category: newRisk.category,
          source: 'Manual'
        }
      });
      toast.success('Risk added successfully');
      setShowAddRisk(false);
      setNewRisk({ house: '', description: '', impact: '', category: '', severity: 'Medium', dateIdentified: new Date().toISOString().split('T')[0], mitigation: '', rootCause: '', reviewDate: '', status: 'Open', escalated: false, source: 'Pulse', createdBy: '', lastUpdated: '', updateHistory: [] });
      loadRisks();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to add risk'); }
  };

  const handleOutOfCycleRisk = async () => {
    if (!outOfCycleRisk.description || !outOfCycleRisk.reason) { toast.error('Please fill in description and reason'); return; }
    const targetHouseId = userRole === 'REGISTERED_MANAGER' ? userHouseId : outOfCycleRisk.house;
    if (!targetHouseId) { toast.error('House information required'); return; }
    try {
      await apiClient.post('/risks', {
        house_id: targetHouseId,
        title: outOfCycleRisk.description,
        description: `[Out-of-Cycle] ${outOfCycleRisk.description}. Reason: ${outOfCycleRisk.reason}`,
        severity: outOfCycleRisk.severity.toLowerCase(),
        status: 'open',
        likelihood: 4, impact: 4,
        metadata: { 
          source: 'Out-of-Cycle', 
          requiresImmediateReview: outOfCycleRisk.requiresImmediateReview,
          category: outOfCycleRisk.category,
          reason: outOfCycleRisk.reason
        }
      });
      toast.success('Out-of-cycle risk created — will appear in next Pulse review');
      setShowOutOfCycle(false);
      setOutOfCycleRisk({ house: '', description: '', category: '', severity: 'High', reason: '', requiresImmediateReview: false, createdBy: '' });
      loadRisks();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to create out-of-cycle risk'); }
  };

  // TODO: Implement risk update functionality when needed
  // const updateRisk = (id: string, field: keyof Risk, value: any) => {
  //   setRisks(prev => prev.map(risk => {
  //     if (risk.id === id) {
  //       const oldValue = risk[field];
  //       const updatedRisk = { 
  //         ...risk, 
  //         [field]: value,
  //         lastUpdated: new Date().toISOString().split('T')[0],
  //         updateHistory: [
  //           ...risk.updateHistory,
  //           {
  //             date: new Date().toISOString().split('T')[0],
  //             field: field as string,
  //             oldValue: oldValue,
  //             newValue: value,
  //             updatedBy: "Current User"
  //           }
  //         ]
  //       };
  //       return updatedRisk;
  //     }
  //     return risk;
  //   }));
  // };

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
      <RoleBasedNavigation />
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
                <tr className="bg-black text-white text-sm whitespace-nowrap">
                  <th className="border-b border-gray-300 px-4 py-3 text-left font-semibold">House</th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left font-semibold">Description</th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left font-semibold">Category</th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left font-semibold">Severity</th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left font-semibold">Date Identified</th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left font-semibold">Source</th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left font-semibold">Mitigation</th>
                  <th className="border-b border-gray-300 px-4 py-3 text-center font-semibold">Escalated</th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left font-semibold">Status</th>
                  <th className="border-b border-gray-300 px-4 py-3 text-left font-semibold">Review Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredRisks.map((risk, idx) => (
                  <tr
                    key={risk.id}
                    onClick={() => navigate(`/risk-register/${risk.id}`)}
                    className={`cursor-pointer transition-colors text-sm ${
                      idx % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <td className="border-b border-gray-200 px-4 py-4 whitespace-nowrap">{risk.house}</td>
                    <td className="border-b border-gray-200 px-4 py-4 min-w-[200px] max-w-sm truncate" title={risk.description}>{risk.description}</td>
                    <td className="border-b border-gray-200 px-4 py-4 whitespace-nowrap">{risk.category}</td>
                    <td className="border-b border-gray-200 px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium ${
                          risk.severity === "High"
                            ? "bg-black text-white"
                            : risk.severity === "Medium"
                            ? "border border-black text-black"
                            : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {risk.severity}
                      </span>
                    </td>
                    <td className="border-b border-gray-200 px-4 py-4 whitespace-nowrap">{risk.dateIdentified}</td>
                    <td className="border-b border-gray-200 px-4 py-4 whitespace-nowrap">{getSourceBadge(risk.source)}</td>
                    <td className="border-b border-gray-200 px-4 py-4 min-w-[200px] max-w-sm truncate" title={risk.mitigation}>{risk.mitigation}</td>
                    <td className="border-b border-gray-200 px-4 py-4 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-1 text-xs font-medium ${
                        risk.escalated ? "bg-black text-white" : "text-gray-500"
                      }`}>
                        {risk.escalated ? "Yes" : "-"}
                      </span>
                    </td>
                    <td className="border-b border-gray-200 px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium ${
                          risk.status === "Open"
                            ? "border border-black text-black"
                            : risk.status === "Under Review"
                            ? "bg-gray-200 text-gray-800"
                            : risk.status === "Escalated"
                            ? "bg-black text-white"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {risk.status}
                      </span>
                    </td>
                    <td className="border-b border-gray-200 px-4 py-4 whitespace-nowrap text-gray-600 font-medium">{risk.reviewDate}</td>
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
        <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50">
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
                  {allHousesData.map((house) => (
                    <option key={house.id} value={house.id}>
                      {house.name}
                    </option>
                  ))}
                </select>
                {userRole === 'registered-manager' && (
                  <p className="text-xs text-gray-500 mt-1">Only your assigned house is available</p>
                )}
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
                <label className="block mb-2 text-black font-medium">Reported By</label>
                <input
                  type="text"
                  value={newRisk.createdBy || ""}
                  onChange={(e) => setNewRisk({...newRisk, createdBy: e.target.value})}
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
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-black font-medium">Description</label>
              <textarea
                value={newRisk.description}
                onChange={(e) => setNewRisk({...newRisk, description: e.target.value})}
                className="w-full h-24 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                placeholder="Detailed description of the risk..."
              />
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-black font-medium">Impact</label>
              <textarea
                value={newRisk.impact || ""}
                onChange={(e) => setNewRisk({...newRisk, impact: e.target.value})}
                className="w-full h-20 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                placeholder="Potential impact on residents, operations, compliance..."
              />
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-black font-medium">Mitigation Plan</label>
              <textarea
                value={newRisk.mitigation}
                onChange={(e) => setNewRisk({...newRisk, mitigation: e.target.value})}
                className="w-full h-24 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                placeholder="Immediate and long-term mitigation actions..."
              />
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-black font-medium">Root Cause Analysis</label>
              <textarea
                value={newRisk.rootCause || ""}
                onChange={(e) => setNewRisk({...newRisk, rootCause: e.target.value})}
                className="w-full h-20 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                placeholder="Underlying causes contributing to this risk..."
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
        <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50">
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
                  {allHousesData.map((house) => (
                    <option key={house.id} value={house.id}>
                      {house.name}
                    </option>
                  ))}
                </select>
                {userRole === 'registered-manager' && (
                  <p className="text-xs text-gray-500 mt-1">Only your assigned house is available</p>
                )}
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
