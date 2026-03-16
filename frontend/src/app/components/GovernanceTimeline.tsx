import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Download, Clock, AlertTriangle, Users, FileText, Calendar, TrendingUp, MapPin } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

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

interface IncidentDetail {
  id: string;
  house_id: string;
  house_name: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  occurred_at: string;
  created_at: string;
  created_by_name: string;
  category_name: string;
  location: string;
  updated_at: string;
}


export function GovernanceTimeline() {
  const navigate = useNavigate();
  const params = useParams();
  const incidentId = params.id || (() => {
    // Fallback: extract ID from URL path
    const pathParts = window.location.pathname.split('/');
    const incidentIndex = pathParts.indexOf('incidents');
    if (incidentIndex !== -1 && pathParts[incidentIndex + 1]) {
      return pathParts[incidentIndex + 1];
    }
    return null;
  })();
  
  console.log('GovernanceTimeline - params:', params, 'incidentId:', incidentId);
  
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const eventsLoadedRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('GovernanceTimeline useEffect triggered');
    console.log('Current URL:', window.location.pathname);
    console.log('Full params object:', params);
    console.log('incidentId from params.id:', params.id);
    console.log('incidentId variable:', incidentId);
    
    if (incidentId) {
      loadTimelineData(incidentId);
      
      // Add a timeout fallback to prevent infinite loading
      timeoutRef.current = setTimeout(() => {
        if (!eventsLoadedRef.current && events.length === 0) {
          console.log('Timeline loading timeout - no events loaded, showing fallback');
          setIsLoading(false);
          // Show a mock timeline as fallback
          if (incidentId) {
            const mockEvents: TimelineEvent[] = [
              {
                id: 'mock-1',
                timestamp: new Date().toISOString(),
                sourceType: 'incident',
                sourceId: incidentId,
                label: 'Timeline Data Unavailable',
                detail: 'Unable to load governance timeline data. The incident details may still be available.',
                actor: 'System',
                actorRole: 'System',
                gapFlag: false
              }
            ];
            setEvents(mockEvents);
          }
        }
      }, 15000); // 15 second timeout
      
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    } else {
      console.log('No incidentId provided');
      setIsLoading(false);
    }
  }, [incidentId, params]);

  const loadTimelineData = async (id: string) => {
    console.log('Loading timeline data for incident:', id);
    try {
      setIsLoading(true);
      
      // Load incident details
      console.log('Fetching incident details...');
      const incidentRes = await apiClient.get(`/incidents/${id}`);
      const incidentData = (incidentRes.data as any).data || (incidentRes.data as any);
      console.log('Incident data loaded:', incidentData);
      setIncident(incidentData);
      
      // Load governance timeline events
      try {
        console.log('Fetching governance timeline...');
        const timelineRes = await apiClient.get(`/incidents/${id}/governance-timeline`);
        console.log('Timeline response:', timelineRes.data);
        
        const timelineData = (timelineRes.data as any).data || (timelineRes.data as any) || {};
        let timelineList: any[] = [];
        
        if (Array.isArray(timelineData)) {
          timelineList = timelineData;
        } else if (timelineData.timeline && Array.isArray(timelineData.timeline)) {
          timelineList = timelineData.timeline;
        } else if (timelineData.items && Array.isArray(timelineData.items)) {
          timelineList = timelineData.items;
        }
        
        console.log('Final timeline list for mapping:', timelineList);
        
        // Calculate intervals between events
        const eventsWithIntervals = timelineList.map((event: any, index: number) => {
          if (index < timelineList.length - 1) {
            const nextEvent = timelineList[index + 1];
            const currentDate = new Date(event.timestamp);
            const nextDate = new Date(nextEvent.timestamp);
            const daysDiff = Math.floor((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
            return { ...event, intervalToNext: daysDiff };
          }
          return { ...event, intervalToNext: 0 };
        });
        
        console.log('Events with intervals:', eventsWithIntervals);
        setEvents(eventsWithIntervals);
        eventsLoadedRef.current = true;
      } catch (err) {
        console.error('Governance timeline endpoint failed:', err);
        // Create mock timeline based on incident
        if (incidentData) {
          const mockEvents: TimelineEvent[] = [
            {
              id: '1',
              timestamp: new Date(incidentData.occurred_at).toISOString(),
              sourceType: 'incident',
              sourceId: incidentData.id,
              label: 'Serious Incident Occurred',
              detail: incidentData.title,
              actor: incidentData.created_by_name || 'Unknown',
              actorRole: 'Reporter',
              gapFlag: true
            }
          ];
          console.log('Setting mock events due to API failure:', mockEvents);
          setEvents(mockEvents);
          eventsLoadedRef.current = true;
        }
      }
      
    } catch (error) {
      console.error('Failed to load timeline data:', error);
      toast.error('Failed to load timeline data');
      // Set empty events to prevent infinite loading
      setEvents([]);
      eventsLoadedRef.current = true;
    } finally {
      console.log('Setting loading to false');
      setIsLoading(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  };

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


  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading governance timeline...</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-black mb-4">Incident not found</h2>
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
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/incidents')}
            className="border-black hover:bg-black hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Incidents
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-black">Governance Timeline</h1>
            <p className="text-gray-600">Chronological oversight trail for {incident.title}</p>
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
                  <div className="font-medium">{incident.house_name}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500">Incident Date</div>
                  <div className="font-medium">{incident.occurred_at ? new Date(incident.occurred_at).toLocaleDateString('en-GB') : 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500">Type</div>
                  <div className="font-medium">{incident.category_name || 'General'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500">Status</div>
                  <div className="font-medium">{incident.status?.replace('_', ' ').charAt(0).toUpperCase() + incident.status?.replace('_', ' ').slice(1)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <div className="text-sm text-gray-500">Response Time</div>
                  <div className="font-medium">{events.length > 0 ? 'Timeline Available' : 'N/A'}</div>
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
                    <span className="text-sm font-medium text-black">
                      {events.filter(e => e.sourceType === 'risk').length > 0 ? 'Early signal recorded' : 'No prior signals'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Escalation discipline</span>
                    <span className="text-sm font-medium text-black">
                      {events.filter(e => e.sourceType === 'escalation').length > 0 ? 'Escalations present' : 'No escalations'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Leadership review</span>
                    <span className="text-sm font-medium text-black">
                      {events.filter(e => e.sourceType === 'pulse').length > 0 ? 'Governance activities recorded' : 'No governance activities'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Documentation</span>
                    <span className="text-sm font-medium text-black">{events.length > 0 ? 'Complete' : 'Limited'}</span>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gray-100 rounded border border-gray-300">
                  <div className="text-sm font-medium text-black mb-1">Governance Interpretation</div>
                  <div className="text-sm text-gray-700">
                    {events.length > 1 ? 
                      `Leadership oversight present with ${events.length - 1} pre-incident activities.` : 
                      'Limited oversight activities prior to incident.'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cross-House Signals */}
            <Card className="border-2 border-black">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Related Activities
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {events.length > 1 ? (
                    events.slice(0, -1).map((event, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                        <span className="text-sm font-medium">{event.label}</span>
                        <span className={`text-sm px-2 py-1 rounded ${getSourceColor(event.sourceType)}`}>
                          {event.sourceType.charAt(0).toUpperCase() + event.sourceType.slice(1)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No related governance activities found
                    </div>
                  )}
                </div>
                
                {events.length > 1 && (
                  <div className="mt-4 p-2 bg-gray-100 border border-gray-300 rounded text-sm text-gray-800">
                    <strong>Pattern detected:</strong> {events.length - 1} governance activities prior to incident
                  </div>
                )}
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
