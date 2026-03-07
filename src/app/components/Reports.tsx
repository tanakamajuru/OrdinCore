import { useState } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { FileDown, Filter, Calendar, AlertTriangle } from "lucide-react";

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
  const navigate = useNavigate();
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
    reportType: "comprehensive"
  });

  const houses = ["Oakwood", "Riverside", "Maple Grove", "Sunset Villa", "Birchwood"];
  const severities = ["High", "Medium", "Low"];
  const categories = ["Clinical", "Operational", "Environmental", "Safety", "Administrative"];
  const statuses = ["Open", "Under Review", "Escalated", "Closed"];
  const reportTypes = [
    { value: "comprehensive", label: "Comprehensive Governance Report" },
    { value: "risk-register", label: "Risk Register Summary" },
    { value: "escalation-log", label: "Escalation Activity Report" },
    { value: "safeguarding", label: "Safeguarding Activity Report" },
    { value: "incidents", label: "Incident Trend Analysis" },
    { value: "weekly-summary", label: "Weekly Governance Summary" }
  ];

  // Mock data for preview
  const previewData = {
    totalRisks: 47,
    highSeverity: 12,
    escalated: 8,
    resolved: 23,
    safeguardingConcerns: 6,
    incidentCount: 34,
    staffingStability: 89
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
    
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In a real implementation, this would call an API
    const reportData = {
      filters: filters,
      data: previewData,
      generatedAt: new Date().toISOString(),
      reportId: `RPT-${Date.now()}`
    };
    
    // Download as JSON for now (would be PDF in production)
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `governance-report-${filters.dateRange.start}-to-${filters.dateRange.end}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setIsGenerating(false);
    alert(`Report generated successfully! Report ID: ${reportData.reportId}`);
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
      reportType: "comprehensive"
    });
  };

  const getActiveFiltersCount = () => {
    return filters.severity.length + 
           filters.houses.length + 
           filters.categories.length + 
           filters.status.length + 
           (filters.reportType !== "comprehensive" ? 1 : 0);
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
                  {houses.map((house) => (
                    <button
                      key={house}
                      onClick={() => handleArrayFilter('houses', house)}
                      className={`px-4 py-2 border-2 transition-colors ${
                        filters.houses.includes(house)
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-gray-300 hover:border-gray-500"
                      }`}
                    >
                      {house}
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
          <h2 className="text-xl font-semibold mb-4 text-black">Recent Generated Reports</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 border border-gray-300">
              <div>
                <p className="font-medium text-black">Comprehensive Governance Report</p>
                <p className="text-sm text-gray-600">Feb 1, 2026 - Feb 28, 2026 • Generated: Mar 1, 2026 09:15 AM</p>
              </div>
              <button className="px-4 py-2 border-2 border-black hover:bg-gray-100 transition-colors">
                Download
              </button>
            </div>
            <div className="flex justify-between items-center p-4 border border-gray-300">
              <div>
                <p className="font-medium text-black">Risk Register Summary</p>
                <p className="text-sm text-gray-600">Feb 15, 2026 - Feb 28, 2026 • Generated: Feb 28, 2026 04:30 PM</p>
              </div>
              <button className="px-4 py-2 border-2 border-black hover:bg-gray-100 transition-colors">
                Download
              </button>
            </div>
            <div className="flex justify-between items-center p-4 border border-gray-300">
              <div>
                <p className="font-medium text-black">Escalation Activity Report</p>
                <p className="text-sm text-gray-600">Feb 1, 2026 - Feb 14, 2026 • Generated: Feb 15, 2026 11:20 AM</p>
              </div>
              <button className="px-4 py-2 border-2 border-black hover:bg-gray-100 transition-colors">
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
