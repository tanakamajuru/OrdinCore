import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { FileDown, Filter, Calendar } from "lucide-react";
import { apiClient } from "@/services/api";
import { MonthlyReportEditor } from "./MonthlyReportEditor";

interface ReportFilters {
  dateRange: {
    start: string;
    end: string;
  };
  severity: string[];
  houses: string[];
  categories: string[];
  status: string[];
  reportType: string;
  riskId?: string;
  weekEnding?: string;
  houseId?: string;
}

export function Reports() {
  const [showFilters, setShowFilters] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showMonthlyEditor, setShowMonthlyEditor] = useState(false);
  const userRole = (localStorage.getItem('userRole') || '').toUpperCase();
  
  const [filters, setFilters] = useState<ReportFilters & { leadershipObservations?: string; forwardPlan?: string }>({
    dateRange: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    severity: [],
    houses: [],
    categories: [],
    status: [],
    reportType: "governance_compliance"
  });

  const [allHouses, setAllHouses] = useState<any[]>([]);
  const severities = ["High", "Medium", "Low"];
  const categories = ["Clinical", "Operational", "Environmental", "Safety", "Administrative"];
  const statuses = ["All", "Open", "Under Review", "Escalated", "Closed"];
  const reportTypes = [
    { value: "cross_site_summary", label: "Cross-Site Governance Summary" },
    { value: "governance_compliance", label: "Comprehensive Governance Report" },
    { value: "detailed_evidence_pack", label: "CQC Evidence Pack (Risk Lineage)" },
    { value: "weekly_narrative", label: "Weekly Governance Narrative" },
    { value: "organizational_monthly", label: "Monthly Board Report (Strategic)" },
    { value: "risk_summary", label: "Risk Register Summary" },
    { value: "escalation_report", label: "Escalation Activity Report" },
    { value: "custom", label: "Safeguarding Activity Report" },
    { value: "incident_report", label: "Incident Trend Analysis" }
  ];

  const [activeRisks, setActiveRisks] = useState<any[]>([]);
  const [previewData, setPreviewData] = useState({
    totalRisks: 0, highSeverity: 0, escalated: 0, resolved: 0,
    safeguardingConcerns: 0, incidentCount: 0, staffingStability: 0, pulsesCompleted: 0
  });
  const [generatedReports, setGeneratedReports] = useState<any[]>([]);

  useEffect(() => { 
    loadAllHouses();
    loadPreviewData(); 
    loadGeneratedReports();
    loadActiveRisks();
  }, []);

  const loadActiveRisks = async () => {
    try {
      const res = await apiClient.get('/risks?limit=100');
      const data = (res as any).data || res || [];
      const list = data.risks || data.items || (Array.isArray(data) ? data : []);
      setActiveRisks(list);
    } catch (err) {
      console.error('Failed to load risks:', err);
    }
  };

  const loadAllHouses = async () => {
    try {
      const res = await apiClient.get('/houses?limit=100');
      const data = (res as any).data || res || [];
      if (Array.isArray(data)) setAllHouses(data);
    } catch (err) {
      console.error('Failed to load houses:', err);
    }
  };

  const loadPreviewData = async () => {
    try {
      const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
      const userRole = (localStorage.getItem('userRole') || '').toUpperCase();
      let houseId: string | null = null;
      if (userRole === 'REGISTERED_MANAGER' || userRole === 'TEAM_LEADER') {
        const hRes = await apiClient.get(`/users/${userId}/houses`);
        const hData = (hRes as any).data || hRes || [];
        const myHouse = Array.isArray(hData) ? hData[0] : hData;
        if (myHouse) houseId = myHouse.id;
      }
      const hParam = houseId ? `?house_id=${houseId}` : '';
      const [risksRes, incRes, pulseRes] = await Promise.allSettled([
        apiClient.get(`/risks${hParam}${hParam ? '&' : '?'}limit=200`),
        apiClient.get(`/incidents${hParam}${hParam ? '&' : '?'}limit=200`),
        apiClient.get(`/governance/pulses${hParam}${hParam ? '&' : '?'}limit=50`),
      ]);
      const r = risksRes.status === 'fulfilled' ? ((risksRes.value as any).data || risksRes.value || {}) : {};
      const risks = r.risks || r.items || (Array.isArray(r) ? r : []);
      const i = incRes.status === 'fulfilled' ? ((incRes.value as any).data || incRes.value || {}) : {};
      const incs = i.incidents || i.items || (Array.isArray(i) ? i : []);
      const p = pulseRes.status === 'fulfilled' ? ((pulseRes.value as any).data || pulseRes.value || {}) : {};
      const pulses = p.pulses || p.items || (Array.isArray(p) ? p : []);
      setPreviewData({
        totalRisks: risks.length,
        highSeverity: risks.filter((x: any) => x.severity === 'high' || x.severity === 'critical').length,
        escalated: risks.filter((x: any) => x.status === 'escalated').length,
        resolved: risks.filter((x: any) => x.status === 'resolved' || x.status === 'closed').length,
        safeguardingConcerns: incs.filter((x: any) => x.severity === 'serious' || x.severity === 'critical').length,
        incidentCount: incs.length,
        staffingStability: pulses.length > 0 ? Math.round(pulses.filter((x: any) => x.status === 'completed').length / pulses.length * 100) : 0,
        pulsesCompleted: pulses.filter((x: any) => x.status === 'completed').length,
      });
    } catch { /* silently fail */ }
  };

  const loadGeneratedReports = async () => {
    try {
      const res = await apiClient.get('/reports?limit=10');
      const data = (res as any).data || res || [];
      const list = data.reports || data.items || (Array.isArray(data) ? data : []);
      setGeneratedReports(list);
    } catch (err) {
      console.error('Failed to load generated reports:', err);
    }
  };

  const handleFilterChange = (category: keyof ReportFilters, value: any) => {
    setFilters(prev => ({ ...prev, [category]: value }));
  };

  const handleArrayFilter = (category: keyof ReportFilters, value: string) => {
    const currentArray = filters[category] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    setFilters(prev => ({ ...prev, [category]: newArray }));
  };

  const generateReport = async () => {
    if (filters.reportType === 'organizational_monthly' && userRole === 'DIRECTOR') {
      setShowMonthlyEditor(true);
      return;
    }
    if (filters.reportType === 'weekly_narrative' && (!filters.houseId && (!filters.houses || filters.houses.length === 0))) {
      alert("Please select a Service Unit (House) for the Weekly Narrative report.");
      return;
    }
    if (filters.reportType === 'weekly_narrative' && !filters.weekEnding) {
      alert("Please select a Week Ending date for the Weekly Narrative report.");
      return;
    }
    if (filters.reportType === 'detailed_evidence_pack' && !filters.riskId) {
      alert("Please select a Target Risk for the Evidence Pack.");
      return;
    }

    setIsGenerating(true);
    try {
      const requestPayload = {
        type: filters.reportType || 'governance_compliance',
        name: `Governance Report - ${new Date().toLocaleDateString('en-GB')}`,
        parameters: {
          date_from: filters.dateRange.start,
          date_to: filters.dateRange.end,
          severity: filters.severity,
          houses: filters.houses,
          categories: filters.categories,
          status: filters.status,
          leadership_observations: filters.leadershipObservations,
          forward_plan: filters.forwardPlan,
          risk_id: filters.riskId,
          week_ending: filters.weekEnding,
          house_id: filters.houseId || filters.houses[0]
        }
      };
      await apiClient.post('/reports/request', requestPayload);
      alert(`Report generation requested!`);
      loadGeneratedReports();
    } catch (err: any) {
      console.error('Failed to request report:', err);
      alert(`Failed to request report: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (reportId: string) => {
    try {
      const res = await apiClient.get(`/reports/${reportId}/download`);
      const data = (res as any).data || res;
      if (data.file_url) {
        const downloadUrl = data.file_url.startsWith('http') 
          ? data.file_url 
          : `${apiClient.baseURL?.replace('/api/v1', '') || ''}${data.file_url}`;

        window.open(downloadUrl, '_blank');
      } else {
        alert('Download URL not available yet.');
      }
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const clearFilters = () => {
    setFilters({
      dateRange: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      severity: [],
      houses: [],
      categories: [],
      status: [],
      reportType: "governance_compliance"
    });
  };

  const getActiveFiltersCount = () => {
    return filters.severity.length + filters.houses.length + filters.categories.length + filters.status.length + (filters.reportType !== "governance_compliance" ? 1 : 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        {showMonthlyEditor ? (
          <MonthlyReportEditor onClose={() => setShowMonthlyEditor(false)} />
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-3xl  text-primary">Reports & Analytics</h1>
              <p className="text-muted-foreground mt-1">Generate custom governance reports with advanced filtering</p>
            </div>

            <div className="bg-card border-2 border-border p-6 mb-6">
              <h2 className="text-xl  mb-4 text-foreground">Report Type</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reportTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleFilterChange('reportType', type.value)}
                    className={`p-4 border-2 text-left transition-all ${
                      filters.reportType === type.value
                        ? "bg-primary text-primary-foreground border-primary  -translate-x-1 -translate-y-1"
                        : "bg-card text-foreground border-border hover:border-primary/50 shadow-sm"
                    }`}
                  >
                    <div className=" uppercase  text-xs mb-1 opacity-70">Layer 4 Oversight</div>
                    <div className=" tracking-tight">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {(filters.reportType === "detailed_evidence_pack" || filters.reportType === "weekly_narrative") && (
              <div className="bg-card border-2 border-border p-6 mb-6 ">
                <h2 className="text-xl  uppercase  mb-4">Report Context Required</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filters.reportType === "detailed_evidence_pack" && (
                    <div>
                      <label className="block text-[10px]  uppercase text-muted-foreground mb-1 tracking-widest">Target Risk Lineage</label>
                      <select 
                        value={filters.riskId || ""}
                        onChange={(e) => setFilters({...filters, riskId: e.target.value})}
                        className="w-full px-4 py-3 bg-card border-2 border-border "
                      >
                        <option value="">Select a Risk...</option>
                        {activeRisks.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                      </select>
                    </div>
                  )}
                  {filters.reportType === "weekly_narrative" && (
                    <>
                      <div>
                        <label className="block text-[10px]  uppercase text-muted-foreground mb-1 tracking-widest">Service Unit</label>
                        <select 
                          value={filters.houseId || ""}
                          onChange={(e) => setFilters({...filters, houseId: e.target.value})}
                          className="w-full px-4 py-3 bg-card border-2 border-border "
                        >
                          <option value="">Select House...</option>
                          {allHouses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px]  uppercase text-muted-foreground mb-1 tracking-widest">Week Ending Date</label>
                        <input 
                          type="date"
                          value={filters.weekEnding || ""}
                          onChange={(e) => setFilters({...filters, weekEnding: e.target.value})}
                          className="w-full px-4 py-3 bg-card border-2 border-border "
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="bg-card border-2 border-border p-6 mb-6 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl  text-primary">Filters</h2>
                <div className="flex gap-2">
                  <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary ">
                    <Filter className="w-4 h-4" /> {showFilters ? "Hide Filters" : "Show Filters"}
                  </button>
                  {getActiveFiltersCount() > 0 && <button onClick={clearFilters} className="px-4 py-2 border-2 border-border text-foreground ">Clear All</button>}
                </div>
              </div>
              {showFilters && (
                <div className="space-y-6">
                  <div>
                    <label className="block mb-2 text-foreground ">Date Range</label>
                    <div className="flex gap-4">
                      <input type="date" value={filters.dateRange.start} onChange={(e) => handleFilterChange('dateRange', {...filters.dateRange, start: e.target.value})} className="flex-1 px-4 py-2 border-2 border-border rounded" />
                      <input type="date" value={filters.dateRange.end} onChange={(e) => handleFilterChange('dateRange', {...filters.dateRange, end: e.target.value})} className="flex-1 px-4 py-2 border-2 border-border rounded" />
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2 text-foreground ">Severity</label>
                    <div className="flex flex-wrap gap-2">
                      {severities.map(s => <button key={s} onClick={() => handleArrayFilter('severity', s)} className={`px-4 py-2 border-2 ${filters.severity.includes(s) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border"}`}>{s}</button>)}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2 text-foreground ">Services (Houses)</label>
                    <div className="flex flex-wrap gap-2">
                      {allHouses.map(h => <button key={h.id} onClick={() => handleArrayFilter('houses', h.id)} className={`px-4 py-2 border-2 ${filters.houses.includes(h.id) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border"}`}>{h.name}</button>)}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-2 text-foreground ">Status</label>
                    <div className="flex flex-wrap gap-2">
                      {statuses.map(s => <button key={s} onClick={() => handleArrayFilter('status', s.toLowerCase())} className={`px-4 py-2 border-2 ${filters.status.includes(s.toLowerCase()) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border"}`}>{s}</button>)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <button
                onClick={generateReport}
                disabled={isGenerating}
                className={`flex items-center gap-2 px-12 py-4  rounded-lg transition-all shadow-lg ${isGenerating ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}
              >
                <FileDown className="w-5 h-5" /> {isGenerating ? "Generating..." : "Generate Report"}
              </button>
            </div>

            <div className="mt-8 bg-card border-2 border-border p-6 shadow-sm">
              <h2 className="text-xl  text-primary mb-6">Recent Reports</h2>
              <div className="space-y-4">
                {generatedReports.map((report) => (
                  <div key={report.id} className="flex justify-between items-center p-5 bg-background border border-border rounded-lg shadow-sm">
                    <div>
                      <p className=" text-foreground">{reportTypes.find(t => t.value === report.type)?.label || report.type}</p>
                      <p className="text-sm text-muted-foreground">{new Date(report.created_at).toLocaleString('en-GB')}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-[10px]  uppercase px-2 py-1 border ${
                        report.status === 'completed' ? 'bg-success/10 text-success border-success/20' :
                        report.status === 'failed' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                        'bg-warning/10 text-warning border-warning/20'
                      }`}>
                        {report.status}
                      </span>
                      <button 
                        onClick={() => handleDownload(report.id)} 
                        disabled={report.status !== 'completed'} 
                        className="px-6 py-2 border-2 rounded  border-primary text-primary hover:bg-primary/5 disabled:opacity-50 disabled:grayscale transition-all"
                      >
                        Download
                      </button>
                      {report.status === 'failed' && report.error_message && (
                        <p className="text-[10px] text-destructive  max-w-[200px] text-right truncate" title={report.error_message}>
                          Error: {report.error_message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
