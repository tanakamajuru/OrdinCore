import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Download, FileText, AlertTriangle, Clock, Users, CheckCircle, XCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

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

const mockIncident: IncidentSummary = {
  id: "INC-001",
  houseName: "House B",
  incidentDate: "18 January 2024",
  incidentType: "Safeguarding",
  status: "Under Review"
};

const mockMetrics: GovernanceMetrics = {
  riskSignalsLogged: 3,
  escalationsTriggered: 2,
  leadershipReviews: 2,
  lastOversightReviewDays: 6,
  firstSignalToIncidentDays: 13,
  escalationResponseHours: 48
};

const mockTimelineEvents: TimelineEvent[] = [
  {
    timestamp: "5 January 2024 09:30",
    sourceType: "pulse",
    label: "Risk Signal Logged",
    detail: "Medication refusal increasing over past 3 days",
    actor: "Sarah Johnson",
    actorRole: "Registered Manager"
  },
  {
    timestamp: "7 January 2024 14:15",
    sourceType: "escalation", 
    label: "Escalation Triggered",
    detail: "Medication management risk escalated to Responsible Individual",
    actor: "Sarah Johnson",
    actorRole: "Registered Manager"
  },
  {
    timestamp: "9 January 2024 16:00",
    sourceType: "weekly-review",
    label: "Weekly Governance Review",
    detail: "Risk discussed in leadership review - action plan updated",
    actor: "Mike Chen",
    actorRole: "Responsible Individual"
  },
  {
    timestamp: "12 January 2024 11:30",
    sourceType: "risk",
    label: "Leadership Follow-Up",
    detail: "Manager asked to update risk mitigation plan", 
    actor: "Mike Chen",
    actorRole: "Responsible Individual"
  },
  {
    timestamp: "18 January 2024 10:45",
    sourceType: "incident",
    label: "Serious Incident Occurred",
    detail: "Safeguarding referral initiated - medication-related incident",
    actor: "Sarah Johnson",
    actorRole: "Registered Manager",
    gapFlag: true
  }
];

const crossHousePatterns = [
  { house: "House B", signal: "Medication refusal risk ↑", detected: "5 Jan" },
  { house: "House D", signal: "Medication refusal risk ↑", detected: "8 Jan" },
  { house: "House A", signal: "Stable", detected: "No patterns" }
];

export function ReconstructionReport() {
  const navigate = useNavigate();
  const { incidentId } = useParams();
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportFormat, setReportFormat] = useState<"pdf" | "word">("pdf");

  const generateReport = async () => {
    setIsGenerating(true);
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsGenerating(false);
    // In real implementation, this would trigger download
    alert(`${reportFormat.toUpperCase()} report generated successfully!`);
  };

  const exportTimeline = () => {
    // In real implementation, this would export timeline data
    alert("Timeline data exported successfully!");
  };

  const getComplianceStatus = (metric: string) => {
    switch (metric) {
      case "escalationResponse":
        return mockMetrics.escalationResponseHours <= 48 ? "compliant" : "non-compliant";
      case "oversightFrequency":
        return mockMetrics.lastOversightReviewDays <= 7 ? "compliant" : "non-compliant";
      case "riskRecognition":
        return mockMetrics.firstSignalToIncidentDays <= 14 ? "compliant" : "non-compliant";
      default:
        return "compliant";
    }
  };

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
              <p className="text-gray-600">Official oversight documentation for {mockIncident.id}</p>
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
              <p className="text-gray-600">CareSignal Governance Reconstruction System</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
              <div>
                <div className="text-sm text-gray-500 mb-1">Service</div>
                <div className="font-bold text-black">{mockIncident.houseName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Incident Type</div>
                <div className="font-bold text-black">{mockIncident.incidentType}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Incident Date</div>
                <div className="font-bold text-black">{mockIncident.incidentDate}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">Report Status</div>
                <div className="font-bold text-black">{mockIncident.status}</div>
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
                <div className="text-2xl font-bold text-black">{mockMetrics.riskSignalsLogged}</div>
                <div className="text-sm text-gray-600">Risk Signals Logged</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded border">
                <div className="text-2xl font-bold text-black">{mockMetrics.escalationsTriggered}</div>
                <div className="text-sm text-gray-600">Escalations Triggered</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded border">
                <div className="text-2xl font-bold text-black">{mockMetrics.leadershipReviews}</div>
                <div className="text-sm text-gray-600">Leadership Reviews</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded border">
                <div className="text-2xl font-bold text-black">{mockMetrics.lastOversightReviewDays} days</div>
                <div className="text-sm text-gray-600">Last Oversight Before Incident</div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-100 border border-gray-300 rounded">
              <div className="font-medium text-black mb-2">Key Findings:</div>
              <ul className="text-sm text-gray-800 space-y-1">
                <li>• Leadership was aware of risks {mockMetrics.firstSignalToIncidentDays} days before the incident</li>
                <li>• Escalation response time was {mockMetrics.escalationResponseHours} hours (within expected timeframe)</li>
                <li>• Governance oversight activities were documented and regular</li>
                <li>• Cross-house patterns detected in medication management risks</li>
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
              {mockTimelineEvents.map((event, index) => (
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
                        <div className="font-bold text-black">{event.timestamp}</div>
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
                    {mockMetrics.escalationResponseHours} hours
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
                    {mockMetrics.lastOversightReviewDays} days
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
                    {mockMetrics.firstSignalToIncidentDays} days
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
              {crossHousePatterns.map((pattern, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                  <div>
                    <div className="font-medium text-black">{pattern.house}</div>
                    <div className="text-sm text-gray-600">{pattern.signal}</div>
                  </div>
                  <div className="text-sm text-gray-500">Detected: {pattern.detected}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
              <div className="font-medium text-orange-900 mb-1">Pattern Analysis Result:</div>
              <div className="text-sm text-orange-800">
                Similar medication-related risk signals detected across multiple houses indicating potential systemic issue
              </div>
            </div>
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
                  <div className="flex gap-2">
                    <span className="text-black">1.</span>
                    <span className="text-gray-700">Review medication management protocols organization-wide due to cross-house patterns</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-black">2.</span>
                    <span className="text-gray-700">Enhance staff training on medication refusal de-escalation strategies</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-black">3.</span>
                    <span className="text-gray-700">Implement cross-house risk sharing in weekly governance reviews</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-black">4.</span>
                    <span className="text-gray-700">Consider reducing escalation response timeframe to 24 hours for medication-related risks</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="font-bold text-black mb-3">Report Certification</div>
                <div className="bg-gray-50 border border-gray-300 rounded p-4">
                  <div className="text-sm text-gray-700 space-y-2">
                    <div>This report was automatically generated by CareSignal Governance Reconstruction System</div>
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
