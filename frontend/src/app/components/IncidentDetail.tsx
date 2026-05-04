import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Calendar, MapPin, AlertTriangle, User, Clock, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./ui/button";
import apiClient from "@/services/apiClient";

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
  immediate_action: string;
  persons_involved: string[];
  follow_up_required: boolean;
  updated_at: string;
  linked_risks?: any[];
  linked_escalations?: any[];
  la_referral?: string;
  cqc_notification?: string;
  police_reference?: string;
  other_references?: string;
  is_foreseeable?: string;
  risk_factors?: string;
  preventive_measures?: string;
  leadership_commentary?: string;
}

interface TimelineEvent {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
  created_by_name: string;
}

export function IncidentDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const { user } = useAuth();
  const userRole = (user?.role || localStorage.getItem('userRole') || '').toUpperCase();
  
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      loadIncidentDetails(id);
    }
  }, [id]);

  const loadIncidentDetails = async (incidentId: string) => {
    try {
      setIsLoading(true);
      
      // Load incident details
      const incidentRes = await apiClient.get(`/incidents/${incidentId}`);
      const incidentData = (incidentRes.data as any).data || (incidentRes.data as any);
      setIncident(incidentData);
      
      // Load timeline for this incident
      try {
        const timelineRes = await apiClient.get(`/incidents/${incidentId}/timeline`);
        const timelineData = (timelineRes.data as any).data || (timelineRes.data as any) || [];
        const timelineList = timelineData.timeline || timelineData.items || (Array.isArray(timelineData) ? timelineData : []);
        setTimeline(timelineList);
      } catch (err) {
        setTimeline([]);
      }
      
    } catch (error) {
      console.error('Failed to load incident details:', error);
      toast.error('Failed to load incident details');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!id || !incident) return;
    
    try {
      setIsUpdating(true);
      await apiClient.patch(`/incidents/${id}`, { status: newStatus });
      toast.success(`Incident status updated to ${newStatus}`);
      loadIncidentDetails(id);
    } catch (err) {
      console.error('Failed to update incident status:', err);
      toast.error('Failed to update incident status');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "In Progress": return "bg-primary text-primary-foreground";
      case "Closed": return "bg-gray-200 text-foreground";
      case "Archived": return "bg-muted text-muted-foreground";
      default: return "bg-gray-200 text-foreground";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical": return "bg-primary text-primary-foreground";
      case "serious": return "bg-gray-800 text-primary-foreground";
      case "moderate": return "border-2 border-border";
      case "low": return "bg-gray-200";
      default: return "bg-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading incident details...</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl  text-foreground mb-4">Incident not found</h2>
          <button
            onClick={() => navigate("/incidents")}
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
      <div className="p-6 w-full pt-20">
        <button
          onClick={() => navigate("/incidents")}
          className="flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors mb-6 underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Incidents
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl  text-foreground">{incident.title}</h1>
            <span
              className={`px-3 py-1 ${getSeverityColor(incident.severity)}`}
            >
              {incident.severity?.charAt(0).toUpperCase() + incident.severity?.slice(1)} Severity
            </span>
            <span className={`px-3 py-1 ${getStatusColor(incident.status)}`}>
              {incident.status}
            </span>
          </div>
          <p className="text-muted-foreground">
            {incident.house_name} • Occurred {incident.occurred_at ? new Date(incident.occurred_at).toLocaleDateString('en-GB') : 'N/A'} • Reported by {incident.created_by_name || 'Unknown'}
          </p>
        </div>

        {/* Governance Moderation Actions */}
        {['REGISTERED_MANAGER', 'RI', 'DIRECTOR', 'ADMIN'].includes(userRole) && incident.status !== 'closed' && (
          <div className="bg-primary/5 border-2 border-primary/20 p-6 mb-6 rounded-lg flex flex-wrap gap-4 items-center justify-between">
            <div>
              <h3 className="text-lg  text-primary flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Governance Moderation
              </h3>
              <p className="text-sm text-muted-foreground ">Update the incident status following investigation</p>
            </div>
            <div className="flex gap-3">
              {incident.status === 'Open' && (
                <Button 
                  onClick={() => updateStatus('In Progress')}
                  disabled={isUpdating}
                  className="bg-primary text-primary-foreground hover:bg-primary/90  shadow-sm"
                >
                  {isUpdating ? 'Updating...' : 'Start Investigation'}
                </Button>
              )}
              {incident.status !== 'Resolved' && incident.status !== 'Closed' && (
                <Button 
                  onClick={() => updateStatus('Resolved')}
                  disabled={isUpdating}
                  variant="outline"
                  className="border-success text-success hover:bg-success/10 "
                >
                  {isUpdating ? 'Updating...' : 'Mark as Resolved'}
                </Button>
              )}
              {['RESPONSIBLE_INDIVIDUAL', 'RI', 'DIRECTOR', 'ADMIN'].includes(userRole) && (
                <Button 
                  onClick={() => updateStatus('Closed')}
                  disabled={isUpdating}
                  variant="destructive"
                  className=" shadow-md"
                >
                  {isUpdating ? 'Updating...' : 'Close & Archive Case'}
                </Button>
              )}
              {['RESPONSIBLE_INDIVIDUAL', 'RI', 'DIRECTOR'].includes(userRole) && (
                <Button 
                  onClick={async () => {
                    try {
                      setIsUpdating(true);
                      await apiClient.post(`/ri-governance/incidents/${id}/acknowledge`, {
                        acknowledgement_text: "Reviewed and accepted RM mitigation plan.",
                        is_statutory_notification: true
                      });
                      toast.success("Incident acknowledged and signed off");
                      loadIncidentDetails(id!);
                    } catch (err) {
                      toast.error("Failed to acknowledge incident");
                    } finally {
                      setIsUpdating(false);
                    }
                  }}
                  disabled={isUpdating}
                  className="bg-primary text-primary-foreground hover:bg-success hover:text-primary-foreground "
                >
                  {isUpdating ? 'Acknowledging...' : 'Acknowledge Sign-Off'}
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Description */}
          <div className="bg-card border-2 border-border p-6">
            <h2 className="text-xl  mb-3 text-foreground">Incident Description</h2>
            <p className="text-foreground">{incident.description}</p>
          </div>

          {/* Incident Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-card border-2 border-border p-6">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <h3 className=" text-foreground">Location</h3>
              </div>
              <p className="text-foreground">{incident.location || 'Not specified'}</p>
            </div>
            
            <div className="bg-card border-2 border-border p-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <h3 className=" text-foreground">Category</h3>
              </div>
              <p className="text-foreground">{incident.category_name || 'General'}</p>
            </div>
            
            <div className="bg-card border-2 border-border p-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h3 className=" text-foreground">Date & Time</h3>
              </div>
              <p className="text-foreground">
                {incident.occurred_at ? new Date(incident.occurred_at).toLocaleString('en-GB') : 'N/A'}
              </p>
            </div>
            
            <div className="bg-card border-2 border-border p-6">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <h3 className=" text-foreground">Persons Involved</h3>
              </div>
              <p className="text-foreground">
                {incident.persons_involved?.length > 0 ? incident.persons_involved.join(', ') : 'None specified'}
              </p>
            </div>
          </div>

          {/* Immediate Actions */}
          {incident.immediate_action && (
            <div className="bg-card border-2 border-border p-6">
              <h2 className="text-xl  mb-3 text-foreground">Immediate Actions Taken</h2>
              <p className="text-foreground">{incident.immediate_action}</p>
            </div>
          )}

          {/* Linked Risks & Escalations */}
          {(incident.linked_risks?.length > 0 || incident.linked_escalations?.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card border-2 border-border p-6">
                <h2 className="text-xl  mb-4 text-foreground flex items-center gap-2">
                  < Shield className="w-5 h-5 text-primary" />
                  Linked Risks
                </h2>
                <div className="space-y-3">
                  {incident.linked_risks?.map((risk: any) => (
                    <div 
                      key={risk.id} 
                      className="p-3 bg-muted/50 border border-border rounded hover:border-primary/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/risks/${risk.id}`)}
                    >
                      <p className="font-bold text-foreground text-sm">{risk.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{risk.severity} • {risk.status}</p>
                    </div>
                  ))}
                  {(!incident.linked_risks || incident.linked_risks.length === 0) && (
                    <p className="text-sm text-muted-foreground italic">No risks linked to this incident.</p>
                  )}
                </div>
              </div>

              <div className="bg-card border-2 border-border p-6">
                <h2 className="text-xl  mb-4 text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  Linked Escalations
                </h2>
                <div className="space-y-3">
                  {incident.linked_escalations?.map((esc: any) => (
                    <div 
                      key={esc.id} 
                      className="p-3 bg-muted/50 border border-border rounded hover:border-warning/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/escalations/${esc.id}`)}
                    >
                      <p className="font-bold text-foreground text-sm">{esc.reason || 'Formal Escalation'}</p>
                      <p className="text-xs text-muted-foreground mt-1">Level: {esc.level} • {esc.status}</p>
                    </div>
                  ))}
                  {(!incident.linked_escalations || incident.linked_escalations.length === 0) && (
                    <p className="text-sm text-muted-foreground italic">No escalations linked to this incident.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* External References & Leadership Assessment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(incident.la_referral || incident.cqc_notification || incident.police_reference || incident.other_references) && (
              <div className="bg-card border-2 border-border p-6">
                <h2 className="text-xl  mb-4 text-foreground flex items-center gap-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  External References
                </h2>
                <div className="space-y-4">
                  {incident.la_referral && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">LA Referral</p>
                      <p className="text-sm font-medium">{incident.la_referral}</p>
                    </div>
                  )}
                  {incident.cqc_notification && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">CQC Notification</p>
                      <p className="text-sm font-medium">{incident.cqc_notification}</p>
                    </div>
                  )}
                  {incident.police_reference && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Police Reference</p>
                      <p className="text-sm font-medium">{incident.police_reference}</p>
                    </div>
                  )}
                  {incident.other_references && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Other References</p>
                      <p className="text-sm font-medium">{incident.other_references}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(incident.is_foreseeable || incident.risk_factors || incident.preventive_measures || incident.leadership_commentary) && (
              <div className="bg-card border-2 border-border p-6">
                <h2 className="text-xl  mb-4 text-foreground flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Leadership Assessment
                </h2>
                <div className="space-y-4">
                  {incident.is_foreseeable && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Foreseeable?</p>
                      <p className="text-sm font-medium capitalize">{incident.is_foreseeable}</p>
                    </div>
                  )}
                  {incident.risk_factors && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Contributing Factors</p>
                      <p className="text-sm">{incident.risk_factors}</p>
                    </div>
                  )}
                  {incident.preventive_measures && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Preventive Measures</p>
                      <p className="text-sm">{incident.preventive_measures}</p>
                    </div>
                  )}
                  {incident.leadership_commentary && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Leadership Commentary</p>
                      <p className="text-sm italic">"{incident.leadership_commentary}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-card border-2 border-border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5" />
              <h2 className="text-xl  text-foreground">Incident Timeline</h2>
            </div>
            <div className="space-y-4">
              {timeline.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No timeline events available
                </div>
              ) : (
                timeline.map((event, idx) => (
                  <div key={event.id || idx} className="flex gap-4">
                    <div className="relative">
                      <div className="w-3 h-3 bg-primary mt-1.5" />
                      {idx < timeline.length - 1 && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <p className="text-sm text-muted-foreground">
                        {event.created_at ? new Date(event.created_at).toLocaleDateString('en-GB') : 'N/A'}
                      </p>
                      <p className="text-foreground">{event.description}</p>
                      <p className="text-sm text-muted-foreground">{event.created_by_name || 'Unknown'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Incident Metadata */}
          <div className="bg-card border-2 border-border p-6">
            <h2 className="text-xl  mb-4 text-foreground">Incident Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Incident ID</p>
                <p className="text-foreground">{incident.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">House ID</p>
                <p className="text-foreground">{incident.house_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Created Date</p>
                <p className="text-foreground">
                  {incident.created_at ? new Date(incident.created_at).toLocaleDateString('en-GB') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
                <p className="text-foreground">
                  {incident.updated_at ? new Date(incident.updated_at).toLocaleDateString('en-GB') : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
