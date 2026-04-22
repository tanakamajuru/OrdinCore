import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { FileDown, Filter, Calendar } from "lucide-react";
import { apiClient } from "@/services/api";

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

  // Real preview data from backend
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
    } catch { /* silently fail - keep zeros */ }
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
    setFilters(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const handleArrayFilter = (category: keyof ReportFilters, value: string) => {
    const currentArray = filters[category] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    setFilters(prev => ({
      ...prev,
      [category]: newArray
    }));
  };

  const generateReport = async () => {
    setIsGenerating(true);
    
    try {
      // Create request payload matching backend ReportsService schema
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
      
      const res = await apiClient.post('/reports/request', requestPayload);
      const data = (res as any).data || res;
      
      alert(`Report generation requested! Report ID: ${data.id || 'N/A'}`);
      
      // Refresh list to show new pending request
      loadGeneratedReports();
    } catch (err: any) {
      console.error('Failed to request report:', err);
      // Fallback
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
        // Since it's a relative URL from backend worker (/reports/id.json), 
        // we might need to prefix it with the API base URL if it's not absolute.
        // But window.open usually handles absolute or relative to current origin.
        // Let's assume the user wants it opened.
        const downloadUrl = data.file_url.startsWith('http') 
          ? data.file_url 
          : `${apiClient.defaults.baseURL?.replace('/api/v1', '') || ''}${data.file_url}`;
          
        window.open(downloadUrl, '_blank');
      } else {
        alert('Download URL not available yet.');
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download report.');
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
    return filters.severity.length + 
           filters.houses.length + 
           filters.categories.length + 
           filters.status.length + 
           (filters.reportType !== "governance_compliance" ? 1 : 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-primary">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Generate custom governance reports with advanced filtering</p>
        </div>

        {/* Report Type Selection */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-black">Report Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {reportTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => handleFilterChange('reportType', type.value)}
                className={`p-4 border-2 text-left transition-all ${
                  filters.reportType === type.value
                    ? "bg-primary text-primary-foreground border-primary shadow-[4px_4px_0px_rgba(0,0,0,1)] -translate-x-1 -translate-y-1"
                    : "bg-white text-black border-black hover:border-primary/50 shadow-sm"
                }`}
              >
                <div className="font-black uppercase italic text-xs mb-1 opacity-70">Layer 4 Oversight</div>
                <div className="font-bold tracking-tight">{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Phase 4: Dynamic Parameter Selection */}
        {(filters.reportType === "detailed_evidence_pack" || filters.reportType === "weekly_narrative") && (
          <div className="bg-white border-2 border-black p-6 mb-6 shadow-[8px_8px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black uppercase italic mb-4 flex items-center gap-2">
                <span className="w-8 h-8 bg-primary text-white flex items-center justify-center font-black rounded-none">!</span>
                Report Context Required
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filters.reportType === "detailed_evidence_pack" && (
                    <div>
                        <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Target Risk Lineage</label>
                        <select 
                            value={filters.riskId || ""}
                            onChange={(e) => setFilters({...filters, riskId: e.target.value})}
                            className="w-full px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-0 font-bold"
                        >
                            <option value="">Select a Risk for Evidence Review...</option>
                            {activeRisks.map(r => (
                                <option key={r.id} value={r.id}>{r.title} ({r.severity})</option>
                            ))}
                        </select>
                        <p className="text-[10px] mt-2 text-muted-foreground uppercase font-bold">This will generate a full CQC-compliant audit trail for the selected risk.</p>
                    </div>
                )}

                {filters.reportType === "weekly_narrative" && (
                    <>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Service Unit</label>
                            <select 
                                value={filters.houseId || ""}
                                onChange={(e) => setFilters({...filters, houseId: e.target.value})}
                                className="w-full px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-0 font-bold"
                            >
                                <option value="">Select House...</option>
                                {allHouses.map(h => (
                                    <option key={h.id} value={h.id}>{h.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-muted-foreground mb-1 tracking-widest">Week Ending Date</label>
                            <input 
                                type="date"
                                value={filters.weekEnding || ""}
                                onChange={(e) => setFilters({...filters, weekEnding: e.target.value})}
                                className="w-full px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-0 font-bold"
                            />
                        </div>
                    </>
                )}
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-card border-2 border-border p-6 mb-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-primary">Filters</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary hover:bg-primary/5 transition-colors font-medium shadow-sm"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Hide Filters" : "Show Filters"}
                {getActiveFiltersCount() > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </button>
              {getActiveFiltersCount() > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 border-2 border-border text-foreground hover:bg-muted transition-colors font-medium"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="space-y-6">
              {/* Date Range */}
              <div>
                <label className="block mb-2 text-foreground font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Date Range
                </label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block mb-1 text-sm text-muted-foreground">From</label>
                    <input
                      type="date"
                      value={filters.dateRange.start}
                      onChange={(e) => handleFilterChange('dateRange', {
                        ...filters.dateRange,
                        start: e.target.value
                      })}
                      className="w-full px-4 py-2 bg-background border-2 border-border rounded focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-1 text-sm text-muted-foreground">To</label>
                    <input
                      type="date"
                      value={filters.dateRange.end}
                      onChange={(e) => handleFilterChange('dateRange', {
                        ...filters.dateRange,
                        end: e.target.value
                      })}
                      className="w-full px-4 py-2 bg-background border-2 border-border rounded focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Severity Filter */}
              <div>
                <label className="block mb-2 text-foreground font-semibold">Severity</label>
                <div className="flex flex-wrap gap-2">
                  {severities.map((severity) => (
                    <button
                      key={severity}
                      onClick={() => handleArrayFilter('severity', severity)}
                      className={`px-4 py-2 border-2 transition-colors font-medium shadow-sm ${
                        filters.severity.includes(severity)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {severity}
                    </button>
                  ))}
                </div>
              </div>

              {/* Houses Filter - Hidden for RM/TL */}
              {!['REGISTERED_MANAGER', 'TEAM_LEADER'].includes(localStorage.getItem('userRole')?.toUpperCase() || '') && (
                <div>
                  <label className="block mb-2 text-black font-medium">Houses</label>
                  <div className="flex flex-wrap gap-2">
                    {allHouses.map((house) => (
                      <button
                        key={house.id}
                        onClick={() => handleArrayFilter('houses', house.id)}
                        className={`px-4 py-2 border-2 transition-colors font-medium shadow-sm ${
                          filters.houses.includes(house.id)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {house.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories Filter */}
              <div>
                <label className="block mb-2 text-black font-medium">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => handleArrayFilter('categories', category)}
                      className={`px-4 py-2 border-2 transition-colors font-medium shadow-sm ${
                        filters.categories.includes(category)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block mb-2 text-black font-medium">Status</label>
                <div className="flex flex-wrap gap-2">
                  {statuses.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleArrayFilter('status', status)}
                      className={`px-4 py-2 border-2 transition-colors font-medium shadow-sm ${
                        filters.status.includes(status)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Manual Authoring Section for Monthly Board Report */}
        {filters.reportType === "organizational_monthly" && (
          <div className="bg-white border-2 border-black p-6 mb-6 shadow-sm">
            <h2 className="text-xl font-bold text-primary mb-4">Board Report Finalisation</h2>
            <p className="text-muted-foreground mb-6">As per governance rules, the Monthly Board Report must include executive narrative before generation.</p>
            
            <div className="space-y-6">
              <div>
                <label className="block font-semibold mb-2">Section 8: Leadership Observations</label>
                <textarea 
                  value={filters.leadershipObservations || ""}
                  onChange={(e) => setFilters(prev => ({ ...prev, leadershipObservations: e.target.value }))}
                  rows={4}
                  placeholder="Enter strategic narrative summarizing the governance period..."
                  className="w-full border-2 border-black p-4 focus:ring-0 text-black"
                />
              </div>
              
              <div>
                <label className="block font-semibold mb-2">Section 9: Actions and Forward Plan</label>
                <textarea 
                  value={filters.forwardPlan || ""}
                  onChange={(e) => setFilters(prev => ({ ...prev, forwardPlan: e.target.value }))}
                  rows={4}
                  placeholder="Detail the planned interventions and focus areas for the upcoming month..."
                  className="w-full border-2 border-black p-4 focus:ring-0 text-black"
                />
              </div>
            </div>
          </div>
        )}

        {/* Preview Section */}
        <div className="bg-card border-2 border-border p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-primary">Report Preview</h2>
          <div className="bg-muted/50 border-2 border-border p-4 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Total Risks</p>
                <p className="text-2xl font-bold text-foreground">{previewData.totalRisks}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">High Severity</p>
                <p className="text-2xl font-bold text-destructive">{previewData.highSeverity}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Escalated</p>
                <p className="text-2xl font-bold text-warning">{previewData.escalated}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Resolved</p>
                <p className="text-2xl font-bold text-success">{previewData.resolved}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Safeguarding</p>
                <p className="text-2xl font-bold text-destructive">{previewData.safeguardingConcerns}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Incidents</p>
                <p className="text-2xl font-bold text-foreground">{previewData.incidentCount}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Staffing Stability</p>
                <p className="text-2xl font-bold text-success">{previewData.staffingStability}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Date Range</p>
                <p className="text-sm font-bold text-primary">
                  {filters.dateRange.start} to {filters.dateRange.end}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Generate Report Button */}
        <div className="flex justify-center">
          <button
            onClick={generateReport}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-12 py-4 font-bold rounded-lg transition-all shadow-lg ${
              isGenerating
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
            }`}
          >
            <FileDown className="w-5 h-5" />
            {isGenerating ? "Generating Report..." : "Generate Report"}
          </button>
        </div>

        {/* Recent Reports */}
        <div className="mt-8 bg-card border-2 border-border p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-primary">Recent Generated Reports</h2>
            <button 
              onClick={loadGeneratedReports}
              className="text-sm border-2 border-primary text-primary px-4 py-2 rounded hover:bg-primary/5 transition-colors font-medium shadow-sm"
            >
              Refresh List
            </button>
          </div>
          <div className="space-y-4">
            {generatedReports.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                No reports generated yet
              </div>
            ) : (
              generatedReports.map((report) => (
                <div key={report.id} className="flex justify-between items-center p-5 bg-background border border-border rounded-lg shadow-sm hover:border-primary/30 transition-colors">
                  <div>
                    <p className="font-bold text-foreground mb-1">
                      {reportTypes.find(t => t.value === report.report_type)?.label || report.report_type || 'Governance Report'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {(report.date_from && report.date_to) ? `${new Date(report.date_from).toLocaleDateString('en-GB')} - ${new Date(report.date_to).toLocaleDateString('en-GB')} • ` : ''}
                      Generated: {new Date(report.created_at).toLocaleString('en-GB')}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                       <span className={`text-[10px] px-2 py-0.5 rounded font-bold shadow-sm ${
                        report.status === 'completed' ? 'bg-success text-success-foreground' :
                        report.status === 'failed' ? 'bg-destructive text-destructive-foreground' :
                        'bg-warning text-warning-foreground'
                      }`}>{report.status?.toUpperCase() || 'UNKNOWN'}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDownload(report.id)}
                    disabled={report.status !== 'completed'}
                    className={`px-6 py-2 border-2 rounded transition-all font-bold shadow-sm ${
                      report.status === 'completed' 
                        ? 'border-primary text-primary hover:bg-primary/5 active:bg-primary/10' 
                        : 'border-border text-muted-foreground cursor-not-allowed opacity-50'
                    }`}
                  >
                    Download PDF
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
