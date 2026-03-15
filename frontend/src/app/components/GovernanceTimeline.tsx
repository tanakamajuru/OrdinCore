import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Download, Clock, AlertTriangle, Users, FileText, Calendar, TrendingUp, MapPin } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

interface TimelineEvent {
  id: string;
  timestamp: string;
  sourceType: "pulse" | "risk" | "escalation" | "weekly-review" | "incident";
  sourceId: string;
  label: string;
  detail: string;
  actor: string;
  actorRole: string;
  gapFlag?: boolean;
  intervalToNext?: number; // days
}

interface IncidentSummary {
  id: string;
  houseName: string;
  incidentDate: string;
  incidentType: string;
  status: string;
}

const mockIncident: IncidentSummary = {
  id: "INC-001",
  houseName: "House B",
  incidentDate: "2024-01-18",
  incidentType: "Safeguarding",
  status: "under-review"
};

const mockTimelineEvents: TimelineEvent[] = [
  {
    id: "1",
    timestamp: "2024-01-05T09:30:00",
    sourceType: "pulse",
    sourceId: "PULSE-001",
    label: "Risk Signal Logged",
    detail: "Medication refusal increasing over past 3 days",
    actor: "Sarah Johnson",
    actorRole: "Registered Manager",
    intervalToNext: 2
  },
  {
    id: "2", 
    timestamp: "2024-01-07T14:15:00",
    sourceType: "escalation",
    sourceId: "ESC-001",
    label: "Escalation Triggered",
    detail: "Medication management risk escalated to Responsible Individual",
    actor: "Sarah Johnson",
    actorRole: "Registered Manager",
    intervalToNext: 2
  },
  {
    id: "3",
    timestamp: "2024-01-09T16:00:00", 
    sourceType: "weekly-review",
    sourceId: "WR-002",
    label: "Weekly Governance Review",
    detail: "Risk discussed in leadership review - action plan updated",
    actor: "Mike Chen",
    actorRole: "Responsible Individual",
    intervalToNext: 3
  },
  {
    id: "4",
    timestamp: "2024-01-12T11:30:00",
    sourceType: "risk",
    sourceId: "RISK-003", 
    label: "Leadership Follow-Up",
    detail: "Manager asked to update risk mitigation plan",
    actor: "Mike Chen",
    actorRole: "Responsible Individual",
    intervalToNext: 6
  },
  {
    id: "5",
    timestamp: "2024-01-18T10:45:00",
    sourceType: "incident",
    sourceId: "INC-001",
    label: "Serious Incident Occurred",
    detail: "Safeguarding referral initiated - medication-related incident",
    actor: "Sarah Johnson", 
    actorRole: "Registered Manager",
    gapFlag: true
  }
];

const crossHouseSignals = [
  { house: "House B", signal: "Medication refusal risk ↑", severity: "high" },
  { house: "House D", signal: "Medication refusal risk ↑", severity: "medium" },
  { house: "House A", signal: "Stable", severity: "low" }
];

export function GovernanceTimeline() {
  const navigate = useNavigate();
  const { incidentId } = useParams();
  const [events] = useState<TimelineEvent[]>(mockTimelineEvents);
  const [incident] = useState<IncidentSummary>(mockIncident);

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case "pulse": return <Clock className="w-4 h-4" />;
      case "risk": return <AlertTriangle className="w-4 h-4" />;
      case "escalation": return <Users className="w-4 h-4" />;
      case "weekly-review": return <FileText className="w-4 h-4" />;
      case "incident": return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getSourceColor = (sourceType: string) => {
    switch (sourceType) {
      case "pulse": return "bg-black text-white";
      case "risk": return "bg-gray-800 text-white";
      case "escalation": return "bg-black text-white";
      case "weekly-review": return "bg-gray-700 text-white";
      case "incident": return "bg-black text-white";
      default: return "bg-gray-600 text-white";
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const calculateResponseIntervals = () => {
    const firstSignal = events.find(e => e.sourceType === "pulse");
    const incident = events.find(e => e.sourceType === "incident");
    
    if (firstSignal && incident) {
      const firstDate = new Date(firstSignal.timestamp);
      const incidentDate = new Date(incident.timestamp);
      const daysDiff = Math.floor((incidentDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        firstSignalToIncident: daysDiff,
        escalationResponse: events.find(e => e.sourceType === "escalation")?.intervalToNext || 0
      };
    }
    return { firstSignalToIncident: 0, escalationResponse: 0 };
  };

  const intervals = calculateResponseIntervals();

  return (
    <div className="min-h-screen bg-white">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate(`/incidents/${incidentId}`)}
            className="border-black hover:bg-black hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Incident
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">Governance Timeline</h1>
            <p className="text-gray-600">Chronological oversight trail for {incident.id}</p>
          </div>
        </div>

        {/* Incident Summary */}
        <Card className="border-2 border-black mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500">Service</div>
                  <div className="font-medium">{incident.houseName}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500">Incident Date</div>
                  <div className="font-medium">{incident.incidentDate}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500">Type</div>
                  <div className="font-medium">{incident.incidentType}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <div className="font-medium">{incident.status}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500">Response Time</div>
                  <div className="font-medium">{intervals.firstSignalToIncident} days</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="lg:col-span-2">
            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Governance Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {events.map((event, index) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getSourceColor(event.sourceType)}`}>
                          {getSourceIcon(event.sourceType)}
                        </div>
                        {index < events.length - 1 && (
                          <div className="w-0.5 h-16 bg-gray-300 mt-2"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-bold text-black">{event.label}</h4>
                            <p className="text-sm text-gray-600 mt-1">{event.detail}</p>
                          </div>
                          {event.gapFlag && (
                            <span className="px-2 py-1 bg-black text-white text-xs rounded">
                              GAP
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-3">
                          <span>{formatDate(event.timestamp)}</span>
                          <span>{formatTime(event.timestamp)}</span>
                          <span>by {event.actor}</span>
                          <span>({event.actorRole})</span>
                          {event.intervalToNext && (
                            <span className="text-black font-medium">→ {event.intervalToNext} days</span>
                          )}
                        </div>

                        {event.gapFlag && (
                          <div className="mt-2 p-2 bg-gray-100 border border-gray-300 rounded text-sm text-gray-800">
                            <strong>Gap detected:</strong> Extended period between oversight activities
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="space-y-6">
            {/* Oversight Summary */}
            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="text-lg">Oversight Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Risk recognition</span>
                    <span className="text-sm font-medium text-black">Early signal recorded</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Escalation discipline</span>
                    <span className="text-sm font-medium text-black">Within {intervals.escalationResponse}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Leadership review</span>
                    <span className="text-sm font-medium text-black">Recorded pre-incident</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Documentation</span>
                    <span className="text-sm font-medium text-black">Complete</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-100 rounded border border-gray-300">
                  <div className="text-sm font-medium text-black mb-1">Governance Interpretation</div>
                  <div className="text-sm text-gray-700">
                    Leadership oversight present prior to incident. Response intervals within expected parameters.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cross-House Signals */}
            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Cross-House Risk Signals
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {crossHouseSignals.map((signal, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                      <span className="text-sm font-medium">{signal.house}</span>
                      <span className={`text-sm px-2 py-1 rounded ${
                        signal.severity === "high" ? "bg-black text-white" :
                        signal.severity === "medium" ? "bg-gray-800 text-white" :
                        "bg-gray-600 text-white"
                      }`}>
                        {signal.signal}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-2 bg-gray-100 border border-gray-300 rounded text-sm text-gray-800">
                  <strong>Pattern detected:</strong> Similar medication signals across 2 houses
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <Button
                    onClick={() => navigate(`/incidents/${incidentId}/report`)}
                    className="w-full bg-black text-white hover:bg-gray-800"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Generate Reconstruction Report
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-black hover:bg-black hover:text-white"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Export Timeline
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-black hover:bg-black hover:text-white"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Add Leadership Commentary
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
