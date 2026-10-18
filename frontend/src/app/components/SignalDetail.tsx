import { useState, useEffect, useRef, Fragment } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, AlertCircle, Shield, User, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

interface SignalDetail {
  id: string;
  house_id: string;
  house_name: string;
  creator_name: string;
  created_by_name?: string;
  entry_date: string;
  entry_time: string;
  related_person: string;
  service_user_id?: string;
  signal_type: string;
  risk_domain: string[];
  description: string;
  immediate_action: string;
  severity: string;
  has_happened_before: string;
  pattern_concern: string;
  escalation_required: string;
  review_status: string;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  allocation_is_auto?: boolean;
  prior_occurrences?: number;
  cluster_signal_count?: number;
  cluster_label?: string;
  created_by?: string;
  note_versions?: { id: string; note: string; created_at: string; edited_by_name: string }[];
}

interface TeamLeaderOption {
  id: string;
  name: string;
}

export function SignalDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [signal, setSignal] = useState<SignalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activity, setActivity] = useState<any[]>([]);
  const [markingAttention, setMarkingAttention] = useState(false);
  const [teamLeaders, setTeamLeaders] = useState<TeamLeaderOption[]>([]);
  const [reassigning, setReassigning] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editingPerson, setEditingPerson] = useState(false);
  const [personDraft, setPersonDraft] = useState("");
  const [savingPerson, setSavingPerson] = useState(false);
  const [serviceUsers, setServiceUsers] = useState<any[]>([]);
  const [monitoringHistory, setMonitoringHistory] = useState<any[]>([]);
  const [monitoringNote, setMonitoringNote] = useState("");
  const [monitoringUrgent, setMonitoringUrgent] = useState(false);
  const [monitoringUrgentReason, setMonitoringUrgentReason] = useState("");
  const [savingMonitoringUpdate, setSavingMonitoringUpdate] = useState(false);
  // Generated once per draft, not per click — reused across retries of the SAME attempt so a
  // dropped-connection retry is recognised as the same submission, not a new one.
  const monitoringSubmissionId = useRef<string | null>(null);
  const currentUserId = JSON.parse(localStorage.getItem("user") || "{}").id;
  const canEditNote = !!signal && (
    signal.created_by === currentUserId ||
    signal.assigned_to === currentUserId ||
    ["REGISTERED_MANAGER", "ADMIN", "SUPER_ADMIN", "DIRECTOR"].includes(String(user?.role || "").toUpperCase())
  );

  // Load the service's people so the person can be set/corrected on a signal.
  useEffect(() => {
    if (!signal?.house_id) { setServiceUsers([]); return; }
    apiClient.get(`/houses/${signal.house_id}/service-users`)
      .then((res: any) => { const u = res?.data?.data || res?.data || []; setServiceUsers(Array.isArray(u) ? u : []); })
      .catch(() => setServiceUsers([]));
  }, [signal?.house_id]);

  const savePerson = async () => {
    if (!signal) return;
    setSavingPerson(true);
    try {
      await apiClient.patch(`/pulses/${signal.id}/person`, { service_user_id: personDraft || null });
      toast.success("Person updated");
      setEditingPerson(false);
      loadSignalDetails(signal.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update the person");
    } finally {
      setSavingPerson(false);
    }
  };

  const saveNote = async () => {
    if (!signal || !noteDraft.trim()) { toast.error("The note cannot be empty."); return; }
    setSavingNote(true);
    try {
      await apiClient.patch(`/pulses/${signal.id}/note`, { note: noteDraft.trim() });
      toast.success("Observation updated");
      setEditingNote(false);
      loadSignalDetails(signal.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || e?.message || "Failed to update note");
    } finally {
      setSavingNote(false);
    }
  };
  // Eligibility for direct single-signal promotion is deliberately NARROW: only a lone
  // Critical, or a Safeguarding concern (which cannot wait for a pattern), may become a risk on
  // its own. A single HIGH signal must build toward a pattern first — otherwise every High
  // becomes register noise with no trajectory, which distorts every downstream metric.
  const domainLabel = signal ? (Array.isArray(signal.risk_domain) ? signal.risk_domain[0] : signal.risk_domain) : '';
  const promotable = !!signal && (
    signal.severity === 'Critical' ||
    String(domainLabel || '').toLowerCase().includes('safeguard') ||
    String(signal.signal_type || '').toLowerCase().includes('safeguard')
  );
  const canAllocate = user?.role === 'TEAM_LEADER' || user?.role === 'REGISTERED_MANAGER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (id) {
      loadSignalDetails(id);
      loadActivity(id);
      loadMonitoringHistory(id);
    }
  }, [id]);

  const loadActivity = async (signalId: string) => {
    try {
      const res: any = await apiClient.get(`/pulses/${signalId}/linked-activity`);
      const list = res?.data?.data ?? res?.data ?? [];
      setActivity(Array.isArray(list) ? list : []);
    } catch { setActivity([]); }
  };

  // Signal Monitoring correction (16 Oct 2026): the monitoring owner (usually a TL) records a
  // factual update here — this is evidence, not a governance decision, and never changes the
  // decision, closes the signal or creates an action. An urgent flag surfaces the RM immediately.
  const loadMonitoringHistory = async (signalId: string) => {
    try {
      const res: any = await apiClient.get(`/pulses/${signalId}/monitoring-history`);
      const list = res?.data?.data ?? res?.data ?? [];
      setMonitoringHistory(Array.isArray(list) ? list : []);
    } catch { setMonitoringHistory([]); }
  };

  const saveMonitoringUpdate = async () => {
    if (!signal || monitoringNote.trim().length < 3) { toast.error("Record a brief factual update first."); return; }
    if (monitoringUrgent && monitoringUrgentReason.trim().length < 5) { toast.error("Say briefly why this needs urgent RM attention."); return; }
    setSavingMonitoringUpdate(true);
    try {
      // Stable reference, reused across retries of the SAME attempt (cleared only after success
      // or when the note is edited again) so a dropped-connection retry returns the existing
      // update instead of recording it twice (17 Oct 2026 findings, P2).
      if (!monitoringSubmissionId.current) monitoringSubmissionId.current = `monupd-${signal.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await apiClient.post(`/pulses/${signal.id}/monitoring-update`, {
        note: monitoringNote.trim(), urgent: monitoringUrgent,
        urgent_reason: monitoringUrgent ? monitoringUrgentReason.trim() : undefined,
        client_submission_id: monitoringSubmissionId.current,
      });
      toast.success(monitoringUrgent ? "Update recorded — RM notified immediately." : "Monitoring update recorded.");
      setMonitoringNote(""); setMonitoringUrgent(false); setMonitoringUrgentReason("");
      monitoringSubmissionId.current = null;
      loadMonitoringHistory(signal.id);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to record the update");
    } finally {
      setSavingMonitoringUpdate(false);
    }
  };

  // Chapter 4 — mark this signal for leadership attention (visibility marker, not severity).
  const canMarkAttention = ["TEAM_LEADER", "REGISTERED_MANAGER", "DIRECTOR", "RESPONSIBLE_INDIVIDUAL", "ADMIN", "SUPER_ADMIN"].includes(String(user?.role || "").toUpperCase());
  const markAttention = async () => {
    if (!signal) return;
    const reason = window.prompt("Why does this signal need leadership attention? (a short sentence)");
    if (!reason || reason.trim().length < 10) { if (reason !== null) toast.error("Please give a clear reason (at least a short sentence)."); return; }
    setMarkingAttention(true);
    try {
      await apiClient.post(`/pulses/${signal.id}/leadership-attention`, { reason: reason.trim() });
      toast.success("Flagged for leadership attention");
      loadSignalDetails(signal.id);
    } catch (e: any) { toast.error(e?.response?.data?.message || "Failed to flag"); }
    finally { setMarkingAttention(false); }
  };

  useEffect(() => {
    if (!canAllocate) return;
    (async () => {
      try {
        const res: any = await apiClient.get('/users/directory?role=TEAM_LEADER');
        const list: any[] = Array.isArray(res?.data?.users) ? res.data.users
          : Array.isArray(res?.data) ? res.data
          : Array.isArray(res) ? res : [];
        setTeamLeaders(list.map((u: any) => ({ id: u.id, name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() })));
      } catch (e: any) {
        // Finding C: surface the failure instead of a silent blank menu.
        console.error('Failed to load Team Leaders', e);
        toast.error("Couldn't load Team Leaders — check role/status.");
        setTeamLeaders([]);
      }
    })();
  }, [canAllocate]);

  const reassignSignal = async (assigned_to: string) => {
    if (!signal || !assigned_to) return;
    setReassigning(true);
    try {
      await apiClient.patch(`/pulses/${signal.id}/assignee`, { assigned_to });
      const picked = teamLeaders.find(t => t.id === assigned_to);
      setSignal({ ...signal, assigned_to, assigned_to_name: picked?.name || signal.assigned_to_name, allocation_is_auto: false });
      toast.success('Signal reallocated');
    } catch (err) {
      toast.error('Failed to reallocate signal');
    } finally {
      setReassigning(false);
    }
  };

  const loadSignalDetails = async (signalId: string) => {
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/pulses/${signalId}`);
      const data = (res.data as any).data || (res.data as any);
      // Sometimes risk_domain is string '{Behaviour}'
      let parsedDomain = data.risk_domain;
      if (typeof parsedDomain === 'string') {
          parsedDomain = parsedDomain.replace('{', '').replace('}', '').split(',');
      }
      setSignal({ ...data, risk_domain: parsedDomain });
    } catch (error) {
      console.error('Failed to load signal details:', error);
      toast.error('Failed to load signal details');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-GB') : 'N/A';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading signal details...</p>
        </div>
      </div>
    );
  }

  if (!signal) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl  text-foreground mb-4">Signal record not found</h2>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Back to Dashboard
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
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors mb-6 underline "
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-6 flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl  text-foreground tracking-tighter uppercase ">Signal Details</h1>
              <span className={`px-3 py-1 text-sm  flex items-center gap-2 ${
                signal.review_status === 'New' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                <AlertCircle className="w-4 h-4" />
                {signal.review_status}
              </span>
            </div>
            <p className="text-muted-foreground ">
              {signal.house_name} • Logged on {formatDate(signal.entry_date)} at {signal.entry_time.slice(0, 5)}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="bg-card border-2 border-border p-4 shadow-sm flex-1 md:flex-none">
                <span className="text-xs text-muted-foreground  uppercase tracking-wider block mb-1">Submitted By</span>
                <span className="text-foreground  flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {signal.creator_name || signal.created_by_name || 'Team Leader'}
                </span>
                <span className="text-[10px] text-muted-foreground block mt-1">Permanent record — who raised it</span>
            </div>
            <div className="bg-card border-2 border-border p-4 shadow-sm flex-1 md:flex-none md:min-w-[220px]">
                <span className="text-xs text-muted-foreground uppercase tracking-wider block mb-1">Allocated To</span>
                {signal.assigned_to_name ? (
                  <span className="text-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    {signal.assigned_to_name}
                  </span>
                ) : (
                  <span className="text-warning flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="w-4 h-4" /> Unallocated
                  </span>
                )}
                {signal.assigned_to_name && (
                  <span className="text-[10px] text-muted-foreground block mt-1">
                    {signal.allocation_is_auto ? 'Auto-allocated to house Team Leader' : 'Manually allocated'}
                  </span>
                )}
                {canAllocate && teamLeaders.length > 0 && (
                  <select
                    disabled={reassigning}
                    value=""
                    onChange={(e) => reassignSignal(e.target.value)}
                    className="mt-2 w-full text-xs border border-border rounded px-2 py-1 bg-background text-foreground"
                  >
                    <option value="">{signal.assigned_to_name ? 'Reassign to…' : 'Allocate to a Team Leader…'}</option>
                    {teamLeaders.filter(t => t.id !== signal.assigned_to).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
                {canAllocate && teamLeaders.length === 0 && (
                  <p className="mt-2 text-[11px] text-amber-600">No active Team Leaders found for allocation — check a TL is granted the role, active, and mapped to this service (Admin → Users).</p>
                )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border-2 border-border p-4">
                <h3 className="text-xs  text-muted-foreground uppercase mb-1">Signal Type</h3>
                <p className="text-lg  text-foreground">{signal.signal_type}</p>
            </div>
            <div className="bg-card border-2 border-border p-4">
                <h3 className="text-xs  text-muted-foreground uppercase mb-1">Severity</h3>
                <p className={`text-lg  ${signal.severity === 'High' || signal.severity === 'Critical' ? 'text-destructive' : 'text-foreground'}`}>
                    {signal.severity}
                </p>
            </div>
            <div className="bg-card border-2 border-border p-4">
                <h3 className="text-xs  text-muted-foreground uppercase mb-1">Immediate escalation at recording</h3>
                <p className="text-lg  text-foreground">{signal.escalation_required || 'None recorded'}</p>
            </div>
            <div className="bg-card border-2 border-border p-4">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs text-muted-foreground uppercase">Related Person</h3>
                    {canEditNote && !editingPerson && (
                        <button onClick={() => { setPersonDraft(signal.service_user_id || ""); setEditingPerson(true); }}
                            className="text-xs text-primary font-medium hover:underline">Edit</button>
                    )}
                </div>
                {editingPerson ? (
                    <div>
                        <select value={personDraft} onChange={(e) => setPersonDraft(e.target.value)}
                            className="w-full border-2 border-primary bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                            <option value="">— Not about a specific person —</option>
                            {serviceUsers.map((u: any) => <option key={u.id} value={u.id}>{u.display_name}</option>)}
                        </select>
                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setEditingPerson(false)} className="px-3 py-1.5 border-2 border-border text-xs hover:bg-muted">Cancel</button>
                            <button onClick={savePerson} disabled={savingPerson} className="px-3 py-1.5 bg-primary text-primary-foreground text-xs disabled:opacity-50">{savingPerson ? "Saving…" : "Save"}</button>
                        </div>
                        {serviceUsers.length === 0 && <p className="text-[11px] text-muted-foreground mt-1">No people are recorded for this service yet.</p>}
                    </div>
                ) : (
                    <p className="text-lg text-foreground">{signal.related_person || 'N/A'}</p>
                )}
            </div>
        </div>

        <div className="space-y-6 pb-20">
            <div className="bg-card border-2 border-border p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl  flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Observation Details
                    </h2>
                    {canEditNote && !editingNote && (
                        <button onClick={() => { setNoteDraft(signal.description || ""); setEditingNote(true); }}
                            className="text-sm text-primary font-medium hover:underline">Edit note</button>
                    )}
                </div>

                {editingNote ? (
                    <div>
                        <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={5}
                            className="w-full border-2 border-primary bg-background p-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setEditingNote(false)} className="px-4 py-2 border-2 border-border text-sm hover:bg-muted">Cancel</button>
                            <button onClick={saveNote} disabled={savingNote} className="px-4 py-2 bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50">{savingNote ? "Saving…" : "Save update"}</button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Your update is added on top; the previous note is kept below as history.</p>
                    </div>
                ) : (
                    <>
                        {/* Current observation — the latest version, blue-highlighted. */}
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 border-l-4 border-blue-500 rounded-r">
                            <p className="text-foreground text-lg whitespace-pre-line">{signal.description}</p>
                            {signal.note_versions && signal.note_versions.length > 0 && (
                                <p className="text-[11px] text-muted-foreground mt-2">
                                    {signal.note_versions[0].edited_by_name} · {new Date(signal.note_versions[0].created_at).toLocaleString('en-GB')}
                                    {signal.note_versions.length > 1 ? ' · current version' : ''}
                                </p>
                            )}
                        </div>

                        {/* Previous versions — greyed history trail (newest first). */}
                        {signal.note_versions && signal.note_versions.length > 1 && (
                            <div className="mt-4 space-y-2">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">Previous versions</p>
                                {signal.note_versions.slice(1).map((v) => (
                                    <div key={v.id} className="bg-muted/40 p-3 border-l-4 border-border rounded-r opacity-70">
                                        <p className="text-sm text-muted-foreground whitespace-pre-line line-through decoration-muted-foreground/40">{v.note}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">Edited by {v.edited_by_name} · {new Date(v.created_at).toLocaleString('en-GB')}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {signal.immediate_action && (
                <div className="bg-card border-2 border-border p-6">
                    <h2 className="text-xl  flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                        Immediate Action Taken
                    </h2>
                    <p className="text-foreground">{signal.immediate_action}</p>
                </div>
            )}

            <div className="bg-card border-2 border-border p-6 flex justify-between">
               <div>
                  <h3 className="text-sm  text-muted-foreground uppercase">Pattern Concern</h3>
                  {(signal as any).cluster_promoted_risk_id ? (
                    // The pattern has already been promoted — this signal is now evidence on a live
                    // risk, not a pattern still awaiting a decision. Point to the risk, don't imply
                    // it still needs promoting.
                    <button
                      onClick={() => navigate(`/risks/${(signal as any).cluster_promoted_risk_id}`)}
                      className="text-lg text-primary font-semibold underline underline-offset-2 text-left"
                    >
                      Already a registered risk — view it →
                    </button>
                  ) : (signal.cluster_signal_count ?? 0) >= 2 ? (
                    <p className="text-lg text-amber-600 font-semibold">Part of a {signal.cluster_signal_count}-signal pattern{signal.pattern_concern && signal.pattern_concern !== "None" ? ` · ${signal.pattern_concern}` : ""}</p>
                  ) : (
                    <p className="text-lg ">{signal.pattern_concern && signal.pattern_concern !== "None" ? signal.pattern_concern : "Not yet part of a pattern"}</p>
                  )}
               </div>
               <div>
                  <h3 className="text-sm  text-muted-foreground uppercase">Happened Before</h3>
                  {(signal.prior_occurrences ?? 0) > 0 ? (
                    <p className="text-lg text-amber-600 font-semibold">Yes — {signal.prior_occurrences} prior signal{signal.prior_occurrences === 1 ? "" : "s"}</p>
                  ) : (
                    <p className="text-lg ">{signal.has_happened_before || "No"}<span className="text-xs text-muted-foreground ml-1">(no earlier signals on record)</span></p>
                  )}
               </div>
               <div>
                  <h3 className="text-sm  text-muted-foreground uppercase">Risk Domains</h3>
                  <p className="text-lg ">{Array.isArray(signal.risk_domain) ? signal.risk_domain.join(', ') : signal.risk_domain}</p>
               </div>
            </div>
            
            {signal.review_status === 'New' && user?.role !== 'TEAM_LEADER' && (
              <div className="flex justify-end gap-4 mt-8">
                {/* Show Promote to Serious Incident only for critical signals */}
                {signal.severity && signal.severity.toLowerCase() === 'critical' && (
                  <button 
                  onClick={() => {
                    navigate('/incidents', { state: { 
                      fromSignal: true,
                      signalId: signal.id,
                      title: `Serious Incident: ${signal.signal_type} - ${signal.related_person}`,
                      description: signal.description,
                      immediate_action: signal.immediate_action,
                      // Use raw severity from database as it matches Incident Hub enum
                      severity: signal.severity,
                      signalType: signal.signal_type.toLowerCase() === 'behaviour' ? 'behavioral' : 
                            signal.signal_type.toLowerCase() === 'medication' ? 'medication' : 'other',
                      houseId: signal.house_id
                    }});
                    toast.info('Transitioning to Incident Case Hub for promotion...');
                  }}
                  className="bg-destructive text-destructive-foreground px-6 py-3  hover:bg-destructive/90 transition-colors flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Promote to Serious Incident
                  </button>
                )}

                {/* Promote to Risk — single serious signal (High/Critical/Safeguarding)
                    becomes a formal risk via the documented critical-exception path. The
                    signal is carried across as the risk's first evidence. Other signals
                    must build toward their pattern first (doctrine: Signal → Pattern → Risk). */}
                {promotable ? (
                  <button
                    disabled={promoting}
                    onClick={async () => {
                      setPromoting(true);
                      try {
                        const res = await apiClient.post('/risks/promote', {
                          source_pulse_id: signal.id,
                          title: `Risk: ${domainLabel || signal.signal_type}${signal.related_person ? ' — ' + signal.related_person : ''}`,
                          description: signal.description,
                          severity: ['High', 'Critical'].includes(signal.severity) ? signal.severity : 'High',
                        });
                        const newRisk = (res.data as any).data;
                        toast.success('Signal promoted to a formal risk — carried across as its first evidence');
                        if (newRisk?.id) navigate(`/risks/${newRisk.id}`); else navigate('/risk-register');
                      } catch (err: any) {
                        toast.error(err?.response?.data?.message || 'Failed to promote signal to risk');
                      } finally {
                        setPromoting(false);
                      }
                    }}
                    className="bg-primary text-primary-foreground px-6 py-3 hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    {promoting ? 'Promoting…' : 'Promote to Risk'}
                  </button>
                ) : (
                  <div className="text-right max-w-sm">
                    <p className="text-sm text-muted-foreground">
                      This signal builds toward its <span className="font-medium text-foreground">pattern</span>. Promote from the cluster once it reaches the threshold — only a <span className="font-medium text-foreground">Critical</span> signal or a <span className="font-medium text-foreground">Safeguarding</span> concern can become a risk on its own. A High signal must form a pattern first.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Signal Monitoring correction (16 Oct 2026): the monitoring owner records factual
                updates here. Shown whenever the signal is under an active Monitor decision —
                the backend enforces that only the named owner (or RM/Admin oversight) can post. */}
            {signal?.review_status === 'Monitoring' && (
              <div className="mt-8 border-t border-border pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-1">Monitoring</h3>
                <p className="text-xs text-muted-foreground mb-4">Record what you have observed while monitoring this signal. This is factual evidence — it does not close the signal or change the governance decision. The Registered Manager reviews this at the scheduled review point, or immediately if you flag it urgent.</p>
                {monitoringHistory.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {monitoringHistory.map((u) => (
                      <div key={u.id} className={`rounded-lg border p-3 text-sm ${u.urgent ? 'border-amber-300 bg-amber-50' : 'border-border bg-muted/20'}`}>
                        {u.urgent && <div className="text-xs font-semibold text-amber-700 mb-1">Urgent — {u.urgent_reason || 'flagged for RM attention'}</div>}
                        <div className="text-foreground">{u.note}</div>
                        <div className="text-xs text-muted-foreground mt-1">{u.author_name || 'Unknown'} · {new Date(u.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  value={monitoringNote}
                  onChange={(e) => setMonitoringNote(e.target.value)}
                  placeholder="What did you observe? (factual update)"
                  className="w-full min-h-[80px] rounded-lg border border-border p-3 text-sm bg-background"
                />
                <label className="flex items-center gap-2 mt-3 text-sm">
                  <input type="checkbox" checked={monitoringUrgent} onChange={(e) => setMonitoringUrgent(e.target.checked)} />
                  This needs the Registered Manager's attention now, before the scheduled review
                </label>
                {monitoringUrgent && (
                  <input
                    value={monitoringUrgentReason}
                    onChange={(e) => setMonitoringUrgentReason(e.target.value)}
                    placeholder="Briefly, why does this need attention now?"
                    className="w-full mt-2 rounded-lg border border-amber-300 p-2.5 text-sm bg-background"
                  />
                )}
                <button
                  onClick={saveMonitoringUpdate}
                  disabled={savingMonitoringUpdate}
                  className="mt-3 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingMonitoringUpdate ? 'Saving…' : monitoringUrgent ? 'Record update & notify RM' : 'Record monitoring update'}
                </button>
              </div>
            )}

            {/* Chapter 4 — leadership attention marker + Linked Governance Activity */}
            <div className="mt-8 border-t border-border pt-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">Direct Governance History</h3>
                  {(signal as any).leadership_attention && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Leadership attention</span>
                  )}
                </div>
                {canMarkAttention && !(signal as any).leadership_attention && (
                  <button onClick={markAttention} disabled={markingAttention}
                    className="text-sm text-amber-700 border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-50 disabled:opacity-50">
                    {markingAttention ? "Flagging…" : "Flag for leadership attention"}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-4">This is the direct history of this signal only. Wider pattern/risk context is not mixed into this timeline. Downstream actions, effectiveness reviews and escalations appear only when directly linked to this signal.</p>
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No direct governance records yet. A decision, action or escalation created directly from this signal will appear here.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-[11px] uppercase text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3">Record</th><th className="pr-3">Relationship</th><th className="pr-3">Detail</th><th className="pr-3">Governance Decision</th><th>When</th>
                    </tr></thead>
                    <tbody>
                      {activity.map((a: any, i: number) => {
                        const isMonitor = a.record === 'Governance Decision' && a.governanceDecision === 'Monitor';
                        return (
                        <Fragment key={i}>
                        <tr className={`border-b border-border/50 ${a.link ? "cursor-pointer hover:bg-muted/40" : ""}`} onClick={() => a.link && navigate(a.link)}>
                          <td className="py-2.5 pr-3 font-medium text-foreground whitespace-nowrap">{a.record}</td>
                          <td className="pr-3 text-muted-foreground whitespace-nowrap">{a.relationship}</td>
                          <td className="pr-3 text-foreground">{a.label}</td>
                          <td className="pr-3 whitespace-nowrap">
                            {a.status}
                            {a.workflowState && a.workflowState !== a.status && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground align-middle">{a.workflowState}</span>
                            )}
                          </td>
                          <td className="text-muted-foreground whitespace-nowrap">{a.at ? new Date(a.at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}</td>
                        </tr>
                        {isMonitor && (
                          <tr className="border-b border-border/50 bg-muted/20">
                            <td colSpan={5} className="px-3 py-2.5">
                              <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                                {a.reason && (<><dt className="text-muted-foreground">Reason</dt><dd className="text-foreground">{a.reason}</dd></>)}
                                {a.monitoringOwner && (<><dt className="text-muted-foreground">Monitoring owner</dt><dd className="text-foreground">{a.monitoringOwner}</dd></>)}
                                {a.whatToWatch && (<><dt className="text-muted-foreground">What to watch</dt><dd className="text-foreground">{a.whatToWatch}</dd></>)}
                                {a.reviewDue && (<><dt className="text-muted-foreground">Review due</dt><dd className="text-foreground">{new Date(a.reviewDue).toLocaleDateString('en-GB')}</dd></>)}
                                {a.actSoonerIf && (<><dt className="text-muted-foreground">Act sooner if</dt><dd className="text-foreground">{a.actSoonerIf}</dd></>)}
                                {a.expectedReviewOutcome && (<><dt className="text-muted-foreground">Expected review outcome</dt><dd className="text-foreground">{a.expectedReviewOutcome}</dd></>)}
                                {a.author && (<><dt className="text-muted-foreground">Author</dt><dd className="text-foreground">{a.author}</dd></>)}
                              </dl>
                            </td>
                          </tr>
                        )}
                        </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}
