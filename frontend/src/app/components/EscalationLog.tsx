import { useState, useEffect, useRef } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { AlertCircle, CheckCircle2, Clock, MapPin, ChevronRight, MessageSquare, ShieldAlert, User, Activity } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import { ClosureReviewModal } from "@/components/ClosureReviewModal";

interface Escalation {
  id: string;
  risk_id: string;
  risk_title: string;
  risk_description: string;
  house_id: string;
  house_name: string;
  reason: string;
  status: 'pending' | 'acknowledged' | 'in_progress' | 'resolved' | 'closed';
  priority: 'medium' | 'high' | 'urgent' | 'critical';
  escalated_by_name: string;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  resolution_notes?: string;
  // Originating signal — the evidence behind the escalation (joined from governance_pulses).
  observation?: string;
  signal_immediate_action?: string;
  signal_severity?: string;
  signal_related_person?: string;
  signal_risk_domain?: string[] | string;
  signal_type?: string;
  signal_logged_at?: string;
}

// risk_domain is TEXT[] — render the first element, never the raw {…}.
const firstDomain = (d?: string[] | string): string => {
  if (Array.isArray(d)) return d[0] || "";
  if (typeof d === "string") return d.replace(/[{}]/g, "").split(",")[0] || "";
  return "";
};

export function EscalationLog() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closeTarget, setCloseTarget] = useState<{ id: string; title?: string } | null>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [noteFlash, setNoteFlash] = useState(false);

  // Turn a dead-click on a gated action into guidance: focus the notes field and flash it.
  const requireNote = (): boolean => {
    if (resolutionNotes.trim()) return true;
    notesRef.current?.focus();
    setNoteFlash(true);
    setTimeout(() => setNoteFlash(false), 1200);
    toast.info('Add a note to record why — then you can resolve or keep monitoring.');
    return false;
  };

  useEffect(() => {
    loadEscalations();
  }, []);

  const loadEscalations = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/escalations?limit=100');
      const payload = (res.data as any).data || (res.data as any) || [];
      const list = Array.isArray(payload) ? payload : (payload.escalations || payload.items || []);
      setEscalations(list);
    } catch (err) {
      console.error('Failed to load escalations', err);
      toast.error('Failed to load escalation log');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await apiClient.post(`/escalations/${id}/acknowledge`);
      toast.success('Escalation acknowledged');
      loadEscalations();
    } catch (err) {
      toast.error('Failed to acknowledge escalation');
    }
  };

  const handleResolve = async () => {
    if (!selectedEscalation || !resolutionNotes) {
      toast.error('Please provide resolution notes');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post(`/escalations/${selectedEscalation.id}/resolve`, {
        resolution_notes: resolutionNotes
      });
      toast.success('Escalation resolved');
      setSelectedEscalation(null);
      setResolutionNotes("");
      loadEscalations();
    } catch (err) {
      toast.error('Failed to resolve escalation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProgress = async () => {
    if (!selectedEscalation || !resolutionNotes) {
      toast.error('Please provide progress notes');
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post(`/escalations/${selectedEscalation.id}/actions`, {
        action_type: 'update',
        description: resolutionNotes
      });
      toast.success('Progress updated');
      setResolutionNotes("");
      loadEscalations();
    } catch (err) {
      toast.error('Failed to update progress');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalateFurther = async () => {
    if (!selectedEscalation) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.post(`/escalations/${selectedEscalation.id}/escalate-further`, { reason: resolutionNotes || undefined });
      toast.success((res.data as any)?.data?.message || 'Escalated to the next level');
      setResolutionNotes("");
      setSelectedEscalation(null);
      loadEscalations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to escalate further');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    const normalized = priority?.toLowerCase?.() || '';
    switch (normalized) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'urgent': return 'bg-destructive/80 text-destructive-foreground';
      case 'high': return 'bg-primary text-primary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    const normalized = status?.toLowerCase?.() || '';
    switch (normalized) {
      case 'resolved': return <CheckCircle2 className="w-5 h-5 text-success" />;
      case 'pending': return <Clock className="w-5 h-5 text-destructive" />;
      case 'acknowledged': return <AlertCircle className="w-5 h-5 text-primary" />;
      default: return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const handleSelectEscalation = async (esc: Escalation) => {
    try {
      const res = await apiClient.get(`/escalations/${esc.id}`);
      const payload = (res.data as any).data || (res.data as any) || null;
      setSelectedEscalation(payload || esc);
    } catch (err) {
      console.error('Failed to load escalation details', err);
      setSelectedEscalation(esc); // Fallback to list data
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full">
        <div className="mb-8">
          <h1 className="text-3xl  text-primary mb-2 flex items-center gap-3">
            <ShieldAlert className="w-8 h-8" />
            Escalation Management
          </h1>
          <p className="text-muted-foreground">Cross-site oversight of high-risk escalations requiring RI attention</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 [&>*]:min-w-0">
          {/* List Section */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-card border-2 border-border p-4 mb-4 flex justify-between items-center text-sm shadow-sm">
              <span className=" text-foreground">{escalations.filter(e => e.status?.toLowerCase?.() !== 'resolved').length} Pending Actions</span>
              <div className="flex gap-4">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-destructive"></div> Critical</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary"></div> High</span>
              </div>
            </div>

            {escalations.length > 0 ? escalations.map((esc) => (
              <Card 
                key={esc.id} 
                className={`border-2 border-border transition-all cursor-pointer hover:shadow-lg ${selectedEscalation?.id === esc.id ? 'ring-2 ring-primary bg-muted/30' : 'bg-card'}`}
                onClick={() => handleSelectEscalation(esc)}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs  uppercase ${getPriorityColor(esc.priority)}`}>
                        {esc.priority}
                      </span>
                      <span className="text-gray-400 text-xs">|</span>
                      <span className="text-xs  text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {esc.house_name}
                      </span>
                    </div>
                    {getStatusIcon(esc.status)}
                  </div>
                  
                  <h3 className="text-lg  text-primary mb-2">{esc.risk_title}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{esc.reason}</p>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-border">
                    <div className="text-xs text-muted-foreground">
                      Escalated by <span className=" text-primary">{esc.escalated_by_name}</span> • {new Date(esc.created_at).toLocaleDateString('en-GB')}
                    </div>
                    <ChevronRight className="w-4 h-4 text-primary" />
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-20 bg-muted/30 border-2 border-dashed border-border">
                <CheckCircle2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg  text-muted-foreground">All clear! No pending escalations.</h3>
              </div>
            )}
          </div>

          {/* Details & Actions Section */}
          <div className="lg:col-span-1">
            {selectedEscalation ? (
              <div className="sticky top-24 space-y-6">
                <Card className="border-2 border-border shadow-xl">
                  <CardHeader className="bg-primary text-primary-foreground">
                    <CardTitle className="text-lg">Escalation Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div>
                      <label className="text-xs  uppercase text-muted-foreground block mb-1">Risk Context</label>
                      <h4 className=" text-primary">{selectedEscalation.risk_title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{selectedEscalation.risk_description}</p>
                    </div>

                    <div>
                      <label className="text-xs  uppercase text-muted-foreground block mb-1">Escalation Reason</label>
                      <div className="bg-muted border-l-4 border-primary p-3 text-sm  text-foreground">
                        "{selectedEscalation.reason}"
                      </div>
                    </div>

                    {/* Originating signal — the decision-making evidence (observation,
                        severity, person, immediate action already taken). */}
                    {(selectedEscalation.observation || selectedEscalation.signal_severity) && (
                      <div className="border-2 border-border rounded-lg p-3 bg-background">
                        <label className="text-xs uppercase text-muted-foreground mb-2 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Originating signal</label>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {selectedEscalation.signal_severity && (
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                              ['High', 'Critical'].includes(selectedEscalation.signal_severity) ? 'bg-destructive/10 text-destructive' : 'bg-muted text-foreground'
                            }`}>{selectedEscalation.signal_severity}</span>
                          )}
                          {firstDomain(selectedEscalation.signal_risk_domain) && (
                            <span className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary">{firstDomain(selectedEscalation.signal_risk_domain)}</span>
                          )}
                          {selectedEscalation.signal_related_person && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> {selectedEscalation.signal_related_person}</span>
                          )}
                        </div>
                        {selectedEscalation.observation && (
                          <p className="text-sm text-foreground">{selectedEscalation.observation}</p>
                        )}
                        {selectedEscalation.signal_immediate_action && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Immediate action taken: </span>{selectedEscalation.signal_immediate_action}
                          </div>
                        )}
                        {selectedEscalation.signal_logged_at && (
                          <p className="text-[10px] text-muted-foreground mt-2">Logged {new Date(selectedEscalation.signal_logged_at).toLocaleString('en-GB')}</p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs  uppercase text-muted-foreground block mb-1">Site</label>
                        <p className="text-sm  text-foreground">{selectedEscalation.house_name}</p>
                      </div>
                      <div>
                        <label className="text-xs  uppercase text-muted-foreground block mb-1">Status</label>
                        <p className="text-sm  capitalize text-foreground">{selectedEscalation.status}</p>
                      </div>
                    </div>

                    {selectedEscalation.status?.toLowerCase?.() === 'pending' && (
                      <Button 
                        onClick={() => handleAcknowledge(selectedEscalation.id)}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Acknowledge Receipt
                      </Button>
                    )}

                    {selectedEscalation.status?.toLowerCase?.() !== 'resolved' && (
                      <div className="space-y-3 pt-4 border-t border-border">
                        <label className="text-xs uppercase text-muted-foreground flex items-center gap-1.5">
                          Decision &amp; notes {!resolutionNotes && <span className="text-amber-600 normal-case font-medium">· required</span>}
                        </label>
                        <textarea
                          ref={notesRef}
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          spellCheck
                          placeholder="Document your oversight, progress, or the reason for your decision..."
                          className={`w-full h-28 bg-input-background border-2 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none transition-colors ${
                            !resolutionNotes ? 'border-amber-400' : 'border-border'
                          } ${noteFlash ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}
                        />

                        {/* The three-way decision: keep monitoring · resolve · escalate further.
                            Gated actions stay clickable so a tap focuses the note field (guidance,
                            not a dead button) while still looking inactive until a note is present. */}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            onClick={() => { if (requireNote()) handleUpdateProgress(); }}
                            disabled={isSubmitting}
                            variant="outline"
                            title={!resolutionNotes ? "Add a note to enable" : "Keep this escalation open and log progress"}
                            className={`flex-1 border-border text-foreground hover:bg-muted ${!resolutionNotes ? 'opacity-60' : ''}`}
                          >
                            <Clock className="w-4 h-4 mr-1.5" /> Keep open · continue monitoring
                          </Button>
                          <Button
                            onClick={() => { if (requireNote()) handleResolve(); }}
                            disabled={isSubmitting}
                            title={!resolutionNotes ? "Add a note to enable" : "Mark this escalation resolved"}
                            className={`flex-1 bg-success text-success-foreground hover:bg-success/90 ${!resolutionNotes ? 'opacity-60' : ''}`}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1.5" /> Mark as Resolved
                          </Button>
                        </div>
                        {!resolutionNotes && (
                          <p className="text-xs text-amber-600">A note is required before you can resolve or keep this escalation open — it's the record of your decision.</p>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3">
                          <button
                            onClick={handleEscalateFurther}
                            disabled={isSubmitting}
                            title="Escalate up the accountability ladder (RM → Director → RI)"
                            className="flex-1 px-4 py-2 rounded-lg border-2 border-destructive/40 text-destructive hover:bg-destructive/5 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            <ShieldAlert className="w-4 h-4" /> Escalate further
                          </button>
                          <button
                            onClick={() => setCloseTarget({ id: selectedEscalation.id, title: selectedEscalation.risk_title || selectedEscalation.reason })}
                            className="flex-1 px-4 py-2 rounded-lg border-2 border-success/40 text-success hover:bg-success/5 text-sm flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Close with evidence
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedEscalation.status?.toLowerCase?.() === 'resolved' && (
                      <div className="bg-success/20 border border-success p-4 rounded text-sm text-success">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="">Resolved</span>
                        </div>
                        <p className=" text-foreground">"{selectedEscalation.resolution_notes}"</p>
                        <p className="mt-2 text-xs opacity-75">
                          Resolved{(selectedEscalation as any).closed_by_name ? ` by ${(selectedEscalation as any).closed_by_name}` : ''} on {new Date(selectedEscalation.resolved_at!).toLocaleString('en-GB')}
                        </p>
                      </div>
                    )}

                    {/* Action History */}
                    {(selectedEscalation as any).actions && (selectedEscalation as any).actions.length > 0 && (
                      <div className="pt-6 border-t border-border">
                        <label className="text-xs  uppercase text-muted-foreground block mb-3">Action History</label>
                        <div className="space-y-4">
                          {(selectedEscalation as any).actions.map((action: any) => (
                            <div key={action.id} className="text-xs border-l-2 border-primary pl-3 py-1">
                              <p className=" text-primary">{action.action_type.toUpperCase()}</p>
                              <p className="text-muted-foreground mt-0.5">{action.description}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {action.taken_by_name ? `${action.taken_by_name} · ` : ''}{new Date(action.created_at).toLocaleString('en-GB')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="bg-muted border-2 border-border p-4 flex items-start gap-3 shadow-sm">
                  <MessageSquare className="w-5 h-5 text-muted-foreground mt-1" />
                  <div>
                    <p className="text-xs  text-muted-foreground uppercase">Communication Log</p>
                    <p className="text-sm text-foreground mt-1">Actions taken here will be logged in the risk history and visible to Registered Managers.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-lg text-gray-400">
                <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-center ">Select an escalation to view details and take action</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ClosureReviewModal
        open={!!closeTarget}
        target={{ type: "escalation", id: closeTarget?.id || "", title: closeTarget?.title }}
        derivedActionsComplete={
          ["actions implemented", "monitoring effectiveness"].includes((((selectedEscalation as any)?.lifecycle_status) || "").toLowerCase())
          || !((selectedEscalation as any)?.risk_id) /* no linked risk -> no remediation actions to complete (vacuous) */
        }
        derivedEffectivenessReviewed={
          (((selectedEscalation as any)?.lifecycle_status) || "").toLowerCase() === "monitoring effectiveness"
          || !((selectedEscalation as any)?.risk_id)
        }
        onClose={() => setCloseTarget(null)}
        onClosed={() => { setSelectedEscalation(null); loadEscalations(); }}
      />
    </div>
  );
}
