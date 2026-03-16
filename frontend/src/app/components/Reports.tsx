import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { FileDown, Filter, Calendar } from "lucide-react";
import apiClient from "@/services/apiClient";

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
}

export function Reports() {
  const [showFilters, setShowFilters] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [filters, setFilters] = useState<ReportFilters>({
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
    { value: "governance_compliance", label: "Comprehensive Governance Report" },
    { value: "risk_summary", label: "Risk Register Summary" },
    { value: "escalation_report", label: "Escalation Activity Report" },
    { value: "custom", label: "Safeguarding Activity Report" },
    { value: "incident_report", label: "Incident Trend Analysis" },
    { value: "house_overview", label: "Weekly Governance Summary" }
  ];

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
  }, []);

  const loadAllHouses = async () => {
    try {
      const res = await apiClient.get('/houses?limit=100');
      const data = (res.data as any).data || (res.data as any) || [];
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
      if (userRole === 'REGISTERED_MANAGER') {
        const hRes = await apiClient.get(`/users/${userId}/houses`);
        const hData = (hRes.data as any).data || (hRes.data as any) || [];
        const myHouse = Array.isArray(hData) ? hData[0] : hData;
        if (myHouse) houseId = myHouse.id;
      }
      const hParam = houseId ? `?house_id=${houseId}` : '';
      const [risksRes, incRes, pulseRes] = await Promise.allSettled([
        apiClient.get(`/risks${hParam}${hParam ? '&' : '?'}limit=200`),
        apiClient.get(`/incidents${hParam}${hParam ? '&' : '?'}limit=200`),
        apiClient.get(`/governance/pulses${hParam}${hParam ? '&' : '?'}limit=50`),
      ]);
      const r = risksRes.status === 'fulfilled' ? ((risksRes.value.data as any).data || (risksRes.value.data as any) || {}) : {};
      const risks = r.risks || r.items || (Array.isArray(r) ? r : []);
      const i = incRes.status === 'fulfilled' ? ((incRes.value.data as any).data || (incRes.value.data as any) || {}) : {};
      const incs = i.incidents || i.items || (Array.isArray(i) ? i : []);
      const p = pulseRes.status === 'fulfilled' ? ((pulseRes.value.data as any).data || (pulseRes.value.data as any) || {}) : {};
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
      const data = (res.data as any).data || (res.data as any) || [];
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
          status: filters.status
        }
      };
      
      const res = await apiClient.post('/reports/request', requestPayload);
      const data = (res.data as any).data || (res.data as any);
      
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
      const data = (res.data as any).data || (res.data as any);
      
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
    <div className="min-h-screen bg-white">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-black">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Generate custom governance reports with advanced filtering</p>
        </div>

        {/* Report Type Selection */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-black">Report Type</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {reportTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => handleFilterChange('reportType', type.value)}
                className={`p-4 border-2 text-left transition-colors ${
                  filters.reportType === type.value
                    ? "bg-black text-white border-black"
                    : "bg-white text-black border-gray-300 hover:border-gray-500"
                }`}
              >
                <div className="font-medium">{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-black">Filters</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border-2 border-black hover:bg-gray-100 transition-colors"
              >
                <Filter className="w-4 h-4" />
                {showFilters ? "Hide Filters" : "Show Filters"}
                {getActiveFiltersCount() > 0 && (
                  <span className="bg-black text-white text-xs px-2 py-1 rounded-full">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </button>
              {getActiveFiltersCount() > 0 && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 border-2 border-gray-300 hover:border-gray-500 transition-colors"
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
                <label className="block mb-2 text-black font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date Range
                </label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block mb-1 text-sm text-gray-600">From</label>
                    <input
                      type="date"
                      value={filters.dateRange.start}
                      onChange={(e) => handleFilterChange('dateRange', {
                        ...filters.dateRange,
                        start: e.target.value
                      })}
                      className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block mb-1 text-sm text-gray-600">To</label>
                    <input
                      type="date"
                      value={filters.dateRange.end}
                      onChange={(e) => handleFilterChange('dateRange', {
                        ...filters.dateRange,
                        end: e.target.value
                      })}
                      className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                    />
                  </div>
                </div>
              </div>

              {/* Severity Filter */}
              <div>
                <label className="block mb-2 text-black font-medium">Severity</label>
                <div className="flex flex-wrap gap-2">
                  {severities.map((severity) => (
                    <button
                      key={severity}
                      onClick={() => handleArrayFilter('severity', severity)}
                      className={`px-4 py-2 border-2 transition-colors ${
                        filters.severity.includes(severity)
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-gray-300 hover:border-gray-500"
                      }`}
                    >
                      {severity}
                    </button>
                  ))}
                </div>
              </div>

              {/* Houses Filter */}
              <div>
                <label className="block mb-2 text-black font-medium">Houses</label>
                <div className="flex flex-wrap gap-2">
                  {allHouses.map((house) => (
                    <button
                      key={house.id}
                      onClick={() => handleArrayFilter('houses', house.id)}
                      className={`px-4 py-2 border-2 transition-colors ${
                        filters.houses.includes(house.id)
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-gray-300 hover:border-gray-500"
                      }`}
                    >
                      {house.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories Filter */}
              <div>
                <label className="block mb-2 text-black font-medium">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => handleArrayFilter('categories', category)}
                      className={`px-4 py-2 border-2 transition-colors ${
                        filters.categories.includes(category)
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-gray-300 hover:border-gray-500"
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
                      className={`px-4 py-2 border-2 transition-colors ${
                        filters.status.includes(status)
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-gray-300 hover:border-gray-500"
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

        {/* Preview Section */}
        <div className="bg-white border-2 border-black p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-black">Report Preview</h2>
          <div className="bg-gray-50 border-2 border-gray-300 p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Total Risks</p>
                <p className="text-2xl font-semibold text-black">{previewData.totalRisks}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">High Severity</p>
                <p className="text-2xl font-semibold text-black">{previewData.highSeverity}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Escalated</p>
                <p className="text-2xl font-semibold text-black">{previewData.escalated}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Resolved</p>
                <p className="text-2xl font-semibold text-black">{previewData.resolved}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Safeguarding</p>
                <p className="text-2xl font-semibold text-black">{previewData.safeguardingConcerns}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Incidents</p>
                <p className="text-2xl font-semibold text-black">{previewData.incidentCount}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Staffing Stability</p>
                <p className="text-2xl font-semibold text-black">{previewData.staffingStability}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">Date Range</p>
                <p className="text-sm font-medium text-black">
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
            className={`flex items-center gap-2 px-8 py-3 font-medium transition-colors ${
              isGenerating
                ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                : "bg-black text-white hover:bg-gray-800"
            }`}
          >
            <FileDown className="w-5 h-5" />
            {isGenerating ? "Generating Report..." : "Generate Report"}
          </button>
        </div>

        {/* Recent Reports */}
        <div className="mt-8 bg-white border-2 border-black p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-black">Recent Generated Reports</h2>
            <button 
              onClick={loadGeneratedReports}
              className="text-sm border-2 border-black px-3 py-1 hover:bg-black hover:text-white transition-colors"
            >
              Refresh List
            </button>
          </div>
          <div className="space-y-3">
            {generatedReports.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border border-gray-300">
                No reports generated yet
              </div>
            ) : (
              generatedReports.map((report) => (
                <div key={report.id} className="flex justify-between items-center p-4 border border-gray-300">
                  <div>
                    <p className="font-medium text-black">
                      {reportTypes.find(t => t.value === report.report_type)?.label || report.report_type || 'Governance Report'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {(report.date_from && report.date_to) ? `${new Date(report.date_from).toLocaleDateString('en-GB')} - ${new Date(report.date_to).toLocaleDateString('en-GB')} • ` : ''}
                      Generated: {new Date(report.created_at).toLocaleString('en-GB')}
                    </p>
                    <p className="text-xs mt-1">
                      Status: <span className={
                        report.status === 'completed' ? 'text-green-600 font-bold' :
                        report.status === 'failed' ? 'text-red-600 font-bold' :
                        'text-yellow-600 font-bold'
                      }>{report.status?.toUpperCase() || 'UNKNOWN'}</span>
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDownload(report.id)}
                    disabled={report.status !== 'completed'}
                    className={`px-4 py-2 border-2 transition-colors ${
                      report.status === 'completed' 
                        ? 'border-black hover:bg-gray-100' 
                        : 'border-gray-300 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Download
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
