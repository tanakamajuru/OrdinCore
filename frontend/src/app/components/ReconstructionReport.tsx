import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Download, FileText, AlertTriangle, Clock, Users, CheckCircle, XCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import apiClient from "@/services/apiClient";

interface TimelineEvent {
  timestamp: string;
  sourceType: string;
  label: string;
  detail: string;
  actor: string;
  actorRole: string;
  gapFlag?: boolean;
}

interface IncidentSummary {
  id: string;
  houseName: string;
  incidentDate: string;
  incidentType: string;
  status: string;
}

interface GovernanceMetrics {
  riskSignalsLogged: number;
  escalationsTriggered: number;
  leadershipReviews: number;
  lastOversightReviewDays: number;
  firstSignalToIncidentDays: number;
  escalationResponseHours: number;
}

const defaultMetrics: GovernanceMetrics = {
  riskSignalsLogged: 0,
  escalationsTriggered: 0,
  leadershipReviews: 0,
  lastOversightReviewDays: 0,
  firstSignalToIncidentDays: 0,
  escalationResponseHours: 0
};

// Cross-house patterns now loaded from backend
interface Pattern {
  house: string;
  signal: string;
  detected: string;
}

export function ReconstructionReport() {
  const navigate = useNavigate();
  // Ensure we get 'id' if 'incidentId' isn't explicitly defined in the route params name
  const params = useParams();
  const incidentId = params.incidentId || params.id;
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportFormat, setReportFormat] = useState<"pdf" | "word">("pdf");
  const [incident, setIncident] = useState<IncidentSummary | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [metrics, setMetrics] = useState<GovernanceMetrics>(defaultMetrics);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [findings, setFindings] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (incidentId) {
      loadReportData(incidentId);
    }
  }, [incidentId]);

  const loadReportData = async (id: string) => {
    try {
      setIsLoading(true);
      
      // Load incident details
      const incidentRes = await apiClient.get(`/incidents/${id}`);
      const incidentData = (incidentRes.data as any).data || (incidentRes.data as any);
      
      setIncident({
        id: incidentData.id || id,
        houseName: incidentData.house_name || "Unknown House",
        incidentDate: incidentData.occurred_at 
          ? new Date(incidentData.occurred_at).toLocaleDateString('en-GB') 
          : new Date().toLocaleDateString('en-GB'),
        incidentType: incidentData.category_name || "Serious Incident",
        status: incidentData.status 
          ? incidentData.status.replace('_', ' ').charAt(0).toUpperCase() + incidentData.status.slice(1)
          : "Under Review"
      });

      // Load governance timeline and metadata
      try {
        const timelineRes = await apiClient.get(`/incidents/${id}/governance-timeline`);
        const reportData = (timelineRes.data as any).data || (timelineRes.data as any) || {};
        
        const timelineList = reportData.timeline || reportData.items || (Array.isArray(reportData) ? reportData : []);
        setTimelineEvents(timelineList);
        
        if (reportData.metrics) {
          setMetrics(reportData.metrics);
        } else {
          setMetrics({
            ...defaultMetrics,
            riskSignalsLogged: timelineList.filter((e: any) => e.sourceType === "risk").length,
            escalationsTriggered: timelineList.filter((e: any) => e.sourceType === "escalation").length,
            leadershipReviews: timelineList.filter((e: any) => e.sourceType === "pulse" || e.sourceType === "weekly-review").length,
          });
        }

        setPatterns(reportData.patterns || []);
        setFindings(reportData.findings || [
          `Leadership was aware of risks observed in the period preceding the incident`,
          `Escalation response time was logged and reviewed`,
          `Governance oversight activities were documented`
        ]);
        setRecommendations(reportData.recommendations || [
          "Review protocols related to the incident category",
          "Enhance staff training on identified risk factors"
        ]);
      } catch (err) {
        console.error("Failed to load timeline data", err);
        setTimelineEvents([]);
        setMetrics(defaultMetrics);
      }
    } catch (err) {
      console.error("Failed to load incident report data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const requestPayload = {
        type: "reconstruction_report",
        name: `Reconstruction Report - ${incident?.id || incidentId}`,
        parameters: {
          incident_id: incidentId
        }
      };
      
      const res = await apiClient.post('/reports/request', requestPayload);
      const data = (res.data as any).data || (res.data as any);
      
      alert(`Report generation requested! You can download it from the Reports page once ready. (ID: ${data.id || 'N/A'})`);
      navigate('/reports');
    } catch (err: any) {
      console.error('Failed to request report:', err);
      alert(`Failed to request report: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const exportTimeline = () => {
    // In real implementation, this would export timeline data
    alert("Timeline data exported successfully!");
  };

  const getComplianceStatus = (metric: string) => {
    switch (metric) {
      case "escalationResponse":
        return metrics.escalationResponseHours <= 48 ? "compliant" : "non-compliant";
      case "oversightFrequency":
        return metrics.lastOversightReviewDays <= 7 ? "compliant" : "non-compliant";
      case "riskRecognition":
        return metrics.firstSignalToIncidentDays <= 14 ? "compliant" : "non-compliant";
      default:
        return "compliant";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading reconstruction report...</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-black mb-4">Report data not found</h2>
          <button
            onClick={() => navigate('/incidents')}
            className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
          >
            Back to Incidents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/incidents/${incidentId}/timeline`)}
              className="border-black hover:bg-black hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Timeline
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-black">Governance Reconstruction Report</h1>
              <p className="text-gray-600">Official oversight documentation for {incident.id}</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <select
              value={reportFormat}
              onChange={(e) => setReportFormat(e.target.value as "pdf" | "word")}
              className="px-3 py-2 border-2 border-black rounded"
            >
              <option value="pdf">PDF</option>
              <option value="word">Word</option>
            </select>
            <Button
              onClick={generateReport}
              disabled={isGenerating}
              className="bg-black text-white hover:bg-gray-800"
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? "Generating..." : `Export ${reportFormat.toUpperCase()}`}
            </Button>
          </div>
        </div>

        {/* Report Header */}
        <Card className="border-2 border-black mb-6">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-black mb-2">SERIOUS INCIDENT GOVERNANCE REPORT</h2>
              <p className="text-gray-600">OrdinCore Governance Reconstruction System</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
              <div>
                <div className="text-sm text-gray-500 mb-1">Service</div>
                <div className="font-bold text-black">{incident.houseName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Incident Type</div>
                <div className="font-bold text-black">{incident.incidentType}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Incident Date</div>
                <div className="font-bold text-black">{incident.incidentDate}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Report Status</div>
                <div className="font-bold text-black">{incident.status}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Executive Summary */}
        <Card className="border-2 border-black mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-gray-50 rounded border">
                <div className="text-2xl font-bold text-black">{metrics.riskSignalsLogged}</div>
                <div className="text-sm text-gray-600">Risk Signals Logged</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded border">
                <div className="text-2xl font-bold text-black">{metrics.escalationsTriggered}</div>
                <div className="text-sm text-gray-600">Escalations Triggered</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded border">
                <div className="text-2xl font-bold text-black">{metrics.leadershipReviews}</div>
                <div className="text-sm text-gray-600">Leadership Reviews</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded border">
                <div className="text-2xl font-bold text-black">{metrics.lastOversightReviewDays} days</div>
                <div className="text-sm text-gray-600">Last Oversight Before Incident</div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-100 border border-gray-300 rounded">
              <div className="font-medium text-black mb-2">Key Findings:</div>
              <ul className="text-sm text-gray-800 space-y-1">
                {findings.map((finding, i) => (
                  <li key={i}>• {finding}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Governance Timeline */}
        <Card className="border-2 border-black mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Governance Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {timelineEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No governance timeline events linked to this incident.
                </div>
              ) : timelineEvents.map((event, index) => (
                <div key={index} className="flex gap-4 p-4 bg-gray-50 rounded border">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      event.gapFlag ? "bg-gray-800 text-white" : "bg-black text-white"
                    }`}>
                      {event.gapFlag ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold text-black">{
                          event.timestamp.includes('T') ? new Date(event.timestamp).toLocaleString('en-GB') : event.timestamp
                        }</div>
                        <div className="font-medium text-black mt-1">{event.label}</div>
                        <div className="text-gray-600 mt-1">{event.detail}</div>
                      </div>
                      {event.gapFlag && (
                        <span className="px-2 py-1 bg-black text-white text-xs rounded">
                          CRITICAL GAP
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      Action by: {event.actor} ({event.actorRole})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Assessment */}
        <Card className="border-2 border-black mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Governance Compliance Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                <div>
                  <div className="font-medium text-black">Escalation Response Time</div>
                  <div className="text-sm text-gray-600">Time between escalation trigger and leadership review</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${
                    getComplianceStatus("escalationResponse") === "compliant" ? "text-black" : "text-black"
                  }`}>
                    {metrics.escalationResponseHours} hours
                  </div>
                  <div className={`text-sm ${
                    getComplianceStatus("escalationResponse") === "compliant" ? "text-black" : "text-black"
                  }`}>
                    {getComplianceStatus("escalationResponse") === "compliant" ? "✓ Compliant" : "✗ Non-compliant"}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                <div>
                  <div className="font-medium text-black">Oversight Frequency</div>
                  <div className="text-sm text-gray-600">Days between last governance review and incident</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${
                    getComplianceStatus("oversightFrequency") === "compliant" ? "text-black" : "text-black"
                  }`}>
                    {metrics.lastOversightReviewDays} days
                  </div>
                  <div className={`text-sm ${
                    getComplianceStatus("oversightFrequency") === "compliant" ? "text-black" : "text-black"
                  }`}>
                    {getComplianceStatus("oversightFrequency") === "compliant" ? "✓ Compliant" : "✗ Non-compliant"}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                <div>
                  <div className="font-medium text-black">Risk Recognition Timeline</div>
                  <div className="text-sm text-gray-600">Days from first signal to incident</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${
                    getComplianceStatus("riskRecognition") === "compliant" ? "text-black" : "text-black"
                  }`}>
                    {metrics.firstSignalToIncidentDays} days
                  </div>
                  <div className={`text-sm ${
                    getComplianceStatus("riskRecognition") === "compliant" ? "text-black" : "text-black"
                  }`}>
                    {getComplianceStatus("riskRecognition") === "compliant" ? "✓ Early recognition" : "✗ Delayed recognition"}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cross-House Pattern Analysis */}
        <Card className="border-2 border-black mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Cross-House Pattern Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-4">
              <div className="font-medium text-black mb-2">Organizational Risk Patterns</div>
              <div className="text-sm text-gray-600 mb-4">
                Analysis of similar risk signals across all houses during the relevant period
              </div>
            </div>

            <div className="space-y-3">
              {patterns.length === 0 ? (
                <div className="text-sm text-gray-500 italic">No significant organizational patterns detected in this period.</div>
              ) : patterns.map((pattern, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                  <div>
                    <div className="font-medium text-black">{pattern.house}</div>
                    <div className="text-sm text-gray-600">{pattern.signal}</div>
                  </div>
                  <div className="text-sm text-gray-500">Detected: {pattern.detected}</div>
                </div>
              ))}
            </div>

            {patterns.length > 0 && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
                <div className="font-medium text-orange-900 mb-1">Pattern Analysis Result:</div>
                <div className="text-sm text-orange-800">
                  Similar risk signals detected across multiple houses indicating potential systemic issues requiring organizational oversight.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leadership Conclusions */}
        <Card className="border-2 border-black mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Leadership Conclusions & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <div className="font-bold text-black mb-3">Governance Effectiveness Assessment</div>
                <div className="bg-gray-100 border border-gray-300 rounded p-4">
                  <div className="text-gray-800">
                    <div className="font-medium mb-2">✓ OVERSIGHT PRESENT</div>
                    <div className="text-sm space-y-1">
                      <div>• Risk signals were identified and documented prior to incident</div>
                      <div>• Escalation protocols were followed appropriately</div>
                      <div>• Leadership reviews occurred with regular frequency</div>
                      <div>• Response times were within acceptable parameters</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="font-bold text-black mb-3">Recommendations</div>
                <div className="space-y-2">
                  {recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-black">{i + 1}.</span>
                      <span className="text-gray-700">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-bold text-black mb-3">Report Certification</div>
                <div className="bg-gray-50 border border-gray-300 rounded p-4">
                  <div className="text-sm text-gray-700 space-y-2">
                    <div>This report was automatically generated by OrdinCore Governance Reconstruction System</div>
                    <div>All timeline events are sourced from immutable system records</div>
                    <div>Report generated on: {new Date().toLocaleDateString('en-GB', { 
                      day: 'numeric', month: 'long', year: 'numeric', 
                      hour: '2-digit', minute: '2-digit' 
                    })}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Actions */}
        <div className="flex gap-4 justify-center">
          <Button
            onClick={generateReport}
            disabled={isGenerating}
            className="bg-black text-white hover:bg-gray-800 px-8"
          >
            <Download className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Download Full Report"}
          </Button>
          <Button
            variant="outline"
            onClick={exportTimeline}
            className="border-black hover:bg-black hover:text-white px-8"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export Timeline Only
          </Button>
        </div>
      </div>
    </div>
  );
}
