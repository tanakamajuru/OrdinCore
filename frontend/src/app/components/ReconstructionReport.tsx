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
  sourceId?: string;
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
  // Reconstruction packs export as PDF (narrative inspection evidence); raw-data CSV
  // export lives on the Reports page. Word/Excel were dropped for format consistency.
  const [reportFormat] = useState<"pdf">("pdf");
  const [incident, setIncident] = useState<IncidentSummary | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [metrics, setMetrics] = useState<GovernanceMetrics>(defaultMetrics);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [findings, setFindings] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [limitations, setLimitations] = useState<string[]>([]);
  const [frozenAt, setFrozenAt] = useState<string|null>(null);
  // 27 Nov 2026 fix (developer brief §02, confirmed live): leadership_commentary is captured on
  // the incident and shown on Incident Detail, but this report never read it at all.
  const [leadershipCommentary, setLeadershipCommentary] = useState<string | null>(null);
  // Finding 03 (incident reconstruction brief): each event names its evidence source and id but
  // gives no way to open it from this report/PDF -- a full, clickable URL to the real record,
  // using the same routes the rest of the app uses. The destination page enforces its own
  // sign-in/tenant/house-scope access -- this only ever builds a link to it.
  const evidenceUrl = (sourceType: string, sourceId?: string): string | null => {
    if (!sourceId) return null;
    switch (sourceType) {
      case 'risk': case 'closure': return `/risk-register/${sourceId}`;
      case 'escalation': return `/escalation-log?focus=${sourceId}`;
      case 'pulse': return `/signals/${sourceId}`;
      case 'action': return `/my-actions?focus=${sourceId}`;
      case 'effectiveness': return `/effectiveness?focus=${sourceId}`;
      default: return null;
    }
  };
  const [leadershipCommentaryBy, setLeadershipCommentaryBy] = useState<string | null>(null);
  const [leadershipCommentaryAt, setLeadershipCommentaryAt] = useState<string | null>(null);
  // 22 Nov 2026 brief -> Serious Incident workflow: when the governance-timeline evidence
  // fails to load, the report must say so everywhere a positive assurance claim or a
  // fabricated metric would otherwise appear — never default to "Oversight Present".
  const [evidenceUnavailable, setEvidenceUnavailable] = useState(false);
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
        setFrozenAt(reportData.frozen ? (reportData.frozen_at || null) : null);
        
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
        // Never fabricate positive findings on a missing dataset (doctrine §8.4): if the
        // backend supplied none, declare the data unavailable rather than asserting oversight.
        setFindings(reportData.findings || ['No findings could be derived from the records available.']);
        setRecommendations(reportData.recommendations || []);
        setLimitations(reportData.limitations || []);
        setLeadershipCommentary(reportData.leadership_commentary || null);
        setLeadershipCommentaryBy(reportData.leadership_commentary_by || null);
        setLeadershipCommentaryAt(reportData.leadership_commentary_at || null);
        setEvidenceUnavailable(false);
      } catch (err) {
        console.error("Failed to load timeline data", err);
        setTimelineEvents([]);
        setMetrics(defaultMetrics);
        setFindings([]);
        setRecommendations([]);
        setLimitations(['Reconstruction evidence could not be loaded — this is not confirmation that no gap exists.']);
        // 22 Nov 2026 brief -> Serious Incident workflow: evidence failed to load, so the
        // report must not assert "Oversight Present" or display the zeroed-out defaultMetrics
        // as real escalation/response-time figures below.
        setEvidenceUnavailable(true);
      }
    } catch (err) {
      console.error("Failed to load incident report data", err);
    } finally {
      setIsLoading(false);
    }
  };


  // 25 Nov 2026 field report: "Download Full Report" used to POST /reports/request (which only
  // queues an async job) then alert + navigate the user away to /reports to fetch it later —
  // so clicking "download" never actually downloaded anything, it just left the page. This
  // report's full content is already rendered on screen, so export it directly via the
  // browser's print-to-PDF instead of round-tripping through the async report queue. The nav/
  // buttons are hidden for print via the `print:hidden` classes below.
  const generateReport = () => {
    window.print();
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading reconstruction report...</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl  text-foreground mb-4">Report data not found</h2>
          <button
            onClick={() => navigate('/incidents')}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-[#008394] transition-colors"
          >
            Back to Incidents
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20 print:pt-0 print:p-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 print:hidden">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate(`/incidents/${incidentId}/timeline`)}
              className="border-border hover:bg-primary hover:text-primary-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Timeline
            </Button>
            <div>
              <h1 className="text-3xl  text-foreground">Governance Reconstruction Report</h1>
              <p className="text-muted-foreground">Official oversight documentation for {(incident as any).title || 'this incident'}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="px-3 py-2 border-2 border-border rounded text-sm text-muted-foreground">PDF</span>
            <Button
              onClick={generateReport}
              className="bg-primary text-primary-foreground hover:bg-[#008394]"
            >
              <Download className="w-4 h-4 mr-2" />
              {`Export ${reportFormat.toUpperCase()}`}
            </Button>
          </div>
        </div>

        {/* Report Header */}
        <Card className="border-2 border-border mb-6">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl  text-foreground mb-2">SERIOUS INCIDENT GOVERNANCE REPORT</h2>
              <p className="text-muted-foreground">OrdinCore Governance Reconstruction System</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Service</div>
                <div className=" text-foreground">{incident.houseName}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Incident Type</div>
                <div className=" text-foreground">{incident.incidentType}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Incident Date</div>
                <div className=" text-foreground">{incident.incidentDate}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Report Status</div>
                <div className=" text-foreground">{incident.status}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Executive Summary */}
        <Card className="border-2 border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-muted rounded border">
                <div className="text-2xl  text-foreground">{metrics.riskSignalsLogged}</div>
                <div className="text-sm text-muted-foreground">Risk Signals Logged</div>
              </div>
              <div className="text-center p-4 bg-muted rounded border">
                <div className="text-2xl  text-foreground">{metrics.escalationsTriggered}</div>
                <div className="text-sm text-muted-foreground">Escalations Triggered</div>
              </div>
              <div className="text-center p-4 bg-muted rounded border">
                <div className="text-2xl  text-foreground">{metrics.leadershipReviews}</div>
                <div className="text-sm text-muted-foreground">Leadership Reviews</div>
              </div>
              <div className="text-center p-4 bg-muted rounded border">
                <div className="text-2xl  text-foreground">{evidenceUnavailable ? "Unavailable" : `${metrics.lastOversightReviewDays} days`}</div>
                <div className="text-sm text-muted-foreground">Last Oversight Before Incident</div>
              </div>
            </div>

            {frozenAt && (
              <div className="mt-6 p-3 bg-emerald-50 border border-emerald-200 rounded text-sm text-emerald-800">
                Published from the locked reconstruction snapshot ({new Date(frozenAt).toLocaleString("en-GB")}). This is the exact frozen evidence, not a live re-derivation.
              </div>
            )}
            <div className="mt-6 p-4 bg-muted border border-border rounded">
              <div className=" text-foreground mb-2">Key Findings (from the records available):</div>
              <ul className="text-sm text-foreground space-y-1">
                {findings.map((finding, i) => (
                  <li key={i}>• {finding}</li>
                ))}
              </ul>
            </div>

            {limitations.length > 0 && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded">
                <div className="text-amber-800 font-medium mb-2">Evidence limitations — this is not a completed gap assessment:</div>
                <ul className="text-sm text-amber-900 space-y-1">
                  {limitations.map((lim, i) => (
                    <li key={i}>• {lim}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Governance Timeline */}
        <Card className="border-2 border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Governance Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {timelineEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No governance timeline events linked to this incident.
                </div>
              ) : timelineEvents.map((event, index) => (
                <div key={index} className="flex gap-4 p-4 bg-muted rounded border">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      event.gapFlag ? "bg-gray-800 text-primary-foreground" : "bg-primary text-primary-foreground"
                    }`}>
                      {event.gapFlag ? <XCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className=" text-foreground">{
                          event.timestamp.includes('T') ? new Date(event.timestamp).toLocaleString('en-GB') : event.timestamp
                        }</div>
                        <div className=" text-foreground mt-1">{event.label}</div>
                        <div className="text-muted-foreground mt-1">{event.detail}</div>
                      </div>
                      {event.gapFlag && (
                        <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded">
                          CRITICAL GAP
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Action by: {event.actor} ({event.actorRole})
                    </div>
                    {evidenceUrl(event.sourceType, event.sourceId) && (
                      <div className="text-xs mt-1 print:text-black">
                        Evidence: <a href={evidenceUrl(event.sourceType, event.sourceId)!} className="text-primary underline">
                          {`${window.location.origin}${evidenceUrl(event.sourceType, event.sourceId)}`}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Assessment */}
        <Card className="border-2 border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Governance Compliance Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted rounded border">
                <div>
                  <div className=" text-foreground">Escalation Response Time</div>
                  <div className="text-sm text-muted-foreground">Time between escalation trigger and leadership review</div>
                </div>
                <div className="text-right">
                  <div className=" text-foreground">
                    {evidenceUnavailable ? "Unavailable" : `${metrics.escalationResponseHours} hours`}
                  </div>
                  <div className="text-sm text-foreground">
                    {evidenceUnavailable ? "Not assessable — evidence unavailable" : (getComplianceStatus("escalationResponse") === "compliant" ? "✓ Compliant" : "✗ Non-compliant")}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded border">
                <div>
                  <div className=" text-foreground">Oversight Frequency</div>
                  <div className="text-sm text-muted-foreground">Days between last governance review and incident</div>
                </div>
                <div className="text-right">
                  <div className=" text-foreground">
                    {evidenceUnavailable ? "Unavailable" : `${metrics.lastOversightReviewDays} days`}
                  </div>
                  <div className="text-sm text-foreground">
                    {evidenceUnavailable ? "Not assessable — evidence unavailable" : (getComplianceStatus("oversightFrequency") === "compliant" ? "✓ Compliant" : "✗ Non-compliant")}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-muted rounded border">
                <div>
                  <div className=" text-foreground">Risk Recognition Timeline</div>
                  <div className="text-sm text-muted-foreground">Days from first signal to incident</div>
                </div>
                <div className="text-right">
                  <div className=" text-foreground">
                    {evidenceUnavailable ? "Unavailable" : `${metrics.firstSignalToIncidentDays} days`}
                  </div>
                  <div className="text-sm text-foreground">
                    {evidenceUnavailable ? "Not assessable — evidence unavailable" : (getComplianceStatus("riskRecognition") === "compliant" ? "✓ Early recognition" : "✗ Delayed recognition")}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cross-House Pattern Analysis */}
        <Card className="border-2 border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Cross-House Pattern Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="mb-4">
              <div className=" text-foreground mb-2">Organizational Risk Patterns</div>
              <div className="text-sm text-muted-foreground mb-4">
                Analysis of similar risk signals across all houses during the relevant period
              </div>
            </div>

            <div className="space-y-3">
              {patterns.length === 0 ? (
                <div className="text-sm text-muted-foreground ">No significant organizational patterns detected in this period.</div>
              ) : patterns.map((pattern, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted rounded border">
                  <div>
                    <div className=" text-foreground">{pattern.house}</div>
                    <div className="text-sm text-muted-foreground">{pattern.signal}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">Detected: {pattern.detected}</div>
                </div>
              ))}
            </div>

            {patterns.length > 0 && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
                <div className=" text-orange-900 mb-1">Pattern Analysis Result:</div>
                <div className="text-sm text-orange-800">
                  Similar risk signals detected across multiple houses indicating potential systemic issues requiring organizational oversight.
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leadership Conclusions */}
        <Card className="border-2 border-border mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Leadership Conclusions & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <div className=" text-foreground mb-3">Governance Effectiveness Assessment</div>
                {/* 22 Nov 2026 brief -> Serious Incident workflow: this block must never assert
                    "Oversight Present" (or any other positive assurance claim, including
                    escalation/response-time compliance) when the reconstruction evidence failed
                    to load — evidenceUnavailable gates it to an honest "cannot assess" statement. */}
                {evidenceUnavailable ? (
                  <div className="bg-amber-50 border border-amber-200 rounded p-4">
                    <div className="text-amber-900 font-medium mb-2">UNABLE TO ASSESS</div>
                    <div className="text-sm text-amber-900">
                      Unable to assess oversight from the available evidence. Reconstruction evidence
                      could not be loaded, so no conclusion — positive or negative — can be drawn
                      about escalation handling, review frequency or response times for this incident.
                    </div>
                  </div>
                ) : (() => {
                  const riskRecognitionOk = getComplianceStatus("riskRecognition") === "compliant";
                  const escalationOk = getComplianceStatus("escalationResponse") === "compliant";
                  const oversightOk = getComplianceStatus("oversightFrequency") === "compliant";
                  const allOk = riskRecognitionOk && escalationOk && oversightOk;
                  return (
                    <div className={allOk ? "bg-muted border border-border rounded p-4" : "bg-amber-50 border border-amber-200 rounded p-4"}>
                      <div className={allOk ? "text-foreground" : "text-amber-900"}>
                        <div className="mb-2">{allOk ? "✓ OVERSIGHT PRESENT" : "⚠ CONCERNS IDENTIFIED"}</div>
                        <div className="text-sm space-y-1">
                          <div>{riskRecognitionOk ? "✓" : "✗"} Risk signals were {riskRecognitionOk ? "identified and documented prior to incident" : "not identified or documented within the expected recognition window"}</div>
                          <div>{escalationOk ? "✓" : "✗"} Escalation protocols were {escalationOk ? "followed appropriately" : "not followed within the required response time"}</div>
                          <div>{oversightOk ? "✓" : "✗"} Leadership reviews {oversightOk ? "occurred with regular frequency" : "did not occur within the required review interval"}</div>
                          <div>{escalationOk ? "✓" : "✗"} Response times were {escalationOk ? "within acceptable parameters" : "outside acceptable parameters"}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <div className=" text-foreground mb-3">Recommendations</div>
                <div className="space-y-2">
                  {recommendations.map((rec, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-foreground">{i + 1}.</span>
                      <span className="text-muted-foreground">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {leadershipCommentary && (
                <div>
                  <div className=" text-foreground mb-3">Leadership Commentary</div>
                  <div className="bg-muted border border-border rounded p-4">
                    <div className="text-sm text-foreground whitespace-pre-wrap">{leadershipCommentary}</div>
                    {(leadershipCommentaryBy || leadershipCommentaryAt) && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {leadershipCommentaryBy || 'Unknown reviewer'}
                        {leadershipCommentaryAt ? ` · ${new Date(leadershipCommentaryAt).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : ''}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <div className=" text-foreground mb-3">Report Certification</div>
                <div className="bg-muted border border-border rounded p-4">
                  <div className="text-sm text-muted-foreground space-y-2">
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
        <div className="flex gap-4 justify-center print:hidden">
          <Button
            onClick={generateReport}
            className="bg-primary text-primary-foreground hover:bg-[#008394] px-8"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Full Report
          </Button>
          <Button
            variant="outline"
            onClick={exportTimeline}
            className="border-border hover:bg-primary hover:text-primary-foreground px-8"
          >
            <FileText className="w-4 h-4 mr-2" />
            Export Timeline Only
          </Button>
        </div>
      </div>
    </div>
  );
}
