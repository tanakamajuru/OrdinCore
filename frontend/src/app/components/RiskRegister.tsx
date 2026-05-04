import { useState, useEffect, useMemo } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate, useLocation } from "react-router";
import { ChevronDown, AlertTriangle, Plus, TrendingUp, TrendingDown, ArrowRightCircle, Target, Download } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

interface Risk {
  id: string;
  house: string;
  description: string;
  impact: string;
  category: string;
  severity: "Low" | "Medium" | "High" | "Critical";
  dateIdentified: string;
  mitigation: string;
  rootCause: string;
  reviewDate: string;
  status: "Open" | "In Progress" | "Resolved" | "Escalated" | "Closed" | "Under Review";
  escalated: boolean;
  source: "Pulse" | "Out-of-Cycle" | "Manual" | "Cluster";
  trajectory: "Improving" | "Stable" | "Deteriorating" | "Critical";
  sourceClusterName?: string;
  riskScore: number;
  createdBy: string;
  lastUpdated: string;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userHouseId, setUserHouseId] = useState<string | null>(null);
  const [userHouseName, setUserHouseName] = useState<string>('');
  const [allHousesData, setAllHouses] = useState<any[]>([]);
  const [categories, setCategoriesState] = useState<string[]>(["Clinical", "Operational", "Environmental", "Safety", "Administrative"]);
  const userRole = (localStorage.getItem('userRole') || '').toUpperCase();
  let user = { id: '', name: '' };
  try {
    const userStr = localStorage.getItem('user');
    user = userStr ? JSON.parse(userStr) : { id: '', name: '' };
  } catch (e) {
    console.error('Failed to parse user from localStorage', e);
  }
  const userId = user.id || localStorage.getItem('userId') || '';
  /* userRoleDisplay kept for future use */ const _userRoleDisplay = userRole || 'USER'; void _userRoleDisplay;
  const fullName = `${(user as any).first_name || ''} ${(user as any).last_name || ''}`.trim();
  const prefillCreatedBy = fullName || localStorage.getItem('userName') || 'Current User';

  // Form states - must be declared before any conditional returns
  const [newRisk, setNewRisk] = useState<Partial<Risk> & { title?: string }>({
    house: "",
    title: "",
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
    createdBy: prefillCreatedBy,
    lastUpdated: new Date().toISOString().split('T')[0],
  });

  // Out-of-cycle risk form state
  const [outOfCycleRisk, setOutOfCycleRisk] = useState({
    house: "",
    description: "",
    category: "",
    severity: "High",
    reason: "",
    requiresImmediateReview: false,
    createdBy: prefillCreatedBy
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

      // Get user's house for RM/TL role scoping
      let houseId: string | null = null;
      if (userRole === 'REGISTERED_MANAGER' || userRole === 'TEAM_LEADER') {
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
        severity: r.severity || 'Medium',
        dateIdentified: r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : '',
        mitigation: r.metadata?.mitigation || '',
        rootCause: r.metadata?.rootCause || '',
        reviewDate: r.review_due_date ? new Date(r.review_due_date).toISOString().split('T')[0] : '',
        status: r.status || 'Open',
        escalated: r.status === 'Escalated',
        source: r.source_cluster_id ? 'Cluster' : (r.metadata?.source || 'Manual'),
        trajectory: r.trajectory || 'Stable',
        sourceClusterName: r.source_cluster_name,
        riskScore: r.risk_score || 0,
        createdBy: r.created_by_name || '',
        lastUpdated: r.updated_at ? new Date(r.updated_at).toISOString().split('T')[0] : '',
      }));
      setRisks(mapped);
    } catch (error) {
      console.error('Failed to load risks:', error);
      toast.error('Failed to load risk register');
    } finally {
      setIsLoading(false);
    }
  };

  // Moved hooks above conditional return to fix React hook order violation
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const houses = ["All", ...allHousesData.map(h => h.name)];
  const severities = ["All", "High", "Medium", "Low"];
  const statuses = ["All", "Open", "Under Review", "Escalated", "Closed"];

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "Pulse":
        return <span className="px-2 py-1 bg-muted border border-border text-xs text-foreground">Pulse</span>;
      case "Cluster":
        return <span className="px-2 py-1 bg-primary/10 border border-primary/50 text-xs text-primary ">Signal Cluster</span>;
      case "Out-of-Cycle":
        return <span className="px-2 py-1 bg-primary text-primary-foreground text-xs">Out-of-Cycle</span>;
      case "Manual":
        return <span className="px-2 py-1 border border-border text-xs text-muted-foreground">Manual</span>;
      default:
        return <span className="px-2 py-1 border border-border text-xs text-muted-foreground">{source || 'Manual'}</span>;
    }
  };

  const getTrajectoryIcon = (trajectory: string) => {
      switch (trajectory) {
          case 'Improving': return <TrendingUp size={16} className="text-success" />;
          case 'Deteriorating': return <TrendingDown size={16} className="text-destructive animate-pulse" />;
          case 'Critical': return <TrendingDown size={16} className="text-destructive stroke-[3px] animate-bounce" />;
          default: return <ArrowRightCircle size={16} className="text-muted-foreground" />;
      }
  };

  const filteredRisks = useMemo(() => {
    return risks.filter((risk) => {
      if (houseFilter !== "All" && risk.house !== houseFilter) return false;
      if (severityFilter !== "All" && risk.severity !== severityFilter) return false;
      if (statusFilter !== "All" && risk.status !== statusFilter) return false;
      return true;
    });
  }, [risks, houseFilter, severityFilter, statusFilter]);

  const paginatedRisks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRisks.slice(start, start + itemsPerPage);
  }, [filteredRisks, currentPage]);

  const totalPages = Math.ceil(filteredRisks.length / itemsPerPage);

  const risksTable = useMemo(() => (
    <div className="bg-card border-2 border-border shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-primary text-primary-foreground text-sm whitespace-nowrap">
              <th className="border-b border-border px-4 py-3 text-left ">House</th>
              <th className="border-b border-border px-4 py-3 text-left ">Description</th>
              <th className="border-b border-border px-4 py-3 text-left ">Category</th>
              <th className="border-b border-border px-4 py-3 text-center ">Score</th>
              <th className="border-b border-border px-4 py-3 text-center ">Trend</th>
              <th className="border-b border-border px-4 py-3 text-left ">Severity</th>
              <th className="border-b border-border px-4 py-3 text-left ">Date Identified</th>
              <th className="border-b border-border px-4 py-3 text-left ">Source</th>
              <th className="border-b border-border px-4 py-3 text-center ">Escalated</th>
              <th className="border-b border-border px-4 py-3 text-left ">Status</th>
              <th className="border-b border-border px-4 py-3 text-left ">Review Date</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRisks.map((risk, idx) => (
              <tr
                key={risk.id}
                onClick={() => navigate(`/risk-register/${risk.id}`)}
                className={`cursor-pointer transition-colors text-sm ${
                  idx % 2 === 0 ? "bg-card hover:bg-muted" : "bg-muted hover:bg-muted"
                }`}
              >
                <td className="border-b border-border px-4 py-4 whitespace-nowrap">{risk.house}</td>
                <td className="border-b border-border px-4 py-4 min-w-[200px] max-w-sm" title={risk.description}>
                    <div className="">{risk.description}</div>
                    {risk.sourceClusterName && <div className="text-[10px] text-primary uppercase ">Pattern: {risk.sourceClusterName}</div>}
                </td>
                <td className="border-b border-border px-4 py-4 whitespace-nowrap">{risk.category}</td>
                <td className="border-b border-border px-4 py-4 text-center">
                    <span className=" text-lg">{risk.riskScore}</span>
                </td>
                <td className="border-b border-border px-4 py-4 text-center">
                    <div className="flex justify-center">{getTrajectoryIcon(risk.trajectory)}</div>
                </td>
                <td className="border-b border-border px-4 py-4 whitespace-nowrap">
                  <span
                    className={`inline-block px-2 py-1 text-xs  ${
                      risk.severity === "High" || risk.severity === "Critical"
                        ? "bg-destructive text-destructive-foreground"
                        : risk.severity === "Medium"
                        ? "bg-warning text-warning-foreground"
                        : "bg-success text-success-foreground"
                    }`}
                  >
                    {risk.severity}
                  </span>
                </td>
                <td className="border-b border-border px-4 py-4 whitespace-nowrap">{risk.dateIdentified}</td>
                <td className="border-b border-border px-4 py-4 whitespace-nowrap">{getSourceBadge(risk.source)}</td>
                <td className="border-b border-border px-4 py-4 min-w-[200px] max-w-sm truncate" title={risk.mitigation}>{risk.mitigation}</td>
                <td className="border-b border-border px-4 py-4 text-center whitespace-nowrap">
                  <span className={`inline-block px-2 py-1 text-xs  ${
                    risk.escalated ? "bg-destructive text-destructive-foreground" : "text-muted-foreground"
                  }`}>
                    {risk.escalated ? "Yes" : "-"}
                  </span>
                </td>
                <td className="border-b border-border px-4 py-4 whitespace-nowrap">
                  <span
                    className={`inline-block px-2 py-1 text-xs  border border-border ${
                      risk.status === "Open"
                        ? "text-primary"
                        : risk.status === "In Progress" || risk.status === "Under Review"
                        ? "bg-muted text-muted-foreground"
                        : risk.status === "Escalated"
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-success text-success-foreground"
                    }`}
                  >
                    {risk.status}
                  </span>
                </td>
                <td className="border-b border-border px-4 py-4 whitespace-nowrap text-muted-foreground ">{risk.reviewDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-muted text-sm">
          <span className="text-muted-foreground">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredRisks.length)} of {filteredRisks.length} risks
          </span>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.max(prev - 1, 1)); }}
              className="px-3 py-1 bg-card border border-border text-muted-foreground rounded disabled:opacity-50 hover:bg-muted transition-colors"
            >
              Previous
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.min(prev + 1, totalPages)); }}
              className="px-3 py-1 bg-card border border-border text-muted-foreground rounded disabled:opacity-50 hover:bg-muted transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  ), [paginatedRisks, currentPage, totalPages, filteredRisks.length, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading risk register...</p>
        </div>
      </div>
    );
  }

  // Re-added previously deleted non-hook logic
  const handleAddRisk = async () => {
    if (!newRisk.description) { toast.error('Please enter a risk description'); return; }
    // If RI, use selected house; if RM/TL, use assigned house
    const isScopedRole = userRole === 'REGISTERED_MANAGER' || userRole === 'TEAM_LEADER';
    const targetHouseId = isScopedRole ? userHouseId : newRisk.house;
    if (!targetHouseId) { toast.error('House information required'); return; }
    setIsSubmitting(true);
    try {
      const reviewDue = newRisk.reviewDate ? new Date(newRisk.reviewDate).toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await apiClient.post('/risks', {
        house_id: targetHouseId,
        title: newRisk.title || newRisk.description,
        description: newRisk.description || newRisk.impact,
        severity: newRisk.severity || 'Medium',
        status: 'Open',
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
      setNewRisk({ house: '', title: '', description: '', impact: '', category: '', severity: 'Medium', dateIdentified: new Date().toISOString().split('T')[0], mitigation: '', rootCause: '', reviewDate: '', status: 'Open', escalated: false, source: 'Pulse', createdBy: prefillCreatedBy, lastUpdated: '' });
      loadRisks();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to add risk'); }
    finally { setIsSubmitting(false); }
  };

  const handleOutOfCycleRisk = async () => {
    if (!outOfCycleRisk.description || !outOfCycleRisk.reason) { toast.error('Please fill in description and reason'); return; }
    const isScopedRole = userRole === 'REGISTERED_MANAGER' || userRole === 'TEAM_LEADER';
    const targetHouseId = isScopedRole ? userHouseId : outOfCycleRisk.house;
    if (!targetHouseId) { toast.error('House information required'); return; }
    setIsSubmitting(true);
    try {
      await apiClient.post('/risks', {
        house_id: targetHouseId,
        title: outOfCycleRisk.description,
        description: `[Out-of-Cycle] ${outOfCycleRisk.description}. Reason: ${outOfCycleRisk.reason}`,
        severity: outOfCycleRisk.severity || 'Medium',
        status: 'Open',
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
      setOutOfCycleRisk({ house: '', description: '', category: '', severity: 'high', reason: '', requiresImmediateReview: false, createdBy: prefillCreatedBy });
      loadRisks();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to create out-of-cycle risk'); }
    finally { setIsSubmitting(false); }
  };

  const handleExportExcel = () => {
    const escapeHtml = (unsafe: string) => {
      return (unsafe || "").toString()
           .replace(/&/g, "&amp;")
           .replace(/</g, "&lt;")
           .replace(/>/g, "&gt;")
           .replace(/"/g, "&quot;")
           .replace(/'/g, "&#039;");
    };

    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="UTF-8"></head>
      <body>
        <table border="1">
          <thead>
            <tr>
              <th style="background-color: #00A3B2; color: white;">House</th>
              <th style="background-color: #00A3B2; color: white;">Description</th>
              <th style="background-color: #00A3B2; color: white;">Category</th>
              <th style="background-color: #00A3B2; color: white;">Score</th>
              <th style="background-color: #00A3B2; color: white;">Trend</th>
              <th style="background-color: #00A3B2; color: white;">Severity</th>
              <th style="background-color: #00A3B2; color: white;">Date Identified</th>
              <th style="background-color: #00A3B2; color: white;">Source</th>
              <th style="background-color: #00A3B2; color: white;">Escalated</th>
              <th style="background-color: #00A3B2; color: white;">Status</th>
              <th style="background-color: #00A3B2; color: white;">Review Date</th>
              <th style="background-color: #00A3B2; color: white;">Mitigation Plan</th>
              <th style="background-color: #00A3B2; color: white;">Root Cause</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    filteredRisks.forEach(risk => {
      tableHtml += `
        <tr>
          <td>${escapeHtml(risk.house || '')}</td>
          <td>${escapeHtml(risk.description || '')}</td>
          <td>${escapeHtml(risk.category || '')}</td>
          <td>${risk.riskScore || 0}</td>
          <td>${escapeHtml(risk.trajectory || '')}</td>
          <td>${escapeHtml(risk.severity || '')}</td>
          <td>${escapeHtml(risk.dateIdentified || '')}</td>
          <td>${escapeHtml(risk.source || '')}</td>
          <td>${risk.escalated ? "Yes" : "No"}</td>
          <td>${escapeHtml(risk.status || '')}</td>
          <td>${escapeHtml(risk.reviewDate || '')}</td>
          <td>${escapeHtml(risk.mitigation || '')}</td>
          <td>${escapeHtml(risk.rootCause || '')}</td>
        </tr>
      `;
    });
    
    tableHtml += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Risk_Register_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl  text-primary">Risk Register</h1>
            <p className="text-muted-foreground mt-1">Live register of all identified risks</p>
            <div className="mt-2 flex gap-2">
              <span className="text-xs text-muted-foreground">Pulse-originated risks are created through Governance Pulse rhythm</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">Out-of-cycle for urgent incidents</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 bg-card text-foreground border-2 border-border px-4 py-2 hover:bg-muted transition-colors  text-sm"
            >
              <Download className="w-4 h-4" />
              Export to Excel
            </button>
            {/* Removed direct risk creation buttons to enforce Cluster Promotion Doctrine */}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border-2 border-border p-6 mb-6 shadow-sm">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block mb-2 text-foreground ">Filter by House</label>
              <div className="relative">
                <select
                  value={houseFilter}
                  onChange={(e) => setHouseFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border-2 border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground appearance-none cursor-pointer"
                >
                  {houses.map((house) => (
                    <option key={house} value={house}>
                      {house}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="flex-1">
              <label className="block mb-2 text-foreground ">Filter by Severity</label>
              <div className="relative">
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border-2 border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground appearance-none cursor-pointer"
                >
                  {severities.map((severity) => (
                    <option key={severity} value={severity}>
                      {severity}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="flex-1">
              <label className="block mb-2 text-foreground ">Filter by Status</label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 bg-input-background border-2 border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground appearance-none cursor-pointer"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Risk Table */}
        {risksTable}
      </div>

      {/* Add Risk Modal */}
      {showAddRisk && (
        <div className="fixed inset-0 backdrop-blur-sm bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card border-2 border-border p-6 w-full max-w-2xl max-h-screen overflow-y-auto shadow-xl">
            <h2 className="text-xl  mb-4 text-primary">Add New Risk</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-2 text-foreground ">House</label>
                <select
                  value={newRisk.house}
                  onChange={(e) => setNewRisk({...newRisk, house: e.target.value})}
                  className="w-full px-4 py-2 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="">Select house</option>
                  {allHousesData.map((house) => (
                    <option key={house.id} value={house.id}>
                      {house.name}
                    </option>
                  ))}
                </select>
                {(userRole === 'REGISTERED_MANAGER' || userRole === 'TEAM_LEADER') && (
                  <p className="text-xs text-muted-foreground mt-1">Only your assigned house is available</p>
                )}
              </div>
              
              <div>
                <label className="block mb-2 text-foreground ">Risk Title</label>
                <input
                  type="text"
                  value={newRisk.title || ""}
                  onChange={(e) => setNewRisk({...newRisk, title: e.target.value})}
                  className="w-full px-4 py-2 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-foreground ">Reported By</label>
                <input
                  type="text"
                  value={newRisk.createdBy || ""}
                  onChange={(e) => setNewRisk({...newRisk, createdBy: e.target.value})}
                  className="w-full px-4 py-2 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>
              
              <div>
                <label className="block mb-2 text-foreground ">Category</label>
                <select
                  value={newRisk.category}
                  onChange={(e) => setNewRisk({...newRisk, category: e.target.value})}
                  className="w-full px-4 py-2 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
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
                <label className="block mb-2 text-foreground ">Severity</label>
                <select
                  value={newRisk.severity}
                  onChange={(e) => setNewRisk({...newRisk, severity: e.target.value as any})}
                  className="w-full px-4 py-2 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              
              <div>
                <label className="block mb-2 text-foreground ">Date Identified</label>
                <input
                  type="date"
                  value={newRisk.dateIdentified}
                  onChange={(e) => setNewRisk({...newRisk, dateIdentified: e.target.value})}
                  className="w-full px-4 py-2 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-foreground ">Description</label>
              <textarea
                value={newRisk.description}
                onChange={(e) => setNewRisk({...newRisk, description: e.target.value})}
                className="w-full h-24 px-4 py-3 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                placeholder="Detailed description of the risk..."
              />
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-foreground ">Impact</label>
              <textarea
                value={newRisk.impact || ""}
                onChange={(e) => setNewRisk({...newRisk, impact: e.target.value})}
                className="w-full h-20 px-4 py-3 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                placeholder="Potential impact on residents, operations, compliance..."
              />
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-foreground ">Mitigation Plan</label>
              <textarea
                value={newRisk.mitigation}
                onChange={(e) => setNewRisk({...newRisk, mitigation: e.target.value})}
                className="w-full h-24 px-4 py-3 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                placeholder="Immediate and long-term mitigation actions..."
              />
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-foreground ">Root Cause Analysis</label>
              <textarea
                value={newRisk.rootCause || ""}
                onChange={(e) => setNewRisk({...newRisk, rootCause: e.target.value})}
                className="w-full h-20 px-4 py-3 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                placeholder="Underlying causes contributing to this risk..."
              />
            </div>
            
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowAddRisk(false)}
                className="px-6 py-2 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRisk}
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary text-primary-foreground hover:bg-[#008394] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Risk'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Out-of-Cycle Risk Modal */}
      {showOutOfCycle && (
        <div className="fixed inset-0 backdrop-blur-md bg-primary/30 flex items-center justify-center z-50">
          <div className="bg-card border-2 border-border p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-foreground" />
              <h2 className="text-xl  text-foreground">Create Out-of-Cycle Risk</h2>
            </div>
            
            <div className="bg-muted border-2 border-border p-4 mb-4">
              <p className="text-sm text-muted-foreground">
                Use this only for serious incidents or safeguarding events that occur between Governance Pulses. 
                This risk will be flagged for mandatory review at the next scheduled Pulse.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block mb-2 text-foreground ">House</label>
                <select
                  value={outOfCycleRisk.house}
                  onChange={(e) => setOutOfCycleRisk({...outOfCycleRisk, house: e.target.value})}
                  className="w-full px-4 py-2 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="">Select house</option>
                  {allHousesData.map((house) => (
                    <option key={house.id} value={house.id}>
                      {house.name}
                    </option>
                  ))}
                </select>
                {(userRole === 'REGISTERED_MANAGER' || userRole === 'TEAM_LEADER') && (
                  <p className="text-xs text-muted-foreground mt-1">Only your assigned house is available</p>
                )}
              </div>
              
              <div>
                <label className="block mb-2 text-foreground ">Category</label>
                <select
                  value={outOfCycleRisk.category}
                  onChange={(e) => setOutOfCycleRisk({...outOfCycleRisk, category: e.target.value})}
                  className="w-full px-4 py-2 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
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
                <label className="block mb-2 text-foreground ">Severity</label>
                <select
                  value={outOfCycleRisk.severity}
                  onChange={(e) => setOutOfCycleRisk({...outOfCycleRisk, severity: e.target.value})}
                  className="w-full px-4 py-2 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-foreground ">Risk Description</label>
              <textarea
                value={outOfCycleRisk.description}
                onChange={(e) => setOutOfCycleRisk({...outOfCycleRisk, description: e.target.value})}
                className="w-full h-24 px-4 py-3 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                placeholder="Describe the incident or concern..."
              />
            </div>
            
            <div className="mb-4">
              <label className="block mb-2 text-foreground ">Reason for Out-of-Cycle Creation</label>
              <textarea
                value={outOfCycleRisk.reason}
                onChange={(e) => setOutOfCycleRisk({...outOfCycleRisk, reason: e.target.value})}
                className="w-full h-20 px-4 py-3 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                placeholder="Explain why this risk requires immediate creation outside the normal Pulse rhythm..."
              />
            </div>
            
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={outOfCycleRisk.requiresImmediateReview}
                  onChange={(e) => setOutOfCycleRisk({...outOfCycleRisk, requiresImmediateReview: e.target.checked})}
                  className="w-4 h-4 border-2 border-border"
                />
                <span className="text-foreground ">Requires immediate review at next Pulse</span>
              </label>
            </div>
            
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowOutOfCycle(false)}
                className="px-6 py-2 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOutOfCycleRisk}
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary text-primary-foreground hover:bg-[#008394] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Out-of-Cycle Risk'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
