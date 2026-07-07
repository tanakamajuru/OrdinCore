import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, Plus, TrendingUp, TrendingDown, ArrowRightCircle } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
import { ActionCompletionModal } from "@/components/ActionCompletionModal";


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
  trajectory: string;
  source_cluster_name?: string;
  source_cluster_id?: string;
  risk_score: number;
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
  title: string;
  description: string;
  status: string;
  created_at: string;
  created_by: string;
  created_by_name: string;
  verified_by_rm?: string;
  verified_by_rm_name?: string;
  verified_at_rm?: string;
  verified_by_ri?: string;
  verified_by_ri_name?: string;
  verified_at_ri?: string;
  verification_notes?: string;
  effectiveness?: string;
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
  const userRole = (localStorage.getItem('userRole') || '').toUpperCase().replace(/-/g, '_');
  
  const [showAddAction, setShowAddAction] = useState(false);
  const [risk, setRisk] = useState<RiskDetail | null>(null);
  const [editField, setEditField] = useState<null | 'impact' | 'mitigation' | 'rootCause'>(null);
  const [editValue, setEditValue] = useState("");
  const [savingAssessment, setSavingAssessment] = useState(false);
  const [actions, setActions] = useState<Action[]>([]);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAction, setNewAction] = useState({
    title: "",
    action: "",
    status: "Pending" as "Pending" | "In Progress" | "Complete" | "Ongoing",
    date: "",
    assigned_to: ""
  });
  const [teamLeaders, setTeamLeaders] = useState<{ id: string; first_name: string; last_name: string; role: string }[]>([]);
  const [actionTemplates, setActionTemplates] = useState<{ id: string; title: string; description: string; domain_name: string | null }[]>([]);
  
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    event_type: "updated",
    description: ""
  });
  const [isEscalating, setIsEscalating] = useState(false);
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeVerdict, setCloseVerdict] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const [escalationReason, setEscalationReason] = useState("");
  const [showVerifyAction, setShowVerifyAction] = useState<string | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  const [showEffectivenessAction, setShowEffectivenessAction] = useState<string | null>(null);
  const [effectivenessRating, setEffectivenessRating] = useState<"Effective" | "Ineffective">("Effective");
  const [isRating, setIsRating] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState<{ id: string; title: string } | null>(null);


  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;

  const handleEscalate = async () => {
    if (!id || !escalationReason) return;
    setIsEscalating(true);
    try {
      await apiClient.post(`/risks/${id}/escalate`, {
        reason: escalationReason
      });
      toast.success('Risk escalated successfully');
      setShowEscalateModal(false);
      setEscalationReason("");
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

  useEffect(() => {
    const loadTeamLeaders = async () => {
      try {
        const res = await apiClient.get('/users?role=TEAM_LEADER&limit=100');
        const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setTeamLeaders(list);
      } catch (err) {
        console.error('Failed to load team leaders for assignment', err);
      }
    };
    loadTeamLeaders();
    // Load reusable action templates (admin-configured) for the picker.
    apiClient.get('/governance-config/action-templates')
      .then((res) => setActionTemplates(res.data?.data || []))
      .catch(() => setActionTemplates([]));
  }, []);

  const openAssessmentEdit = (field: 'impact' | 'mitigation' | 'rootCause') => {
    setEditField(field);
    setEditValue((risk?.metadata?.[field]) || "");
  };

  const saveAssessment = async () => {
    if (!risk || !editField) return;
    setSavingAssessment(true);
    try {
      const res = await apiClient.patch(`/risks/${risk.id}/assessment`, { [editField]: editValue.trim() });
      const updated = (res.data as any).data || (res.data as any);
      setRisk(prev => prev ? { ...prev, metadata: { ...(prev.metadata || {}), ...(updated?.metadata || { [editField]: editValue.trim() }) } } : prev);
      toast.success("Assessment updated");
      setEditField(null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update assessment");
    } finally {
      setSavingAssessment(false);
    }
  };

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

  const handleCloseRisk = async () => {
    if (!id) return;
    if (!closeVerdict) { toast.error("Choose a resolution verdict."); return; }
    if (closeReason.trim().length < 20) { toast.error("A closure rationale of at least 20 characters is required."); return; }
    setIsClosing(true);
    try {
      await apiClient.post(`/risks/${id}/close`, { verdict: closeVerdict, reason: closeReason.trim() });
      toast.success("Risk closed with a resolution verdict. Recurrence monitoring started (60 days).");
      setShowCloseModal(false); setCloseVerdict(""); setCloseReason("");
      loadRiskDetails(id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to close risk");
    } finally { setIsClosing(false); }
  };

  const [searchParams] = useSearchParams();
  // Deep-link deep-scroll: a /risk-register/:id?section=… link (or the /risks/:id redirect)
  // lands on the right sub-section instead of the top of the record (Migration-Map Phase 2).
  useEffect(() => {
    const section = searchParams.get("section");
    if (!risk || !section) return;
    const map: Record<string, string> = { actions: "rd-actions", effectiveness: "rd-actions", origin: "rd-origin", reviews: "rd-reviews", escalations: "rd-reviews" };
    const el = document.getElementById(map[section] || `rd-${section}`);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [risk, searchParams]);

  const reassignAction = async (actionId: string, assigned_to: string) => {
    if (!assigned_to || !id) return;
    try {
      await apiClient.patch(`/risks/${id}/actions/${actionId}/assignee`, { assigned_to });
      toast.success("Action reassigned — the Team Leader has been notified.");
      loadRiskDetails(id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to reassign action");
    }
  };

  const handleAddAction = async () => {
    if (!newAction.title) {
      toast.error('Please enter an action title');
      return;
    }
    if (!newAction.action) {
      toast.error('Please enter an action description');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await apiClient.post(`/risks/${id}/action`, {
        title: newAction.title,
        description: newAction.action,
        status: newAction.status,
        assigned_to: newAction.assigned_to || undefined,
        due_date: newAction.date || new Date().toISOString().split('T')[0],
        action_date: newAction.date || new Date().toISOString().split('T')[0]
      });
      
      toast.success('Action added successfully');
      setShowAddAction(false);
      setNewAction({ title: "", action: "", status: "Pending", date: "", assigned_to: "" });
      
      if (id) {
        loadRiskDetails(id);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add action');
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
      toast.error(error.response?.data?.message || 'Failed to add event');
    } finally {
      setIsSubmittingEvent(false);
    }
  };

  const handleUpdateActionStatus = async (actionId: string, newStatus: string) => {
    try {
      await apiClient.patch(`/risks/${id}/actions/${actionId}/status`, { status: newStatus });
      toast.success(`Action marked as ${newStatus}`);
      if (id) loadRiskDetails(id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update action status');
    }
  };

  const handleVerifyAction = async () => {
    if (!showVerifyAction) return;
    setIsVerifying(true);
    try {
      await apiClient.post(`/risks/${id}/actions/${showVerifyAction}/verify`, { 
        notes: verificationNotes 
      });
      toast.success('Action verified successfully');
      setShowVerifyAction(null);
      setVerificationNotes("");
      if (id) loadRiskDetails(id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to verify action');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRateEffectiveness = async () => {
    if (!showEffectivenessAction) return;
    setIsRating(true);
    try {
      await apiClient.post(`/risks/${id}/actions/${showEffectivenessAction}/effectiveness`, { 
        effectiveness: effectivenessRating 
      });
      toast.success('Effectiveness rated successfully');
      setShowEffectivenessAction(null);
      if (id) loadRiskDetails(id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to rate effectiveness');
    } finally {
      setIsRating(false);
    }
  };
  

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading risk details...</p>
        </div>
      </div>
    );
  }

  if (!risk) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl  text-foreground mb-4">Risk not found</h2>
          <button
            onClick={() => navigate("/risk-register")}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-[#008394] transition-colors"
          >
            Back to Oversight Register
          </button>
        </div>
      </div>
    );
  }

  const canEditAssessment = !['closed', 'resolved'].includes((risk.status || '').toLowerCase());
  const assessmentCard = (field: 'impact' | 'mitigation' | 'rootCause', title: string, placeholder: string) => {
    const value = risk.metadata?.[field];
    const isEditing = editField === field;
    return (
      <div className="bg-card border-2 border-border p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl text-foreground">{title}</h2>
          {canEditAssessment && !isEditing && (
            <button onClick={() => openAssessmentEdit(field)} className="text-sm text-primary flex items-center gap-1 hover:underline">
              <Plus className="w-3.5 h-3.5" /> {value ? 'Edit' : 'Add'}
            </button>
          )}
        </div>
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              className="w-full h-28 bg-input-background border-2 border-border rounded p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditField(null)} className="px-3 py-1.5 text-sm border border-border rounded hover:bg-muted">Cancel</button>
              <button onClick={saveAssessment} disabled={savingAssessment} className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50">
                {savingAssessment ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <p className={value ? 'text-foreground whitespace-pre-wrap' : 'text-muted-foreground italic'}>{value || 'Not yet assessed'}</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <button
          onClick={() => navigate("/risk-register")}
          className="flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors mb-6 underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Oversight Register
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-3xl  text-foreground  uppercase tracking-tighter">{risk.title}</h1>
            <span
              className={`px-3 py-1  ${
                risk.severity === "High" || risk.severity === "Critical"
                  ? "bg-destructive text-primary-foreground"
                  : "border-2 border-primary"
              }`}
            >
              {risk.severity}
            </span>
            <div className="flex items-center gap-2 px-3 py-1 border-2 border-border " title={(risk as any).trajectory_v2?.basis || ''}>
                 {((risk as any).trajectory_v2?.direction || risk.trajectory) === 'Improving' ? <TrendingUp className="text-success" /> :
                  ['Deteriorating', 'Critical'].includes((risk as any).trajectory_v2?.direction || risk.trajectory) ? <TrendingDown className="text-destructive animate-pulse" /> :
                  <ArrowRightCircle className="text-muted-foreground" />}
                 {(risk as any).trajectory_v2?.direction || risk.trajectory}
            </div>
            <span className="px-3 py-1 bg-primary text-primary-foreground ">
              SCORE: {risk.risk_score}
            </span>
            {risk.status?.toLowerCase() === 'escalated' && (
              <span className="px-3 py-1 bg-destructive text-primary-foreground">
                ESCALATED
              </span>
            )}
            {['REGISTERED_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole) && risk.status?.toLowerCase() !== 'escalated' && (
              <button
                onClick={() => setShowEscalateModal(true)}
                className="px-3 py-1 bg-destructive text-primary-foreground hover:bg-destructive/80 transition-colors uppercase font-medium"
              >
                Escalate
              </button>
            )}
            {['REGISTERED_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole) && !['closed', 'resolved'].includes((risk.status || '').toLowerCase()) && (
              <button
                onClick={() => setShowCloseModal(true)}
                className="px-3 py-1 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors uppercase font-medium"
              >
                Close Risk
              </button>
            )}
          </div>
          <p className="text-muted-foreground  uppercase tracking-widest text-sm">
            {risk.house_name} • Registered {new Date(risk.created_at).toLocaleDateString()} by {risk.created_by_name}
          </p>
          {(risk as any).trajectory_v2?.basis && (
            <p className="text-xs text-muted-foreground mt-1 normal-case tracking-normal">Trajectory basis — {(risk as any).trajectory_v2.basis}</p>
          )}
        </div>

        <div className="space-y-6">
          {/* Description & Evidence */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card border-2 border-border p-6 shadow-sm">
                <h2 className="text-xs  uppercase text-muted-foreground mb-4 tracking-widest">Governance Description</h2>
                <p className="text-lg  leading-relaxed">{risk.description}</p>
            </div>
            <div className="bg-primary/5 border-2 border-primary/20 p-6 shadow-sm">
                <h2 id="rd-origin" className="text-xs  uppercase text-primary mb-4 tracking-widest">Evidence Trail</h2>
                {risk.source_cluster_id ? (
                    <div className="space-y-4">
                        <div className=" text-primary">Source Cluster: {risk.source_cluster_name}</div>
                        <p className="text-sm text-muted-foreground ">"Evidence promoted from Signal Cluster via RM Decision Protocol."</p>
                        <button onClick={() => navigate(`/patterns`)} className="text-xs  uppercase text-primary underline underline-offset-4">
                            View Source Pattern
                        </button>
                    </div>
                ) : (
                    <div className="text-muted-foreground  text-sm">
                        Manual entry risk – No automated pattern link available.
                    </div>
                )}
            </div>
          </div>

          {/* Impact & Mitigation — editable (CQC analysis fields) */}
          <div className="grid grid-cols-2 gap-6">
            {assessmentCard('impact', 'Impact', 'What could happen if this risk is not controlled?')}
            {assessmentCard('mitigation', 'Mitigation Plan', 'What are you doing to control it?')}
          </div>

          {/* Root Cause — editable */}
          {assessmentCard('rootCause', 'Root Cause Analysis', 'Why did this arise? Underlying/contributing factors.')}

          {/* Actions */}
          <div className="bg-card border-2 border-border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 id="rd-actions" className="text-xl  text-foreground">Controls &amp; Effectiveness</h2>
              <button
                onClick={() => setShowAddAction(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-[#008394] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Action
              </button>
            </div>
            <div className="space-y-3">
              {actions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No actions recorded yet
                </div>
              ) : (
                actions.map((action, idx) => (
                  <div
                    key={action.id || idx}
                    className={`p-4 ${idx % 2 === 0 ? "bg-muted" : "bg-card"} border-b-2 border-border`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <p className=" text-lg">{action.title || action.description}</p>
                            <span
                            className={`inline-block px-2 py-0.5 text-[10px]  uppercase tracking-widest ${
                                action.status === "Complete" || action.status === "Completed"
                                ? "bg-primary text-primary-foreground"
                                : "border-2 border-border"
                            }`}
                            >
                            {action.status}
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{action.description}</p>
                        
                        <div className="flex flex-wrap gap-2">
                            {action.verified_by_rm && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-primary text-primary-foreground text-xs  uppercase ">
                                    RM VERIFIED
                                </div>
                            )}
                            {action.verified_by_ri && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-destructive text-primary-foreground text-xs  uppercase  ">
                                    RI VERIFIED
                                </div>
                            )}
                            {action.effectiveness && (
                                <div className={`flex items-center gap-1.5 px-2 py-1 text-xs  uppercase   ${action.effectiveness === 'Effective' ? 'bg-success text-primary-foreground' : 'bg-destructive text-primary-foreground'}`}>
                                    {action.effectiveness}
                                </div>
                            )}
                        </div>
                      </div>

                      <div className="ml-4 text-right flex flex-col items-end gap-2">
                        <p className="text-[10px]  uppercase text-muted-foreground">
                            {new Date(action.created_at).toLocaleDateString('en-GB')}
                        </p>
                        
                        <div className="flex gap-2">
                            {(action.status !== 'Complete' && action.status !== 'Completed') && (
                                <button 
                                    onClick={() => setShowCompletionModal({ id: action.id, title: action.title || action.description })}
                                    className="text-[10px]  uppercase underline hover:text-primary transition-colors"
                                >
                                    Complete Action
                                </button>
                            )}

                            {/* Reassign an open action to a different Team Leader (RM/Admin) — Finding F */}
                            {['REGISTERED_MANAGER', 'ADMIN', 'SUPER_ADMIN'].includes(userRole) && action.status !== 'Complete' && action.status !== 'Completed' && teamLeaders.length > 0 && (
                                <select
                                    value=""
                                    onChange={(e) => reassignAction(action.id, e.target.value)}
                                    title="Reassign to a Team Leader"
                                    className="text-[10px] uppercase border-2 border-border bg-card px-1 py-1"
                                >
                                    <option value="">Reassign…</option>
                                    {teamLeaders.map((tl) => <option key={tl.id} value={tl.id}>{tl.first_name} {tl.last_name}</option>)}
                                </select>
                            )}

                            {/* Verification Button: RM/RI only + Four Eyes */}
                            {(['REGISTERED_MANAGER', 'DIRECTOR', 'ADMIN', 'SUPER_ADMIN'].includes(userRole) && 
                              action.created_by !== currentUserId && 
                              !((userRole === 'REGISTERED_MANAGER' && action.verified_by_rm) || (['DIRECTOR', 'ADMIN', 'SUPER_ADMIN'].includes(userRole) && action.verified_by_ri))) && (
                                <button 
                                    onClick={() => setShowVerifyAction(action.id)}
                                    className="text-[10px]  uppercase bg-primary text-primary-foreground px-2 py-1 hover:bg-primary transition-all"
                                >
                                    Verify Action
                                </button>
                            )}

                            {(action.status === 'Complete' || action.status === 'Completed') && !action.effectiveness && ['REGISTERED_MANAGER', 'DIRECTOR', 'SUPER_ADMIN'].includes(userRole) && (
                                <button 
                                    onClick={() => setShowEffectivenessAction(action.id)}
                                    className="text-[10px]  uppercase bg-primary text-primary-foreground px-2 py-1 hover:bg-primary transition-all"
                                >
                                    Rate Effectiveness
                                </button>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-card border-2 border-border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 id="rd-reviews" className="text-xl  text-foreground">Leadership Decision Log</h2>
              <button
                onClick={() => setShowAddEvent(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-[#008394] transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
            </div>
            <div className="space-y-4">
              {timeline.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No timeline events available
                </div>
              ) : (
                timeline.map((entry, idx) => (
                  <div key={entry.id || idx} className="flex gap-4">
                    <div className="relative">
                      <div className="w-3 h-3 bg-primary mt-1.5" />
                      {idx < timeline.length - 1 && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <p className="text-sm text-muted-foreground">
                        {entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-GB') : 'N/A'}
                      </p>
                      <p className="text-foreground">{entry.description}</p>
                      <p className="text-sm text-muted-foreground">{entry.created_by_name || 'Unknown'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Risk Details */}
          <div className="bg-card border-2 border-border p-6">
            <h2 className="text-xl  mb-4 text-foreground">Risk Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Category</p>
                <p className="text-foreground">{risk.category_name || 'General'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Review Due Date</p>
                <p className="text-foreground">
                  {risk.review_due_date ? new Date(risk.review_due_date).toLocaleDateString('en-GB') : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
                <p className="text-foreground">
                  {risk.updated_at ? new Date(risk.updated_at).toLocaleDateString('en-GB') : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Source</p>
                <p className="text-foreground">{risk.metadata?.source || 'Manual'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add Action Modal */}
      {showAddAction && (
        <div className="fixed inset-0 backdrop-blur-md bg-primary/30 flex items-center justify-center z-50">
          <div className="bg-card border-2 border-border p-6 w-full max-w-md">
            <h2 className="text-xl  mb-4 text-foreground">Add New Action</h2>
            
            <div className="space-y-4">
              {actionTemplates.length > 0 && (
                <div>
                  <label className="block mb-2 text-foreground">Start from a template <span className="text-muted-foreground text-sm">(optional)</span></label>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const t = actionTemplates.find((x) => x.id === e.target.value);
                      if (t) setNewAction({ ...newAction, title: t.title, action: t.description || newAction.action });
                    }}
                    className="w-full px-4 py-2 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  >
                    <option value="">— Choose an action template —</option>
                    {actionTemplates.map((t) => <option key={t.id} value={t.id}>{t.domain_name ? `[${t.domain_name}] ` : ""}{t.title}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block mb-2 text-foreground ">Action Title</label>
                <input
                  type="text"
                  value={newAction.title}
                  onChange={(e) => setNewAction({...newAction, title: e.target.value})}
                  className="w-full px-4 py-2 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                  placeholder="e.g. Update Care Plan"
                />
              </div>

              <div>
                <label className="block mb-2 text-foreground ">Action Description</label>
                <textarea
                  value={newAction.action}
                  onChange={(e) => setNewAction({...newAction, action: e.target.value})}
                  className="w-full h-20 px-4 py-3 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                  placeholder="Describe the action to be taken..."
                />
              </div>
              
              <div>
                <label className="block mb-2 text-foreground ">Assign To</label>
                <select
                  value={newAction.assigned_to}
                  onChange={(e) => setNewAction({...newAction, assigned_to: e.target.value})}
                  className="w-full px-4 py-2 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="">Auto-assign to service Team Leader</option>
                  {teamLeaders.map((tl) => (
                    <option key={tl.id} value={tl.id}>
                      {tl.first_name} {tl.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-2 text-foreground ">Status</label>
                <select
                  value={newAction.status}
                  onChange={(e) => setNewAction({...newAction, status: e.target.value as any})}
                  className="w-full px-4 py-2 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Complete">Complete</option>
                  <option value="Ongoing">Ongoing</option>
                </select>
              </div>
              
              <div>
                <label className="block mb-2 text-foreground ">Date of Action</label>
                <input
                  type="date"
                  value={newAction.date}
                  onChange={(e) => setNewAction({...newAction, date: e.target.value})}
                  className="w-full px-4 py-2 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddAction(false);
                  setNewAction({ title: "", action: "", status: "Pending", date: "", assigned_to: "" });
                }}
                className="px-4 py-2 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAction}
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-[#008394] transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Action'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAddEvent && (
        <div className="fixed inset-0 backdrop-blur-md bg-primary/30 flex items-center justify-center z-50">
          <div className="bg-card border-2 border-border p-6 w-full max-w-md">
            <h2 className="text-xl  mb-4 text-foreground">Add Timeline Event</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-foreground ">Event Type</label>
                <select
                  value={newEvent.event_type}
                  onChange={(e) => setNewEvent({...newEvent, event_type: e.target.value as any})}
                  className="w-full px-4 py-2 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="updated">Updated</option>
                  <option value="review">Review</option>
                  <option value="escalation">Escalation</option>
                  <option value="mitigation">Mitigation</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 text-foreground ">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  className="w-full h-24 px-4 py-3 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
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
                className="px-4 py-2 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                disabled={isSubmittingEvent}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-[#008394] transition-colors disabled:opacity-50"
              >
                {isSubmittingEvent ? 'Adding...' : 'Add Event'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Verification Modal */}
      {showVerifyAction && (
        <div className="fixed inset-0 backdrop-blur-md bg-primary/30 flex items-center justify-center z-50">
          <div className="bg-card border-2 border-border p-8 w-full max-w-lg ">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary flex items-center justify-center text-primary-foreground  text-2xl">V</div>
                <div>
                    <h2 className="text-2xl  uppercase  tracking-tighter">Independent Verification</h2>
                    <p className="text-xs  text-muted-foreground uppercase tracking-widest leading-none">Four-Eyes Governance Protocol</p>
                </div>
            </div>
            
            <p className="text-sm  mb-6 p-4 border-l-4 border-primary bg-primary/5">
                I confirm that I have reviewed the evidence for this action and verified it has been implemented correctly in accordance with company policy.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px]  uppercase text-muted-foreground mb-1 tracking-widest">Verification Notes</label>
                <textarea
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  className="w-full h-32 px-4 py-3 bg-card border-2 border-border focus:outline-none focus:ring-0 text-lg  resize-none"
                  placeholder="Summarize the verification evidence..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => {
                  setShowVerifyAction(null);
                  setVerificationNotes("");
                }}
                className="px-6 py-2 bg-card text-foreground  uppercase tracking-widest border-2 border-border hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyAction}
                disabled={isVerifying || !verificationNotes}
                className="px-6 py-2 bg-primary text-primary-foreground  uppercase tracking-widest hover:bg-primary transition-all disabled:opacity-50"
              >
                {isVerifying ? 'Signing Off...' : 'Confirm Sign-Off'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Effectiveness Modal */}
      {showEffectivenessAction && (
        <div className="fixed inset-0 backdrop-blur-md bg-primary/30 flex items-center justify-center z-50">
          <div className="bg-card border-2 border-border p-8 w-full max-w-lg ">
            <h2 className="text-2xl  uppercase  tracking-tighter mb-4">Rate Effectiveness</h2>
            <p className="text-sm  mb-6">
                Did this action effectively mitigate the risk or prevent recurrence?
            </p>

            <div className="flex gap-4 mb-8">
                <button
                    onClick={() => setEffectivenessRating('Effective')}
                    className={`flex-1 py-3  uppercase tracking-widest border-2 transition-all ${
                        effectivenessRating === 'Effective' ? 'bg-success text-primary-foreground border-success' : 'bg-card text-foreground border-border hover:bg-muted'
                    }`}
                >
                    Effective
                </button>
                <button
                    onClick={() => setEffectivenessRating('Ineffective')}
                    className={`flex-1 py-3  uppercase tracking-widest border-2 transition-all ${
                        effectivenessRating === 'Ineffective' ? 'bg-destructive text-primary-foreground border-destructive' : 'bg-card text-foreground border-border hover:bg-muted'
                    }`}
                >
                    Ineffective
                </button>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEffectivenessAction(null)}
                className="px-6 py-2 bg-card text-foreground  uppercase tracking-widest border-2 border-border hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRateEffectiveness}
                disabled={isRating}
                className="px-6 py-2 bg-primary text-primary-foreground  uppercase tracking-widest hover:bg-primary transition-all disabled:opacity-50"
              >
                {isRating ? 'Saving...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showCompletionModal && (
        <ActionCompletionModal
          actionId={showCompletionModal.id}
          actionTitle={showCompletionModal.title}
          onClose={() => setShowCompletionModal(null)}
          onSuccess={() => id && loadRiskDetails(id)}
        />
      )}

      {/* Escalate Modal */}
      {showEscalateModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-primary/30 flex items-center justify-center z-50">
          <div className="bg-card border-2 border-border p-6 w-full max-w-md">
            <h2 className="text-xl mb-4 text-foreground font-semibold">Escalate Risk</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-foreground">Escalation Reason</label>
                <textarea
                  name="reason"
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  className="w-full h-24 px-4 py-3 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                  placeholder="Summarize the reason for escalation..."
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEscalateModal(false);
                  setEscalationReason("");
                }}
                className="px-4 py-2 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEscalate}
                disabled={isEscalating || !escalationReason}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-[#008394] transition-colors disabled:opacity-50"
              >
                {isEscalating ? 'Escalating...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloseModal && (
        <div className="fixed inset-0 backdrop-blur-md bg-primary/30 flex items-center justify-center z-50">
          <div className="bg-card border-2 border-border p-6 w-full max-w-md">
            <h2 className="text-xl mb-1 text-foreground font-semibold">Close Risk</h2>
            <p className="text-xs text-muted-foreground mb-4">Closing requires a resolution verdict. A 60-day recurrence window opens automatically — if the theme returns, the risk re-surfaces.</p>
            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-foreground text-sm">Resolution verdict</label>
                <select
                  value={closeVerdict}
                  onChange={(e) => setCloseVerdict(e.target.value)}
                  className="w-full px-3 py-2 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                >
                  <option value="">Choose a verdict…</option>
                  <option value="Resolved — controls effective">Resolved — controls effective</option>
                  <option value="Resolved — no longer applicable">Resolved — no longer applicable</option>
                  <option value="Tolerated — risk accepted">Tolerated — risk accepted</option>
                </select>
                {closeVerdict === "Resolved — controls effective" && (
                  <p className="text-[11px] text-amber-600 mt-1">Allowed only if a control on this risk has been rated Effective.</p>
                )}
              </div>
              <div>
                <label className="block mb-2 text-foreground text-sm">Rationale <span className="text-muted-foreground">(min 20 characters)</span></label>
                <textarea
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  className="w-full h-24 px-4 py-3 bg-card border-2 border-border focus:outline-none focus:ring-2 focus:ring-ring text-foreground resize-none"
                  placeholder="Why is this risk being closed, and how do you know it is resolved?"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowCloseModal(false); setCloseVerdict(""); setCloseReason(""); }}
                className="px-4 py-2 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseRisk}
                disabled={isClosing || !closeVerdict || closeReason.trim().length < 20}
                className="px-4 py-2 bg-success text-primary-foreground hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {isClosing ? 'Closing…' : 'Close with verdict'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}

