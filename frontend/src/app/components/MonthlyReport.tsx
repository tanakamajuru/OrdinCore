import { useState } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { FileText, Download, CheckCircle, Clock } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { apiClient } from "@/services/api";
import { toast } from "sonner";

export function MonthlyReport() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastReport, setLastReport] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  useEffect(() => {
    loadRecentReports();
  }, []);

  const loadRecentReports = async () => {
    try {
      setIsLoadingReports(true);
      const res = await apiClient.get('/reports?limit=5');
      const data = (res as any).data || res;
      const allReports = Array.isArray(data) ? data : (data.reports || []);
      // Filter for organizational monthly reports
      setReports(allReports.filter((r: any) => r.type === 'organizational_monthly'));
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setIsLoadingReports(false);
    }
  };


  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const response = await apiClient.post('/reports/request', {
        type: 'organizational_monthly',
        name: `Organizational Strategic Report - ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        parameters: { month: new Date().getMonth() + 1, year: new Date().getFullYear() }
      });
      // Extract data from unified response
      const reportData = (response as any).data || response;
      setLastReport(reportData);
      toast.success("Monthly report generation requested");
      loadRecentReports();

    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error("Failed to request report generation");
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
        toast.error('Download URL not available yet.');
      }
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Failed to download report');
    }
  };


  return (
    <div className="min-h-screen bg-white">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Organizational Monthly Report</h1>
          <p className="text-gray-600">Generate high-level strategic summaries for stakeholders and directors</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle>Report Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Month</label>
                    <select className="w-full border-2 border-black p-2 bg-white">
                      <option>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</option>
                      <option>Previous Month</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Included Sections</label>
                    <div className="space-y-2">
                       <div className="flex items-center gap-2">
                         <input type="checkbox" checked readOnly className="accent-black" />
                         <span className="text-sm">Risk Register Summary & Trends</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <input type="checkbox" checked readOnly className="accent-black" />
                         <span className="text-sm">Serious Incident Reconstruction Analysis</span>
                       </div>
                       <div className="flex items-center gap-2">
                         <input type="checkbox" checked readOnly className="accent-black" />
                         <span className="text-sm">Cross-House Compliance Benchmarking</span>
                       </div>
                    </div>
                  </div>
                  <Button 
                    onClick={generateReport} 
                    className="w-full bg-black text-white hover:bg-gray-800 h-12 text-lg font-bold"
                    disabled={isGenerating}
                  >
                    {isGenerating ? "Generating..." : "Generate Strategic PDF Report"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {lastReport && (
              <Card className="border-2 border-black bg-green-50">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="text-green-600 w-8 h-8" />
                    <div>
                      <p className="font-bold text-black">Report Generation Queued</p>
                      <p className="text-sm text-gray-600">ID: {lastReport.id?.substring(0, 8) || 'Pending'}</p>
                    </div>
                  </div>
                  <Button variant="outline" className="border-black">
                    <Clock className="w-4 h-4 mr-2" />
                    Check Progress
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="text-lg">Recent Reports</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingReports ? (
                  <div className="text-center py-4 text-sm text-gray-500">Loading reports...</div>
                ) : reports.length === 0 ? (
                  <div className="text-center py-4 text-sm text-gray-500">No strategic reports generated yet.</div>
                ) : reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <div className="text-sm font-medium text-black truncate max-w-[150px]">{report.name}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        report.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {report.status}
                      </span>
                      {report.status === 'completed' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-black h-8 w-8 p-0"
                          onClick={() => handleDownload(report.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
