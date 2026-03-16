import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Calendar, MapPin, AlertTriangle, User, Clock } from "lucide-react";
import { toast } from "sonner";
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
  
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        console.log('Timeline endpoint not available - creating basic timeline');
        // Create basic timeline from incident data
        if (incidentData) {
          setTimeline([
            {
              id: '1',
              event_type: 'created',
              description: 'Incident reported and logged',
              created_at: incidentData.created_at,
              created_by_name: incidentData.created_by_name || 'Unknown'
            },
            {
              id: '2',
              event_type: 'updated',
              description: 'Incident details updated',
              created_at: incidentData.updated_at,
              created_by_name: incidentData.created_by_name || 'Unknown'
            }
          ]);
        }
      }
      
    } catch (error) {
      console.error('Failed to load incident details:', error);
      toast.error('Failed to load incident details');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "under_review": return "bg-black text-white";
      case "closed": return "bg-gray-200 text-gray-800";
      case "archived": return "bg-gray-100 text-gray-600";
      default: return "bg-gray-200 text-gray-800";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical": return "bg-black text-white";
      case "serious": return "bg-gray-800 text-white";
      case "moderate": return "border-2 border-black";
      case "low": return "bg-gray-200";
      default: return "bg-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading incident details...</p>
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
            onClick={() => navigate("/incidents")}
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
        <button
          onClick={() => navigate("/incidents")}
          className="flex items-center gap-2 text-black hover:text-gray-600 transition-colors mb-6 underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Incidents
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-semibold text-black">{incident.title}</h1>
            <span
              className={`px-3 py-1 ${getSeverityColor(incident.severity)}`}
            >
              {incident.severity?.charAt(0).toUpperCase() + incident.severity?.slice(1)} Severity
            </span>
            <span className={`px-3 py-1 ${getStatusColor(incident.status)}`}>
              {incident.status?.replace('_', ' ').charAt(0).toUpperCase() + incident.status?.replace('_', ' ').slice(1)}
            </span>
          </div>
          <p className="text-gray-600">
            {incident.house_name} • Occurred {incident.occurred_at ? new Date(incident.occurred_at).toLocaleDateString('en-GB') : 'N/A'} • Reported by {incident.created_by_name || 'Unknown'}
          </p>
        </div>

        <div className="space-y-6">
          {/* Description */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-3 text-black">Incident Description</h2>
            <p className="text-black">{incident.description}</p>
          </div>

          {/* Incident Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white border-2 border-black p-6">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-black">Location</h3>
              </div>
              <p className="text-black">{incident.location || 'Not specified'}</p>
            </div>
            
            <div className="bg-white border-2 border-black p-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-black">Category</h3>
              </div>
              <p className="text-black">{incident.category_name || 'General'}</p>
            </div>
            
            <div className="bg-white border-2 border-black p-6">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-black">Date & Time</h3>
              </div>
              <p className="text-black">
                {incident.occurred_at ? new Date(incident.occurred_at).toLocaleString('en-GB') : 'N/A'}
              </p>
            </div>
            
            <div className="bg-white border-2 border-black p-6">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-500" />
                <h3 className="font-semibold text-black">Persons Involved</h3>
              </div>
              <p className="text-black">
                {incident.persons_involved?.length > 0 ? incident.persons_involved.join(', ') : 'None specified'}
              </p>
            </div>
          </div>

          {/* Immediate Actions */}
          {incident.immediate_action && (
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-3 text-black">Immediate Actions Taken</h2>
              <p className="text-black">{incident.immediate_action}</p>
            </div>
          )}

          {/* Follow-up Required */}
          {incident.follow_up_required && (
            <div className="bg-yellow-50 border-2 border-yellow-300 p-6">
              <h2 className="text-xl font-semibold mb-3 text-black">Follow-up Required</h2>
              <p className="text-black">This incident requires follow-up actions and monitoring.</p>
            </div>
          )}

          {/* Timeline */}
          <div className="bg-white border-2 border-black p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5" />
              <h2 className="text-xl font-semibold text-black">Incident Timeline</h2>
            </div>
            <div className="space-y-4">
              {timeline.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No timeline events available
                </div>
              ) : (
                timeline.map((event, idx) => (
                  <div key={event.id || idx} className="flex gap-4">
                    <div className="relative">
                      <div className="w-3 h-3 bg-black mt-1.5" />
                      {idx < timeline.length - 1 && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <p className="text-sm text-gray-600">
                        {event.created_at ? new Date(event.created_at).toLocaleDateString('en-GB') : 'N/A'}
                      </p>
                      <p className="text-black">{event.description}</p>
                      <p className="text-sm text-gray-600">{event.created_by_name || 'Unknown'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Incident Metadata */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Incident Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Incident ID</p>
                <p className="text-black">{incident.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">House ID</p>
                <p className="text-black">{incident.house_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Created Date</p>
                <p className="text-black">
                  {incident.created_at ? new Date(incident.created_at).toLocaleDateString('en-GB') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Last Updated</p>
                <p className="text-black">
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
