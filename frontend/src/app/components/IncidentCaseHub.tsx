import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { Plus, Search, Calendar, MapPin, AlertTriangle, Filter, X, Ambulance } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

interface IncidentCase {
  id: string;
  reference: string;
  houseId: string;
  houseName: string;
  title: string;
  description: string;
  incidentDate: string;
  incidentType: string;
  status: "under-review" | "closed" | "archived";
  createdAt: string;
  createdBy: string;
  linkedRisks: number;
  linkedEscalations: number;
  externalRefs: string[];
}

// 22 Nov 2026 brief (Serious Incident workflow, Step 1): the link pickers (risk/escalation/
// signal/pattern) previously collapsed three genuinely different states -- "loading" (query in
// flight), "unavailable" (query failed / not authorised) and "no matches" (query succeeded,
// legitimately zero results) -- into one "0 Items" empty list, which was itself the reported bug.
// Each now gets its own distinct message. Also replaces the native <select multiple> (which needs
// Ctrl/Cmd-click to multi-select -- there is no such gesture on an iPad) with a checkbox list
// whose rows meet the ~44px touch-target guideline, without building a fully custom dropdown
// widget.
type PickerStatus = 'loading' | 'ready' | 'error';

function EvidenceLinkPicker({
  label, hint, searchTerm, onSearchChange, status, items, selectedIds, onToggle, onRetry, emptyHint,
}: {
  label: string;
  hint?: string;
  searchTerm: string;
  onSearchChange: (v: string) => void;
  status: PickerStatus;
  items: { id: string; label: string }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onRetry?: () => void;
  emptyHint?: string;
}) {
  return (
    <div>
      <label className="block text-sm text-foreground mb-1">{label}</label>
      <input
        type="text"
        placeholder={`Search ${label.toLowerCase()}...`}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full mb-2 px-3 py-2 border-2 border-border rounded bg-background text-sm focus:ring-2 focus:ring-primary focus:outline-none"
      />
      {status === 'loading' && (
        <p className="text-xs text-muted-foreground border-2 border-border rounded-lg px-3 py-3">Loading…</p>
      )}
      {status === 'error' && (
        <div className="flex items-center justify-between gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-3">
          <span className="text-amber-800">Unavailable — this list couldn't be loaded (connection or access issue).</span>
          {onRetry && <button type="button" onClick={onRetry} className="font-semibold text-amber-900 underline shrink-0">Retry</button>}
        </div>
      )}
      {status === 'ready' && items.length === 0 && (
        <p className="text-xs text-muted-foreground border-2 border-dashed border-border rounded-lg px-3 py-3">{emptyHint || 'No matching records found.'}</p>
      )}
      {status === 'ready' && items.length > 0 && (
        <div className="border-2 border-border rounded-lg max-h-56 overflow-y-auto divide-y divide-border">
          {items.map((item) => (
            <label key={item.id} className="flex items-start gap-3 px-3 py-3 min-h-[44px] cursor-pointer hover:bg-muted/50 text-sm active:bg-muted">
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => onToggle(item.id)}
                className="mt-0.5 w-5 h-5 shrink-0 accent-primary"
              />
              <span className="text-foreground">{item.label}</span>
            </label>
          ))}
        </div>
      )}
      {hint && <p className="text-[11px] text-muted-foreground mt-1.5 ml-1">{hint}</p>}
    </div>
  );
}

export function IncidentCaseHub() {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<IncidentCase[]>([]);
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [houseFilter, setHouseFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  // C1 correction (21 Oct 2026): "Remove first-assigned-service-only selection/submission/list
  // filtering. Allow every authorised assigned service and save the selected ID." Previously only
  // the FIRST house from a multi-service RM/TL's assignment list was ever used -- for selection,
  // submission and the incident list filter alike. Now holds every assigned house.
  const [userHouseId, setUserHouseId] = useState<string | null>(null);
  const [userHouseName, setUserHouseName] = useState<string>('');
  const [userHouses, setUserHouses] = useState<{ id: string; name: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // C2 correction: "Prevent duplicate submissions ... without duplicating the case." A ref (not
  // state) so it survives re-renders but stays stable across a retry of the SAME attempt; only
  // cleared after a successful submission, so a retry after a failure reuses the same id.
  const submissionIdRef = useRef<string | null>(null);
  
  const [riskSearchTerm, setRiskSearchTerm] = useState('');
  const [escalationSearchTerm, setEscalationSearchTerm] = useState('');

  const defaultOccurredAt = () => new Date().toISOString().slice(0, 16); // 'YYYY-MM-DDTHH:MM'

  // Create incident form state
  const [incidentForm, setIncidentForm] = useState<any>({
    house_id: '', title: '', description: '', severity: 'moderate', occurred_at: defaultOccurredAt(), immediate_action: '', persons_involved: '', location: '', type: '', warning_signals: '', warning_signals_reason: '', source_pulse_id: '',
    la_referral: '', cqc_notification: '', police_reference: '', other_references: '',
    is_foreseeable: '', risk_factors: '', preventive_measures: '', leadership_commentary: '',
    lessons_learned: '', learning_shared: false
  });

  const DRAFT_KEY = `si-draft-${userIdSafe()}`;
  function userIdSafe() { try { return JSON.parse(localStorage.getItem('user') || '{}').id || 'anon'; } catch { return 'anon'; } }
  const [draftRestored, setDraftRestored] = useState(false);
  const [narrativeBusy, setNarrativeBusy] = useState(false);
  const [patterns, setPatterns] = useState<any>(null);
  const [detecting, setDetecting] = useState(false);
  // 22 Nov 2026 brief: distinguishes "the lookup failed" from "the lookup succeeded and found
  // nothing" -- these used to collapse into the same "No closely related incidents or signals
  // found" message.
  const [patternsError, setPatternsError] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [allHouses, setAllHouses] = useState<any[]>([]);
  const [allRisks, setAllRisks] = useState<any[]>([]);
  const [allEscalations, setAllEscalations] = useState<any[]>([]);
  const [allSignals, setAllSignals] = useState<any[]>([]);
  const [allPatterns, setAllPatterns] = useState<any[]>([]);
  // 22 Nov 2026 brief: distinct loading/unavailable/no-matches state per picker -- see
  // EvidenceLinkPicker above for why ("0 Items" was the reported bug).
  const [risksStatus, setRisksStatus] = useState<PickerStatus>('loading');
  const [escalationsStatus, setEscalationsStatus] = useState<PickerStatus>('loading');
  const [signalsStatus, setSignalsStatus] = useState<PickerStatus>('loading');
  const [patternsStatus, setPatternsStatus] = useState<PickerStatus>('loading');
  const [signalSearchTerm, setSignalSearchTerm] = useState('');
  const [patternSearchTerm, setPatternSearchTerm] = useState('');
  const [people, setPeople] = useState<{ id: string; name: string; kind: string }[]>([]);
  // C1 correction (21 Oct 2026): "Show directory loading/error/retry" -- the directory fetch was a
  // bare try/catch with no loading state and no way to retry a failed load; a failure just left the
  // picker permanently empty with no explanation.
  const [peopleStatus, setPeopleStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  // C1 correction: "Record stable identity, client/staff/external/unknown type and roles: affected
  // person, witness, person alleged to have caused harm, reporter or other. Permit multiple roles,
  // no individual affected." Replaces the free-text comma list (persons_involved as a plain
  // string) that stored unstructured names with no type or role -- confirmed every incident on
  // production has persons_involved=[] because the field was never actually structured data the
  // backend could use meaningfully.
  type IncidentPersonType = 'client' | 'staff' | 'external' | 'unknown';
  type IncidentPersonRole = 'affected' | 'witness' | 'alleged' | 'reporter' | 'other';
  // 22 Nov 2026 brief (Serious Incident workflow, Step 1): `id` is the stable directory id
  // (service user or staff) when the person was picked from the directory -- carried through to
  // detect-patterns so related-history/warning-evidence matching can use it instead of relying on
  // name-text equality. Left undefined for an external/unknown person with no record, or for a
  // name typed free-text that didn't resolve to a directory entry.
  type IncidentPerson = { id?: string; name: string; type: IncidentPersonType; roles: IncidentPersonRole[] };
  const [incidentPersons, setIncidentPersons] = useState<IncidentPerson[]>([]);
  const [noIndividualAffected, setNoIndividualAffected] = useState(false);
  const [personDraftName, setPersonDraftName] = useState('');
  const [personDraftType, setPersonDraftType] = useState<IncidentPersonType>('client');
  const [personDraftRoles, setPersonDraftRoles] = useState<IncidentPersonRole[]>([]);
  const ROLE_LABEL: Record<IncidentPersonRole, string> = {
    affected: 'Affected person', witness: 'Witness', alleged: 'Person alleged to have caused harm',
    reporter: 'Reporter', other: 'Other',
  };

  const userString = localStorage.getItem('user') || '{}';
  const user = JSON.parse(userString);
  const userRole = (localStorage.getItem('userRole') || '').toUpperCase().replace(/-/g, '_');
  const userId = user.id;
  const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User';

  useEffect(() => { loadIncidents(); }, []);

  useEffect(() => {
    if (location.state?.fromSignal) {
      setIncidentForm((prev: any) => ({
        ...prev,
        title: location.state.title || prev.title,
        description: location.state.description || prev.description,
        immediate_action: location.state.immediate_action || prev.immediate_action,
        severity: location.state.severity || prev.severity,
        type: location.state.signalType || prev.type,
        house_id: location.state.houseId || location.state.house_id || prev.house_id,
        source_pulse_id: location.state.signalId || location.state.source_pulse_id || prev.source_pulse_id,
        occurred_at: defaultOccurredAt()
      }));
      setShowCreateModal(true);
      toast.info('Pre-filling incident from signal details');
      
      // Clear state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // C1 correction: directory loading now has an explicit loading/error/retry state instead of
  // silently leaving the picker empty on failure with no way to recover without a full page reload.
  const loadPeopleDirectory = async () => {
    setPeopleStatus('loading');
    try {
      const [usersRes, suRes] = await Promise.all([
        apiClient.get('/users/directory'),
        apiClient.get('/service-users?limit=200'),
      ]);
      const uData = (usersRes.data as any).data || (usersRes.data as any) || [];
      const uList = Array.isArray(uData) ? uData : (uData.users || uData.items || []);
      const sData = (suRes.data as any).data || (suRes.data as any) || [];
      const sList = Array.isArray(sData) ? sData : (sData.serviceUsers || sData.service_users || sData.items || []);
      const nameOf = (p: any) => (p.name || p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.full_name || '').trim();
      // 22 Nov 2026 brief: keep each directory entry's stable id -- lost entirely before (only
      // {name,kind} was kept), which is why "Add person" could never attach anything but a name
      // for related-history/evidence matching to key off.
      const staff = uList.map((u: any) => ({ id: u.id, name: nameOf(u), kind: 'Staff' })).filter((p: any) => p.name);
      const patients = sList.map((s: any) => ({ id: s.id, name: nameOf(s), kind: 'Service User' })).filter((p: any) => p.name);
      setPeople([...patients, ...staff]);
      setPeopleStatus('ready');
    } catch {
      setPeopleStatus('error');
    }
  };

  // 22 Nov 2026 brief (Serious Incident workflow, Step 1): "Load authorised records for the
  // selected service." These used to load once, company-wide, on page mount -- never scoped to
  // the service the incident is actually being reported against, and never reloaded if the user
  // changed the service. Now a dedicated loader, re-run (see the effect below) whenever the
  // create-modal is open and the selected service changes, with its own loading/error/ready
  // status per list so the picker can tell "still loading" apart from "failed" apart from
  // "genuinely no matches" instead of showing "0 Items" for all three.
  const loadLinkableEvidence = async (houseId: string) => {
    const hParam = houseId ? `&house_id=${houseId}` : '';
    setRisksStatus('loading');
    try {
      const risksRes = await apiClient.get(`/risks?limit=100${hParam}`);
      const rData = (risksRes.data as any).data || (risksRes.data as any) || [];
      setAllRisks(Array.isArray(rData) ? rData : (rData.risks || rData.items || []));
      setRisksStatus('ready');
    } catch { setAllRisks([]); setRisksStatus('error'); }

    setEscalationsStatus('loading');
    try {
      const escalationsRes = await apiClient.get(`/escalations?limit=100${hParam}`);
      const eData = (escalationsRes.data as any).data || (escalationsRes.data as any) || [];
      setAllEscalations(Array.isArray(eData) ? eData : (eData.escalations || eData.items || []));
      setEscalationsStatus('ready');
    } catch { setAllEscalations([]); setEscalationsStatus('error'); }

    // C1 correction (21 Oct 2026): "Replace register-only linking with 'Link relevant records':
    // signals, monitoring, incidents, decisions, actions, escalations, patterns and risks.
    // Permit multiple unpromoted source signals and relevant closed/dismissed records with
    // original reasons." Risks and escalations were the only linkable record types -- signals
    // and patterns (including ones never promoted to a formal risk) were entirely absent.
    setSignalsStatus('loading');
    try {
      const signalsRes = await apiClient.get(`/pulses?limit=200${hParam}`);
      const sigData = (signalsRes.data as any).data || (signalsRes.data as any) || [];
      setAllSignals(Array.isArray(sigData) ? sigData : (sigData.pulses || sigData.items || []));
      setSignalsStatus('ready');
    } catch { setAllSignals([]); setSignalsStatus('error'); }

    setPatternsStatus('loading');
    try {
      const patternsRes = await apiClient.get(`/governance/clusters?scope=service${hParam}`);
      const patData = (patternsRes.data as any).data || (patternsRes.data as any) || [];
      setAllPatterns(Array.isArray(patData) ? patData : (patData.clusters || patData.items || []));
      setPatternsStatus('ready');
    } catch { setAllPatterns([]); setPatternsStatus('error'); }
  };

  const loadIncidents = async () => {
    try {
      // Load all houses
      const housesRes = await apiClient.get('/houses?limit=100');
      const hDataAll = (housesRes.data as any).data || (housesRes.data as any) || [];
      const housesList = Array.isArray(hDataAll) ? hDataAll : [];
      setAllHouses(housesList);

      loadPeopleDirectory();

      let houseIds: string[] = [];
      if (userRole === 'REGISTERED_MANAGER' || userRole === 'TEAM_LEADER') {
        const hRes = await apiClient.get(`/users/${userId}/houses`);
        const hData = (hRes.data as any).data || (hRes.data as any) || [];
        const myHouses: { id: string; name: string }[] = Array.isArray(hData) ? hData : (hData ? [hData] : []);
        if (myHouses.length) {
          houseIds = myHouses.map((h) => h.id);
          setUserHouses(myHouses);
          setUserHouseId(myHouses[0].id);
          setUserHouseName(myHouses[0].name);
          // Default the form to the first assigned service, but every assigned service remains
          // selectable (getAvailableHouses) and nothing forces this value on submit.
          setIncidentForm((f: any) => ({ ...f, house_id: myHouses[0].id }));
        }
      }
      // Every authorised assigned service, not just the first -- the list is no longer filtered
      // down to a single house for a multi-service RM/TL.
      const params = houseIds.length ? `?house_id=${houseIds.join(',')}&limit=100` : '?limit=100';
      const res = await apiClient.get(`/incidents${params}`);
      const data = (res.data as any).data || (res.data as any) || {};
      const rawIncs = data.incidents || data.items || (Array.isArray(data) ? data : []);
      const mapped: IncidentCase[] = rawIncs.map((inc: any) => ({
        id: inc.id,
        reference: inc.reference || '',
        houseId: inc.house_id,
        houseName: inc.house_name || housesList.find((h: any) => h.id === inc.house_id)?.name || userHouseName || 'Unknown',
        title: inc.title || 'Untitled Incident',
        description: inc.description || '',
        incidentDate: inc.occurred_at ? new Date(inc.occurred_at).toLocaleDateString('en-GB') : '',
        incidentType: inc.category_name || 'Incident',
        status: inc.status || 'Open',
        createdAt: inc.created_at ? new Date(inc.created_at).toLocaleDateString('en-GB') : '',
        createdBy: inc.created_by_name || '',
        linkedRisks: (inc.linked_risks && Array.isArray(inc.linked_risks)) ? inc.linked_risks.length : 0,
        linkedEscalations: (inc.linked_escalations && Array.isArray(inc.linked_escalations)) ? inc.linked_escalations.length : 0,
        externalRefs: inc.external_refs || []
      }));
      setIncidents(mapped);
    } catch (err) {
      console.error('Failed to load incidents', err);
      toast.error('Failed to load incidents');
    } finally { setIsLoading(false); }
  };

  const handleCreateIncident = async () => {
    if (!incidentForm.title || !incidentForm.description || !incidentForm.occurred_at) {
      toast.error('Please fill in title, description and date'); return;
    }
    // C1 correction: "no individual affected" must be an explicit, recorded confirmation, not just
    // an empty list that could equally mean "forgot to add anyone".
    if (!noIndividualAffected && incidentPersons.length === 0) {
      toast.error('Add at least one person involved, or confirm no individual was affected.'); return;
    }
    // C1 correction (21 Oct 2026): "Allow every authorised assigned service and save the selected
    // ID." This used to force userHouseId (the single first assigned house) over whatever the form
    // actually held, silently discarding a deliberate selection of a different assigned service.
    const targetHouseId = incidentForm.house_id;
    if (!targetHouseId) { toast.error('Please select a house'); return; }
    if (!incidentForm.occurred_at) { toast.error('Please select a date'); return; }

    setIsSubmitting(true);
    try {
      if (!submissionIdRef.current) submissionIdRef.current = crypto.randomUUID();
      const created = await apiClient.post('/incidents', {
        client_submission_id: submissionIdRef.current,
        house_id: targetHouseId,
        title: incidentForm.title,
        description: incidentForm.description,
        severity: incidentForm.severity,
        occurred_at: new Date(incidentForm.occurred_at).toISOString(),
        location: incidentForm.location,
        immediate_action: incidentForm.immediate_action,
        type: incidentForm.type,
        source_pulse_id: incidentForm.source_pulse_id || undefined,
        // C1 correction: structured identity (name, type, roles) instead of a flat name list.
        persons_involved: incidentPersons,
        no_individual_affected: noIndividualAffected,
        follow_up_required: true,
        linked_risks: incidentForm.linked_risks || [],
        linked_escalations: incidentForm.linked_escalations || [],
        linked_signals: incidentForm.linked_signals || [],
        linked_patterns: incidentForm.linked_patterns || [],
        // C2 correction: "Persist warning-signals answer" -- captured in the form but never
        // actually included in the submit payload before.
        warning_signals: incidentForm.warning_signals || undefined,
        // 22 Nov 2026 brief: "Not known yet" free-text reason -- only meaningful alongside that
        // answer, so it's dropped rather than sent as stray text if the answer changed afterwards.
        warning_signals_reason: incidentForm.warning_signals === 'unknown' ? (incidentForm.warning_signals_reason || undefined) : undefined,
        la_referral: incidentForm.la_referral,
        cqc_notification: incidentForm.cqc_notification,
        police_reference: incidentForm.police_reference,
        other_references: incidentForm.other_references,
        is_foreseeable: incidentForm.is_foreseeable,
        risk_factors: incidentForm.risk_factors,
        preventive_measures: incidentForm.preventive_measures,
        leadership_commentary: incidentForm.leadership_commentary,
        lessons_learned: incidentForm.lessons_learned,
        learning_shared: !!incidentForm.learning_shared,
      });
      const ref = (created.data as any)?.data?.reference || (created.data as any)?.reference;
      toast.success(ref ? `Serious incident ${ref} logged` : 'Incident reported successfully');
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      submissionIdRef.current = null; // only clear on confirmed success -- a retry after failure reuses the same id
      setShowCreateModal(false);
      setIncidentPersons([]); setNoIndividualAffected(false); setPersonDraftName(''); setPersonDraftRoles([]);
      setIncidentForm({
        house_id: userHouseId || '', title: '', description: '', severity: 'moderate', occurred_at: defaultOccurredAt(),
        immediate_action: '', persons_involved: '', location: '', type: '', warning_signals: '', warning_signals_reason: '', source_pulse_id: '', linked_risks: [], linked_escalations: [], linked_signals: [], linked_patterns: [],
        la_referral: '', cqc_notification: '', police_reference: '', other_references: '',
        is_foreseeable: '', risk_factors: '', preventive_measures: '', leadership_commentary: '',
        lessons_learned: '', learning_shared: false
      });
      loadIncidents();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to report incident'); }
    finally { setIsSubmitting(false); }
  };

  // Role-based filtering
  const getFilteredIncidents = () => {
    let filtered = incidents;
    if (houseFilter !== 'All') filtered = filtered.filter(i => i.houseName === houseFilter);
    if (statusFilter !== 'All') filtered = filtered.filter(i => i.status === statusFilter);
    if (searchTerm) filtered = filtered.filter(i =>
      i.houseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.incidentType.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return filtered;
  };

  // C1 correction: every house the RM/TL is actually assigned to is selectable, not just the
  // first one returned by the API.
  const getAvailableHouses = () => {
    if (userHouses.length) return userHouses;
    return allHouses;
  };

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, houseFilter, statusFilter]);

  // Reset search terms when modal opens
  useEffect(() => {
    if (showCreateModal) {
      setRiskSearchTerm('');
      setEscalationSearchTerm('');
    } else {
      setDraftRestored(false);
      setPatterns(null);
      setPatternsError(false);
    }
  }, [showCreateModal]);

  // 22 Nov 2026 brief: load the link pickers' records for whichever service is actually selected,
  // and reload whenever that selection changes -- previously loaded once, unscoped, on page mount
  // and never again, regardless of which service the user picked in the form.
  useEffect(() => {
    if (!showCreateModal) return;
    loadLinkableEvidence(incidentForm.house_id || userHouseId || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCreateModal, incidentForm.house_id, userHouseId]);

  // Restore an in-progress draft when the modal opens (unless pre-filling from a signal).
  useEffect(() => {
    if (!showCreateModal || draftRestored) return;
    if (location.state?.fromSignal) { setDraftRestored(true); return; }
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && (saved.title || saved.description)) {
          setIncidentForm((prev: any) => ({ ...prev, ...saved }));
          toast.info('Restored your unsaved incident draft');
        }
      }
    } catch { /* ignore */ }
    setDraftRestored(true);
  }, [showCreateModal]);

  // Auto-save the draft as the user types (debounced) so nothing is lost mid-report.
  useEffect(() => {
    if (!showCreateModal) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(incidentForm)); } catch { /* ignore */ }
    }, 600);
    return () => clearTimeout(t);
  }, [incidentForm, showCreateModal]);

  // Pattern detection (debounced): prior incidents + recent signals for the people/service.
  //
  // 22 Nov 2026 brief (Serious Incident workflow, Step 1 "fix 0 Items" / "refresh whenever the
  // person/service context actually changes"): this already re-fires on house_id/incidentPersons
  // changes, so the literal "fires once on mount before context is set" failure mode did NOT
  // apply here -- the root causes were server-side (name-only matching anchored on NOW() instead
  // of the incident's own date -- see incidents.service.ts detectPatterns) and in the Service
  // <select> having no placeholder option, which left incidentForm.house_id stuck at '' for any
  // role other than RM/TL even though a house appeared visually selected. Both are fixed; this
  // effect now also sends the incident's own occurred_at (the evidence cutoff) and each person's
  // stable id (when known) instead of name-only.
  useEffect(() => {
    if (!showCreateModal) return;
    // C1 correction: the actively selected service takes priority -- if the user switched the
    // dropdown to a different assigned service, pattern detection must follow that choice, not
    // silently stay pinned to whichever house loaded first.
    const houseId = incidentForm.house_id || userHouseId;
    if (!houseId && incidentPersons.length === 0) { setPatterns(null); setPatternsError(false); return; }
    const t = setTimeout(async () => {
      setDetecting(true);
      setPatternsError(false);
      try {
        const res = await apiClient.post('/incidents/detect-patterns', {
          house_id: houseId || undefined,
          persons_involved: incidentPersons.map((p) => ({ id: p.id, name: p.name, type: p.type })),
          occurred_at: incidentForm.occurred_at || undefined,
          type: incidentForm.type,
          severity: incidentForm.severity,
        });
        setPatterns((res.data as any)?.data ?? res.data ?? null);
      } catch { setPatterns(null); setPatternsError(true); }
      finally { setDetecting(false); }
    }, 700);
    return () => clearTimeout(t);
  }, [incidentForm.house_id, incidentPersons, incidentForm.type, incidentForm.severity, incidentForm.occurred_at, showCreateModal, userHouseId]);

  const generateNarrative = async () => {
    setNarrativeBusy(true);
    try {
      const res = await apiClient.post('/reports/narrative', {
        reportTitle: 'Serious Incident Account',
        periodLabel: incidentForm.occurred_at,
        serviceName: userHouseName || undefined,
        data: {
          title: incidentForm.title, type: incidentForm.type, severity: incidentForm.severity,
          what_happened: incidentForm.description, immediate_action: incidentForm.immediate_action,
          people_involved: incidentPersons.map((p) => `${p.name} (${p.type}; ${p.roles.map((r) => ROLE_LABEL[r]).join('/')})`).join(', ') || (noIndividualAffected ? 'No individual affected' : ''),
          location: incidentForm.location,
          warning_signals_present: incidentForm.warning_signals, risk_factors: incidentForm.risk_factors,
        },
      });
      const narrative = (res.data as any)?.data?.narrative ?? (res.data as any)?.narrative;
      if (narrative) { setIncidentForm((f: any) => ({ ...f, description: narrative })); toast.success('Narrative drafted from your notes'); }
      else toast.error('No narrative returned');
    } catch { toast.error("Couldn't generate a narrative"); }
    finally { setNarrativeBusy(false); }
  };

  // 22 Nov 2026 brief: every picker item now carries its status in the label (never hidden --
  // "include relevant unpromoted, dismissed and closed records, shown WITH their status") and is
  // shaped as {id,label} for EvidenceLinkPicker's checkbox-list UI (touch-friendly on iPad; a
  // native <select multiple> needs a Ctrl/Cmd-click gesture that doesn't exist on a touchscreen).
  const riskPickerItems = allRisks
    .filter((risk: any) => (risk.title || risk.strategic_theme || risk.risk_domain || '').toLowerCase().includes(riskSearchTerm.toLowerCase()))
    .map((risk: any) => {
      const base = risk.title || risk.strategic_theme || risk.risk_domain || 'Untitled risk';
      const statusTag = risk.status ? ` [${risk.status}]` : '';
      return { id: risk.id, label: `${base}${statusTag}` };
    });

  const escalationPickerItems = allEscalations
    .filter((esc: any) => (esc.reason || esc.description || esc.risk_title || '').toLowerCase().includes(escalationSearchTerm.toLowerCase()))
    .map((esc: any) => {
      const base = esc.reason || esc.description || esc.risk_title || 'Escalation';
      const statusTag = esc.status ? ` [${esc.status}]` : '';
      return { id: esc.id, label: `${base}${statusTag}` };
    });

  // C1 correction: unpromoted signals/patterns are deliberately NOT filtered out by status --
  // "permit multiple unpromoted source signals and relevant closed/dismissed records with
  // original reasons" -- a closed or dismissed record stays linkable, with its own status shown
  // so the reviewer sees it was closed/dismissed rather than that being hidden.
  const signalPickerItems = allSignals
    .filter((s: any) => String(s.description || s.concern || s.related_person || '').toLowerCase().includes(signalSearchTerm.toLowerCase()))
    .map((s: any) => {
      const base = s.description || s.concern || 'Signal';
      const statusTag = s.review_status && s.review_status !== 'New' ? ` [${s.review_status}]` : '';
      return { id: s.id, label: `${base}${statusTag}` };
    });
  const patternPickerItems = allPatterns
    .filter((p: any) => String(p.cluster_label || p.risk_domain || '').toLowerCase().includes(patternSearchTerm.toLowerCase()))
    .map((p: any) => ({ id: p.id, label: `${p.cluster_label || p.risk_domain || 'Pattern'} [${p.cluster_status || p.status || 'Unknown'}]` }));

  const filteredIncidents = getFilteredIncidents();
  const totalPages = Math.ceil(filteredIncidents.length / itemsPerPage);
  const paginatedIncidents = filteredIncidents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const canCreateIncident = ['REGISTERED_MANAGER', 'RESPONSIBLE_INDIVIDUAL', 'DIRECTOR', 'ADMIN', 'TEAM_LEADER'].includes(userRole);
  const houses = ['All', ...allHouses.map(h => h.name)];

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "under_review": return "bg-primary text-primary-foreground";
      case "resolved": return "bg-success text-success-foreground";
      case "closed": return "bg-muted text-muted-foreground";
      case "archived": return "bg-muted/50 text-muted-foreground";
      case "open": return "bg-warning text-warning-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <>
        <RoleBasedNavigation />
        <div className="p-6 w-full pt-20">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl  text-foreground mb-2">Serious Incidents</h1>
              <p className="text-muted-foreground">
                {userRole === 'REGISTERED_MANAGER'
                  ? `Serious incident management for ${userHouseName || 'your house'}`
                  : 'Serious incident management across all services'
                }
              </p>
              {userRole === 'REGISTERED_MANAGER' && (
                <p className="text-sm text-muted-foreground mt-1">Showing incidents for your assigned service only</p>
              )}
            </div>
            {canCreateIncident && (
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Serious Incident
              </Button>
            )}
          </div>

          {/* Filters */}
          {userRole !== 'REGISTERED_MANAGER' && (
            <Card className="border-2 border-border mb-6 bg-card shadow-sm">
              <CardContent className="p-6">
                <div className="flex gap-4 items-center">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search incidents by title, description, service, or type..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-border bg-background focus:ring-primary"
                    />
                  </div>
                  <select
                    value={houseFilter}
                    onChange={(e) => setHouseFilter(e.target.value)}
                    className="px-3 py-2 border-2 border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {houses.map(house => (
                      <option key={house} value={house}>
                        {house}
                      </option>
                    ))}
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border-2 border-border rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="All">All Statuses</option>
                    <option value="under-review">Under Review</option>
                    <option value="closed">Closed</option>
                    <option value="archived">Archived</option>
                  </select>
                  <Button variant="outline" className="border-border text-foreground hover:bg-muted">
                    <Filter className="w-4 h-4 mr-2" />
                    More Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search only for RM */}
          {userRole === 'REGISTERED_MANAGER' && (
            <Card className="border-2 border-border mb-6 bg-card shadow-sm">
              <CardContent className="p-6">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search incidents by title, description, or type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-border bg-background"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Incident List */}
          <div className="space-y-4">
            {paginatedIncidents.map((incident) => (
              <Card key={incident.id} className="border-2 border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {incident.reference && (
                          <span className="px-2 py-0.5 rounded bg-muted text-foreground text-xs font-mono font-semibold">{incident.reference}</span>
                        )}
                        <h3
                          className="text-lg  text-foreground cursor-pointer hover:underline"
                          onClick={() => navigate(`/incidents/${incident.id}`)}
                        >
                          {incident.title}
                        </h3>
                        <span className={`px-2 py-1 rounded text-[10px]  shadow-sm ${getStatusColor(incident.status)}`}>
                          {incident.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </div>

                      {incident.description && (
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{incident.description}</p>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="text-sm text-foreground">{incident.houseName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="text-sm text-foreground">{incident.incidentDate}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-warning" />
                          <span className="text-sm text-foreground">{incident.incidentType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Ambulance className="w-4 h-4 text-destructive" />
                          <span className="text-sm text-foreground ">{incident.linkedRisks} risks, {incident.linkedEscalations} escalations</span>
                        </div>
                      </div>

                      {incident.externalRefs.length > 0 && (
                        <div className="text-sm text-muted-foreground mb-3 ">
                          External Refs: <span className="text-foreground ">{incident.externalRefs.join(", ")}</span>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground border-t border-border pt-3">
                        Created on <span className="">{incident.createdAt}</span> by <span className=" text-primary">{incident.createdBy}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/incidents/${incident.id}/timeline`)}
                        className="border-primary text-primary hover:bg-primary/10 shadow-sm"
                      >
                        <Calendar className="w-4 h-4 mr-1" />
                        View Governance Timeline
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-border"
              >
                Previous
              </Button>
              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                  <Button
                    key={num}
                    variant={currentPage === num ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(num)}
                    className={currentPage === num ? "bg-primary text-primary-foreground" : "border-border"}
                  >
                    {num}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-border"
              >
                Next
              </Button>
            </div>
          )}

          {/* Add Incident Button at Bottom */}
          {canCreateIncident && filteredIncidents.length > 0 && (
            <div className="mt-8 text-center">
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 shadow-lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Serious Incident
              </Button>
            </div>
          )}

          {/* Empty State with Add Button */}
          {canCreateIncident && filteredIncidents.length === 0 && (
            <div className="text-center py-12 bg-card border-2 border-dashed border-border rounded-lg shadow-inner">
              <div className="text-muted-foreground mb-6">
                <Ambulance className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-xl  text-foreground mb-2">No incidents found</h3>
                <p>
                  {userRole === 'REGISTERED_MANAGER'
                    ? 'There are no incidents for your assigned service(s).'
                    : 'No incidents match your current filters.'
                  }
                </p>
              </div>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Serious Incident
              </Button>
            </div>
          )}

          {/* Create Serious Incident Modal */}
          {showCreateModal && (
            <div className="fixed inset-0 backdrop-blur-sm bg-primary/50 flex items-center justify-center z-50 p-4">
              <div className="bg-card border-2 border-border shadow-2xl rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 sticky top-0 bg-card pb-4 border-b border-border z-10">
                  <h2 className="text-2xl  text-foreground">Report Serious Incident</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateModal(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Incident Summary */}
                  <div className="pb-6">
                    <h3 className=" text-primary mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">1</span>
                      Incident Summary
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="incident-title" className="block text-sm  text-foreground mb-1">Incident Title *</label>
                        <Input
                          id="incident-title"
                          value={incidentForm.title}
                          onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })}
                          className="border-border bg-background focus:ring-primary rounded-lg"
                          placeholder="Brief title for this incident"
                        />
                      </div>
                      <div>
                        <label htmlFor="incident-house" className="block text-sm  text-foreground mb-1">Service *</label>
                        <select
                          id="incident-house"
                          value={incidentForm.house_id}
                          onChange={(e) => setIncidentForm({ ...incidentForm, house_id: e.target.value })}
                          className="w-full border-2 border-border rounded-lg p-2.5 bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                        >
                          {/* 22 Nov 2026 brief: this had no placeholder option, so with
                              incidentForm.house_id starting as '' (every role except RM/TL, which
                              never gets an auto-default) the browser visually highlighted the
                              first house in the list while React's bound value stayed '' --
                              looked selected, wasn't. Every service-scoped lookup downstream
                              (related-history/warning-evidence detection, the link pickers) read
                              that empty string as "no service chosen" and came back empty. */}
                          <option value="">Select service...</option>
                          {getAvailableHouses().map(house => (
                            <option key={house.id} value={house.id}>
                              {house.name}
                            </option>
                          ))}
                        </select>
                        {(userRole === 'REGISTERED_MANAGER' || userRole === 'TEAM_LEADER') && (
                          <p className="text-[11px] text-muted-foreground mt-1.5 ml-1 ">Only services you are assigned to are shown</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="incident-date" className="block text-sm  text-foreground mb-1">Incident Date & Time *</label>
                        <Input
                          id="incident-date"
                          type="datetime-local"
                          value={incidentForm.occurred_at}
                          onChange={(e) => setIncidentForm({ ...incidentForm, occurred_at: e.target.value })}
                          className="border-border bg-background focus:ring-primary rounded-lg"
                        />
                      </div>
                      <div>
                        <label htmlFor="incident-type" className="block text-sm  text-foreground mb-1">Incident Type *</label>
                        <select
                          id="incident-type"
                          value={incidentForm.type}
                          onChange={(e) => setIncidentForm({ ...incidentForm, type: e.target.value })}
                          className="w-full border-2 border-border rounded-lg p-2.5 bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                        >
                          <option value="">Select type...</option>
                          <option value="safeguarding">Safeguarding</option>
                          <option value="medication">Medication Error</option>
                          <option value="behavioral">Behavioral Incident</option>
                          <option value="environmental">Environmental Hazard</option>
                          <option value="staff">Staff Misconduct</option>
                          <option value="injury">Resident Incident</option>
                          <option value="absconding">Absconding</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="severity-level" className="block text-sm  text-foreground mb-1">Severity Level *</label>
                        <select
                          id="severity-level"
                          value={incidentForm.severity}
                          onChange={(e) => setIncidentForm({ ...incidentForm, severity: e.target.value })}
                          className="w-full border-2 border-border rounded-lg p-2.5 bg-background focus:ring-2 focus:ring-destructive focus:outline-none text-sm  text-destructive"
                        >
                          <option value="">Select severity...</option>
                          <option value="Critical">Critical</option>
                          <option value="High">Serious</option>
                          <option value="Moderate">Moderate</option>
                          <option value="Low">Minor</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 22 Nov 2026 brief (Serious Incident workflow, Step 1): "On iPad, Related
                      History and Warning Signs appear before People involved... form blocked
                      submission while no person had been added." People involved now comes
                      straight after Incident Summary and BEFORE either Related History or
                      Governance Context/Warning Signs appear at all -- the two evidence sections
                      below need to know who (or that no one) was involved to ask the right
                      question in the first place. */}
                  <div className="pb-6 border-b border-border mb-6">
                    <h3 className=" text-primary mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">2</span>
                      People Involved
                    </h3>
                    {/* C1 correction: "Record stable identity, client/staff/external/unknown
                        type and roles: affected person, witness, person alleged to have caused
                        harm, reporter or other. Permit multiple roles, no individual affected."
                        "Show directory loading/error/retry." */}
                    {peopleStatus === 'loading' && <p className="text-xs text-muted-foreground mb-2">Loading staff and service user directory…</p>}
                    {peopleStatus === 'error' && (
                      <div className="flex items-center justify-between gap-2 mb-2 text-xs bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                        <span className="text-amber-800">Could not load the directory — you can still add people by name below.</span>
                        <button type="button" onClick={loadPeopleDirectory} className="font-semibold text-amber-900 underline shrink-0">Retry</button>
                      </div>
                    )}
                    <label className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <input type="checkbox" checked={noIndividualAffected} onChange={(e) => { setNoIndividualAffected(e.target.checked); if (e.target.checked) setIncidentPersons([]); }} />
                      No individual was affected by this incident
                    </label>
                    {!noIndividualAffected && (
                      <>
                        {incidentPersons.length > 0 && (
                          <ul className="space-y-1.5 mb-2">
                            {incidentPersons.map((p, i) => (
                              <li key={i} className="flex items-center justify-between gap-2 text-xs bg-muted/50 border border-border rounded-lg px-2.5 py-1.5">
                                <span><strong>{p.name}</strong> · {p.type} · {p.roles.map((r) => ROLE_LABEL[r]).join(', ') || 'no role set'}{p.id ? ' · directory match' : ''}</span>
                                <button type="button" onClick={() => setIncidentPersons(incidentPersons.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive shrink-0">Remove</button>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="border border-border rounded-lg p-3 space-y-2">
                          <input
                            list="people-involved-options"
                            value={personDraftName}
                            onChange={(e) => setPersonDraftName(e.target.value)}
                            placeholder="Search the directory, or type a name (external/unknown person)"
                            className="w-full h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                          />
                          <datalist id="people-involved-options">
                            {people.map((p, i) => <option key={i} value={p.name}>{p.kind}</option>)}
                          </datalist>
                          <div className="flex flex-wrap gap-3 items-center">
                            <select value={personDraftType} onChange={(e) => setPersonDraftType(e.target.value as IncidentPersonType)} className="h-9 px-2 rounded-md border border-border bg-background text-xs">
                              <option value="client">Client</option>
                              <option value="staff">Staff</option>
                              <option value="external">External</option>
                              <option value="unknown">Unknown</option>
                            </select>
                            {(Object.keys(ROLE_LABEL) as IncidentPersonRole[]).map((role) => (
                              <label key={role} className="flex items-center gap-1 text-xs">
                                <input type="checkbox" checked={personDraftRoles.includes(role)}
                                  onChange={(e) => setPersonDraftRoles(e.target.checked ? [...personDraftRoles, role] : personDraftRoles.filter((r) => r !== role))} />
                                {ROLE_LABEL[role]}
                              </label>
                            ))}
                          </div>
                          <Button type="button" variant="outline" size="sm"
                            onClick={() => {
                              if (!personDraftName.trim()) { toast.error('Enter a name.'); return; }
                              if (!personDraftRoles.length) { toast.error('Select at least one role.'); return; }
                              const typedName = personDraftName.trim();
                              // 22 Nov 2026 brief: if this name resolves to a directory entry, carry its
                              // stable id through so related-history/evidence matching can use it instead
                              // of name-text equality. An external/unknown person (no record) still adds
                              // fine -- id is simply left undefined, never blocking the add.
                              const match = people.find((p) => p.name.trim().toLowerCase() === typedName.toLowerCase());
                              setIncidentPersons([...incidentPersons, {
                                id: match?.id, name: typedName, type: personDraftType, roles: personDraftRoles,
                              }]);
                              setPersonDraftName(''); setPersonDraftType('client'); setPersonDraftRoles([]);
                            }}>
                            Add person
                          </Button>
                        </div>
                      </>
                    )}
                    {noIndividualAffected && (
                      <p className="text-xs text-muted-foreground border-2 border-dashed border-border rounded-lg px-3 py-2">
                        No individual recorded — the history below will show service-level evidence only.
                      </p>
                    )}
                    {people.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1">{people.filter(p => p.kind === 'Service User').length} service users · {people.filter(p => p.kind === 'Staff').length} staff available</p>
                    )}
                  </div>

                  {/* 22 Nov 2026 brief: "Related History" moved after People Involved, so it can
                      show PERSON-SPECIFIC evidence once someone's on record, or SERVICE-LEVEL
                      evidence when "no individual affected" was confirmed -- the two are labelled
                      separately below rather than merged into one undifferentiated list. */}
                  {(detecting || patterns || patternsError) && (
                    <div className={`rounded-lg border-2 p-4 mb-6 ${patterns?.recurring ? 'border-amber-500/40 bg-amber-500/10' : 'border-border bg-muted/40'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className={`w-4 h-4 ${patterns?.recurring ? 'text-amber-600' : 'text-muted-foreground'}`} />
                        <span className="text-sm font-semibold text-foreground">
                          {detecting ? 'Checking for related history…'
                            : patternsError ? 'Related history'
                            : patterns?.recurring ? 'This may be a recurring concern'
                            : 'Related history'}
                        </span>
                      </div>
                      {/* "Unavailable" (the lookup failed) is never shown as if it were "no
                          matches" (the lookup ran and genuinely found nothing). */}
                      {patternsError && !detecting && (
                        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                          Unavailable — related history couldn't be checked. This does not mean none exists; you can still submit and link evidence manually below.
                        </p>
                      )}
                      {patterns && !patternsError && (
                        <div className="space-y-3 text-sm">
                          <div>
                            <p className="text-xs font-medium text-foreground mb-1">Service-level history (this service, last 12 months)</p>
                            {(patterns.similar_incidents?.length > 0) ? (
                              <div className="space-y-1">
                                {patterns.similar_incidents.slice(0, 3).map((s: any) => (
                                  <button key={s.id} type="button" onClick={() => navigate(`/incidents/${s.id}`)} className="block text-left text-primary hover:underline text-xs">
                                    {s.reference ? `${s.reference} · ` : ''}{s.title} {s.person_match ? '· same person' : ''} ({new Date(s.occurred_at).toLocaleDateString('en-GB')})
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No closely related incidents at this service in the last 12 months.</p>
                            )}
                          </div>
                          {!noIndividualAffected && (
                            <div>
                              <p className="text-xs font-medium text-foreground mb-1">Person-specific signals (last 6 months)</p>
                              {(patterns.related_signals?.length > 0) ? (
                                <p className="text-xs text-muted-foreground">
                                  {patterns.related_signals.length} recent signal(s) for the people involved, recorded before this incident — this incident may be the culmination of a forming pattern.
                                </p>
                              ) : (
                                <p className="text-xs text-muted-foreground">No signals recorded for the people involved before this incident.</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Governance Context */}
                  <div className="pb-6 border-b border-border mb-6">
                    <h3 className=" text-primary mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs">3</span>
                      Governance Context
                    </h3>
                    <div className="space-y-4">
                      <div>
                        {/* 22 Nov 2026 brief: "Ask about warning signs AFTER history is shown" --
                            this question now sits below the Related History block above instead
                            of above it, so the reporter answers with that evidence already in
                            view. It also gets an explicit "Not known yet" option with a free-text
                            reason, instead of forcing a yes/no/partial guess. */}
                        <label htmlFor="warning-signals" className="block text-sm  text-foreground mb-1">Were warning signals present before this incident? *</label>
                        <select
                          id="warning-signals"
                          value={incidentForm.warning_signals}
                          onChange={(e) => setIncidentForm({ ...incidentForm, warning_signals: e.target.value })}
                          className="w-full border-2 border-border rounded-lg p-2.5 bg-background focus:ring-2 focus:ring-primary focus:outline-none text-sm"
                        >
                          <option value="">Select...</option>
                          <option value="yes">Yes - risks were identified</option>
                          <option value="no">No - incident was unexpected</option>
                          <option value="partial">Partial - some indicators present</option>
                          <option value="unknown">Not known yet</option>
                        </select>
                        {incidentForm.warning_signals === 'unknown' && (
                          <textarea
                            value={incidentForm.warning_signals_reason}
                            onChange={(e) => setIncidentForm({ ...incidentForm, warning_signals_reason: e.target.value })}
                            className="w-full mt-2 border-2 border-border rounded p-2 h-16 resize-none text-sm"
                            placeholder="Why isn't this known yet (e.g. investigation not started, awaiting records)?"
                          />
                        )}
                      </div>
                      {/* 22 Nov 2026 brief: "Allow direct reporting even when there is no prior
                          record to link to" -- none of the pickers below are required, and a
                          genuinely empty ("no matches") list never blocks the Add person/Submit
                          flow above or below it. */}
                      <EvidenceLinkPicker
                        label="Link to Existing Risk Register Items"
                        hint="Includes closed/mitigated risks, shown with their status — tap to select, no modifier key needed."
                        searchTerm={riskSearchTerm}
                        onSearchChange={setRiskSearchTerm}
                        status={risksStatus}
                        items={riskPickerItems}
                        selectedIds={incidentForm.linked_risks || []}
                        onToggle={(id) => setIncidentForm((prev: any) => {
                          const current: string[] = prev.linked_risks || [];
                          return { ...prev, linked_risks: current.includes(id) ? current.filter((v) => v !== id) : [...current, id] };
                        })}
                        onRetry={() => loadLinkableEvidence(incidentForm.house_id || userHouseId || '')}
                        emptyHint="No matching risk register items found for this service."
                      />
                      <EvidenceLinkPicker
                        label="Link to Escalations"
                        searchTerm={escalationSearchTerm}
                        onSearchChange={setEscalationSearchTerm}
                        status={escalationsStatus}
                        items={escalationPickerItems}
                        selectedIds={incidentForm.linked_escalations || []}
                        onToggle={(id) => setIncidentForm((prev: any) => {
                          const current: string[] = prev.linked_escalations || [];
                          return { ...prev, linked_escalations: current.includes(id) ? current.filter((v) => v !== id) : [...current, id] };
                        })}
                        onRetry={() => loadLinkableEvidence(incidentForm.house_id || userHouseId || '')}
                        emptyHint="No matching escalations found for this service."
                      />
                      <EvidenceLinkPicker
                        label="Link to Signals (including unpromoted)"
                        hint="Includes signals never promoted to a risk — a dismissed or closed signal is still selectable, with its status shown."
                        searchTerm={signalSearchTerm}
                        onSearchChange={setSignalSearchTerm}
                        status={signalsStatus}
                        items={signalPickerItems}
                        selectedIds={incidentForm.linked_signals || []}
                        onToggle={(id) => setIncidentForm((prev: any) => {
                          const current: string[] = prev.linked_signals || [];
                          return { ...prev, linked_signals: current.includes(id) ? current.filter((v) => v !== id) : [...current, id] };
                        })}
                        onRetry={() => loadLinkableEvidence(incidentForm.house_id || userHouseId || '')}
                        emptyHint="No matching signals found for this service."
                      />
                      <EvidenceLinkPicker
                        label="Link to Patterns"
                        searchTerm={patternSearchTerm}
                        onSearchChange={setPatternSearchTerm}
                        status={patternsStatus}
                        items={patternPickerItems}
                        selectedIds={incidentForm.linked_patterns || []}
                        onToggle={(id) => setIncidentForm((prev: any) => {
                          const current: string[] = prev.linked_patterns || [];
                          return { ...prev, linked_patterns: current.includes(id) ? current.filter((v) => v !== id) : [...current, id] };
                        })}
                        onRetry={() => loadLinkableEvidence(incidentForm.house_id || userHouseId || '')}
                        emptyHint="No matching patterns found for this service."
                      />
                    </div>
                  </div>

                  {/* Incident Details */}
                  <div className="border-b border-border pb-6">
                    <h3 className=" text-foreground mb-4">Incident Details</h3>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label htmlFor="incident-description" className="block text-sm text-foreground">Incident Description *</label>
                          <button
                            type="button"
                            onClick={generateNarrative}
                            disabled={narrativeBusy}
                            className="text-xs text-primary font-medium hover:underline disabled:opacity-50"
                          >
                            {narrativeBusy ? 'Drafting…' : '✨ Draft narrative from notes'}
                          </button>
                        </div>
                        <textarea
                          id="incident-description"
                          value={incidentForm.description}
                          onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                          className="w-full border-2 border-border rounded p-2 h-24 resize-none"
                          placeholder="Jot the key points, then use “Draft narrative from notes” to expand into a formal account — or write it yourself."
                        />
                      </div>
                      <div>
                        <label htmlFor="immediate-actions" className="block text-sm  text-foreground mb-1">Immediate Actions Taken</label>
                        <textarea
                          id="immediate-actions"
                          value={incidentForm.immediate_action}
                          onChange={(e) => setIncidentForm({ ...incidentForm, immediate_action: e.target.value })}
                          className="w-full border-2 border-border rounded p-2 h-20 resize-none"
                          placeholder="Describe immediate response and actions taken..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm  text-foreground mb-1">Place of occurence</label>
                        <Input
                          value={incidentForm.location}
                          onChange={(e) => setIncidentForm({ ...incidentForm, location: e.target.value })}
                          placeholder="Location of the incident"
                          className="border-border"
                        />
                      </div>
                    </div>
                  </div>

                  {/* External References */}
                  <div className="border-b border-border pb-6">
                    <h3 className=" text-foreground mb-4">External References</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm  text-foreground mb-1">Local Authority Referral</label>
                        <Input
                          placeholder="LA safeguarding reference number (if applicable)"
                          className="border-border"
                          value={incidentForm.la_referral}
                          onChange={(e) => setIncidentForm({ ...incidentForm, la_referral: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm  text-foreground mb-1">CQC Notification</label>
                        <Input
                          placeholder="CQC notification reference (if applicable)"
                          className="border-border"
                          value={incidentForm.cqc_notification}
                          onChange={(e) => setIncidentForm({ ...incidentForm, cqc_notification: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm  text-foreground mb-1">Police Reference</label>
                        <Input
                          placeholder="Police reference number (if applicable)"
                          className="border-border"
                          value={incidentForm.police_reference}
                          onChange={(e) => setIncidentForm({ ...incidentForm, police_reference: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-sm  text-foreground mb-1">Other External References</label>
                        <Input
                          placeholder="Any other external reference numbers"
                          className="border-border"
                          value={incidentForm.other_references}
                          onChange={(e) => setIncidentForm({ ...incidentForm, other_references: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Leadership Assessment */}
                  <div className="pb-6">
                    <h3 className=" text-foreground mb-4">Leadership Assessment</h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="is-foreseeable" className="block text-sm  text-foreground mb-1">Was this incident foreseeable?</label>
                        <select 
                          id="is-foreseeable"
                          className="w-full border-2 border-border rounded p-2"
                          value={incidentForm.is_foreseeable}
                          onChange={(e) => setIncidentForm({ ...incidentForm, is_foreseeable: e.target.value })}
                        >
                          <option value="">Select...</option>
                          <option value="yes">Yes - risks were known</option>
                          <option value="no">No - unexpected event</option>
                          <option value="partially">Partially foreseeable</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="risk-factors" className="block text-sm  text-foreground mb-1">Related Risk Factors</label>
                        <textarea
                          id="risk-factors"
                          className="w-full border-2 border-border rounded p-2 h-20 resize-none"
                          placeholder="Any risk factors that contributed to this incident..."
                          value={incidentForm.risk_factors}
                          onChange={(e) => setIncidentForm({ ...incidentForm, risk_factors: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor="preventive-measures" className="block text-sm  text-foreground mb-1">Preventive Measures Needed</label>
                        <textarea
                          id="preventive-measures"
                          className="w-full border-2 border-border rounded p-2 h-20 resize-none"
                          placeholder="Measures needed to prevent similar incidents..."
                          value={incidentForm.preventive_measures}
                          onChange={(e) => setIncidentForm({ ...incidentForm, preventive_measures: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor="leadership-commentary" className="block text-sm  text-foreground mb-1">Leadership Commentary</label>
                        <textarea
                          id="leadership-commentary"
                          className="w-full border-2 border-border rounded p-2 h-20 resize-none"
                          placeholder="Leadership perspective on the incident and implications..."
                          value={incidentForm.leadership_commentary}
                          onChange={(e) => setIncidentForm({ ...incidentForm, leadership_commentary: e.target.value })}
                        />
                      </div>
                      <div>
                        <label htmlFor="lessons-learned" className="block text-sm  text-foreground mb-1">Lessons Learned</label>
                        <textarea
                          id="lessons-learned"
                          className="w-full border-2 border-border rounded p-2 h-20 resize-none"
                          placeholder="What has the service learned, and what will change as a result?"
                          value={incidentForm.lessons_learned}
                          onChange={(e) => setIncidentForm({ ...incidentForm, lessons_learned: e.target.value })}
                        />
                        <label className="flex items-center gap-2 mt-2 text-sm text-foreground">
                          <input type="checkbox" checked={!!incidentForm.learning_shared}
                            onChange={(e) => setIncidentForm({ ...incidentForm, learning_shared: e.target.checked })} />
                          This learning has been shared with the team
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Recommended actions (auto-created on submit) */}
                  {patterns?.recommended_actions?.length > 0 && (
                    <div className="pb-6">
                      <h3 className="text-foreground mb-2 font-medium">Recommended follow-up actions</h3>
                      <p className="text-xs text-muted-foreground mb-3">These will be created automatically as tracked actions on this incident when you submit.</p>
                      <ul className="space-y-1.5">
                        {patterns.recommended_actions.map((a: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />{a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Reporting Information */}
                  <div className="pb-6">
                    <h3 className=" text-foreground mb-4">Reporting Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm  text-foreground mb-1">Your Name *</label>
                        <Input
                          placeholder="Your full name"
                          className="border-border bg-muted cursor-not-allowed"
                          value={userName}
                          readOnly
                        />
                      </div>
                      <div>
                        <label className="block text-sm  text-foreground mb-1">Your Role *</label>
                        <Input
                          placeholder="Your role"
                          className="border-border bg-muted cursor-not-allowed"
                          value={userRole.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-8 pt-6 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="border-border text-foreground hover:bg-muted flex-1 py-6 rounded-lg "
                  >
                    Discard Changes
                  </Button>
                  <Button
                    onClick={handleCreateIncident}
                    disabled={isSubmitting}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 py-6 rounded-lg  shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? 'Reporting...' : 'Submit Serious Incident'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    </div>
  );
}
