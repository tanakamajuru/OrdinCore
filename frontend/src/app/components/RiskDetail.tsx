import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

interface RiskDetail {
  id: string;
  house_name: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  created_at: string;
  created_by_name: string;
  category_name: string;
  review_due_date: string;
  metadata?: {
    mitigation?: string;
    rootCause?: string;
    source?: string;
    impact?: string;
  };
  escalated?: boolean;
  updated_at: string;
}

interface Action {
  id: string;
  description: string;
  status: string;
  created_at: string;
}

interface TimelineEntry {
  id: string;
  event_type: string;
  description: string;
  created_at: string;
  created_by_name: string;
}

export function RiskDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const userRole = (localStorage.getItem('userRole') || '').toUpperCase();
  
  const [showAddAction, setShowAddAction] = useState(false);
  const [risk, setRisk] = useState<RiskDetail | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAction, setNewAction] = useState({
    action: "",
    status: "Pending" as "Pending" | "In Progress" | "Complete" | "Ongoing",
    date: ""
  });
  
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    event_type: "updated",
    description: ""
  });
  const [isEscalating, setIsEscalating] = useState(false);

  const handleEscalate = async () => {
    if (!id) return;
    setIsEscalating(true);
    try {
      await apiClient.post(`/risks/${id}/escalate`, {
        reason: "Manual escalation by user"
      });
      toast.success('Risk escalated successfully');
      loadRiskDetails(id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to escalate risk');
    } finally {
      setIsEscalating(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadRiskDetails(id);
    }
  }, [id]);

  const loadRiskDetails = async (riskId: string) => {
    try {
      setIsLoading(true);
      
      // Load risk details
      const riskRes = await apiClient.get(`/risks/${riskId}`);
      const riskData = (riskRes.data as any).data || (riskRes.data as any);
      setRisk(riskData);
      
      // Load actions for this risk
      try {
        const actionsRes = await apiClient.get(`/risks/${riskId}/actions`);
        const actionsData = (actionsRes.data as any).data || (actionsRes.data as any) || [];
        const actionsList = actionsData.actions || actionsData.items || (Array.isArray(actionsData) ? actionsData : []);
        setActions(actionsList);
      } catch (err) {
        console.log('Actions endpoint not available - using empty state');
        setActions([]);
      }
      
      // Load timeline for this risk
      try {
        const timelineRes = await apiClient.get(`/risks/${riskId}/timeline`);
        const timelineData = (timelineRes.data as any).data || (timelineRes.data as any) || [];
        const timelineList = timelineData.timeline || timelineData.items || (Array.isArray(timelineData) ? timelineData : []);
        setTimeline(timelineList);
      } catch (err) {
        console.log('Timeline endpoint not available - creating basic timeline');
        // Create basic timeline from risk data
        if (riskData) {
          setTimeline([
            {
              id: '1',
              event_type: 'created',
              description: 'Risk identified and created',
              created_at: riskData.created_at,
              created_by_name: riskData.created_by_name || 'Unknown'
            }
          ]);
        }
      }
      
    } catch (error) {
      console.error('Failed to load risk details:', error);
      toast.error('Failed to load risk details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAction = async () => {
    if (!newAction.action) {
      toast.error('Please enter an action description');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await apiClient.post(`/risks/${id}/action`, {
        description: newAction.action,
        status: newAction.status,
        action_date: newAction.date || new Date().toISOString().split('T')[0]
      });
      
      toast.success('Action added successfully');
      setShowAddAction(false);
      setNewAction({ action: "", status: "Pending", date: "" });
      
      // Reload actions and timeline
      if (id) {
        loadRiskDetails(id);
      }
    } catch (error: any) {
      console.log('Actions endpoint not available - simulating action addition');
      // Simulate adding an action locally when endpoint is not available
      const newActionItem = {
        id: Date.now().toString(),
        description: newAction.action,
        status: newAction.status,
        created_at: new Date().toISOString()
      };
      setActions(prev => [...prev, newActionItem]);
      
      toast.success('Action added successfully (local simulation)');
      setShowAddAction(false);
      setNewAction({ action: "", status: "Pending", date: "" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.description) {
      toast.error('Please enter an event description');
      return;
    }
    
    setIsSubmittingEvent(true);
    try {
      await apiClient.post(`/risks/${id}/event`, {
        event_type: newEvent.event_type.toLowerCase().replace(' ', '_'),
        description: newEvent.description
      });
      
      toast.success('Event added to timeline successfully');
      setShowAddEvent(false);
      setNewEvent({ event_type: "updated", description: "" });
      
      // Reload timeline
      if (id) {
        loadRiskDetails(id);
      }
    } catch (error: any) {
      console.log('Event endpoint not available - simulating event addition');
      const newTimelineItem = {
        id: Date.now().toString(),
        event_type: newEvent.event_type.toLowerCase().replace(' ', '_'),
        description: newEvent.description,
        created_at: new Date().toISOString(),
        created_by_name: JSON.parse(localStorage.getItem('user') || '{}').name || 'Current User'
      };
      setTimeline(prev => [newTimelineItem, ...prev]);
      
      toast.success('Event added successfully (local simulation)');
      setShowAddEvent(false);
      setNewEvent({ event_type: "updated", description: "" });
    } finally {
      setIsSubmittingEvent(false);
    }
  };
  

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading risk details...</p>
        </div>
      </div>
    );
  }

  if (!risk) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-black mb-4">Risk not found</h2>
          <button
            onClick={() => navigate("/risk-register")}
            className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
          >
            Back to Risk Register
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
          onClick={() => navigate("/risk-register")}
          className="flex items-center gap-2 text-black hover:text-gray-600 transition-colors mb-6 underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Risk Register
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl font-semibold text-black">{risk.title || risk.description || 'Risk Details'}</h1>
            <span
              className={`px-3 py-1 ${
                risk.severity === "High" || risk.severity === "Critical"
                  ? "bg-black text-white"
                  : risk.severity === "Medium"
                  ? "border-2 border-black"
                  : "bg-gray-200"
              }`}
            >
              {risk.severity.charAt(0).toUpperCase() + risk.severity.slice(1)} Severity
            </span>
            <span className="px-3 py-1 border-2 border-black">
              {risk.status.charAt(0).toUpperCase() + risk.status.slice(1).replace('_', ' ')}
            </span>
            {!(risk.escalated || risk.status.toLowerCase() === 'escalated') && (
              <span className="px-3 py-1 bg-black text-white">
                Escalated
              </span>
            )}
            {!(risk.escalated || ['escalated', 'closed', 'resolved'].includes(risk.status.toLowerCase())) && 
              ['REGISTERED_MANAGER', 'TEAM_LEADER'].includes(userRole) && (
              <button
                onClick={handleEscalate}
                disabled={isEscalating}
                className="px-4 py-1 bg-white border-2 border-black hover:bg-gray-100 transition-colors text-sm font-semibold"
              >
                {isEscalating ? 'Escalating...' : 'Escalate Risk'}
              </button>
            )}
          </div>
          <p className="text-gray-600">
            {risk.house_name} • Reported {risk.created_at ? new Date(risk.created_at).toLocaleDateString('en-GB') : 'N/A'} by {risk.created_by_name || 'Unknown'}
          </p>
        </div>

        <div className="space-y-6">
          {/* Description */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-3 text-black">Description</h2>
            <p className="text-black">{risk.title || risk.description}</p>
            {risk.description !== risk.title && (
              <p className="text-black mt-2">{risk.description}</p>
            )}
          </div>

          {/* Impact & Mitigation */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-3 text-black">Impact</h2>
              <p className="text-black">{risk.metadata?.impact || 'No impact assessment available'}</p>
            </div>
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-xl font-semibold mb-3 text-black">Mitigation Plan</h2>
              <p className="text-black">{risk.metadata?.mitigation || 'No mitigation plan available'}</p>
            </div>
          </div>

          {/* Root Cause */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-3 text-black">Root Cause Analysis</h2>
            <p className="text-black">{risk.metadata?.rootCause || 'No root cause analysis available'}</p>
          </div>

          {/* Actions */}
          <div className="bg-white border-2 border-black p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black">Actions Taken</h2>
              <button
                onClick={() => setShowAddAction(true)}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Action
              </button>
            </div>
            <div className="space-y-3">
              {actions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No actions recorded yet
                </div>
              ) : (
                actions.map((action, idx) => (
                  <div
                    key={action.id || idx}
                    className={`p-4 ${idx % 2 === 0 ? "bg-gray-100" : "bg-white"} border border-gray-300`}
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-black flex-1">{action.description}</p>
                      <div className="ml-4 text-right">
                        <span
                          className={`inline-block px-2 py-1 text-xs ${
                            action.status === "Complete"
                              ? "bg-black text-white"
                              : action.status === "In Progress"
                              ? "border border-black"
                              : action.status === "Ongoing"
                              ? "bg-gray-200"
                              : "border border-gray-300 text-gray-400"
                          }`}
                        >
                          {action.status}
                        </span>
                        {action.created_at && (
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(action.created_at).toLocaleDateString('en-GB')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white border-2 border-black p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-black">Timeline</h2>
              <button
                onClick={() => setShowAddEvent(true)}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
            </div>
            <div className="space-y-4">
              {timeline.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No timeline events available
                </div>
              ) : (
                timeline.map((entry, idx) => (
                  <div key={entry.id || idx} className="flex gap-4">
                    <div className="relative">
                      <div className="w-3 h-3 bg-black mt-1.5" />
                      {idx < timeline.length - 1 && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <p className="text-sm text-gray-600">
                        {entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB') : 'N/A'}
                      </p>
                      <p className="text-black">{entry.description}</p>
                      <p className="text-sm text-gray-600">{entry.created_by_name || 'Unknown'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Risk Details */}
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold mb-4 text-black">Risk Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Category</p>
                <p className="text-black">{risk.category_name || 'General'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Review Due Date</p>
                <p className="text-black">
                  {risk.review_due_date ? new Date(risk.review_due_date).toLocaleDateString('en-GB') : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Last Updated</p>
                <p className="text-black">
                  {risk.updated_at ? new Date(risk.updated_at).toLocaleDateString('en-GB') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Source</p>
                <p className="text-black">{risk.metadata?.source || 'Manual'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add Action Modal */}
      {showAddAction && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white border-2 border-black p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-black">Add New Action</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-black font-medium">Action Description</label>
                <textarea
                  value={newAction.action}
                  onChange={(e) => setNewAction({...newAction, action: e.target.value})}
                  className="w-full h-20 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                  placeholder="Describe the action to be taken..."
                />
              </div>
              
              <div>
                <label className="block mb-2 text-black font-medium">Status</label>
                <select
                  value={newAction.status}
                  onChange={(e) => setNewAction({...newAction, status: e.target.value as any})}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Complete">Complete</option>
                  <option value="Ongoing">Ongoing</option>
                </select>
              </div>
              
              <div>
                <label className="block mb-2 text-black font-medium">Date of Action</label>
                <input
                  type="date"
                  value={newAction.date}
                  onChange={(e) => setNewAction({...newAction, date: e.target.value})}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddAction(false);
                  setNewAction({ action: "", status: "Pending", date: "" });
                }}
                className="px-4 py-2 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAction}
                disabled={isSubmitting}
                className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddEvent && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white border-2 border-black p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4 text-black">Add Timeline Event</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-black font-medium">Event Type</label>
                <select
                  value={newEvent.event_type}
                  onChange={(e) => setNewEvent({...newEvent, event_type: e.target.value as any})}
                  className="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black"
                >
                  <option value="updated">Updated</option>
                  <option value="review">Review</option>
                  <option value="escalation">Escalation</option>
                  <option value="mitigation">Mitigation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-black font-medium">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  className="w-full h-24 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-2 focus:ring-black text-black resize-none"
                  placeholder="Describe what happened..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddEvent(false);
                  setNewEvent({ event_type: "updated", description: "" });
                }}
                className="px-4 py-2 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                disabled={isSubmittingEvent}
                className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {isSubmittingEvent ? 'Adding...' : 'Add Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

