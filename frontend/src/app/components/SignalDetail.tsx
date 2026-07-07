import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, AlertCircle, Shield, Clock, User, AlertTriangle } from "lucide-react";
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
  const [teamLeaders, setTeamLeaders] = useState<TeamLeaderOption[]>([]);
  const [reassigning, setReassigning] = useState(false);
  const [promoting, setPromoting] = useState(false);
  // Eligibility for direct single-signal promotion: High/Critical, or Safeguarding.
  const domainLabel = signal ? (Array.isArray(signal.risk_domain) ? signal.risk_domain[0] : signal.risk_domain) : '';
  const promotable = !!signal && (
    ['High', 'Critical'].includes(signal.severity) ||
    String(domainLabel || '').toLowerCase().includes('safeguard') ||
    String(signal.signal_type || '').toLowerCase().includes('safeguard')
  );
  const canAllocate = user?.role === 'TEAM_LEADER' || user?.role === 'REGISTERED_MANAGER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (id) {
      loadSignalDetails(id);
    }
  }, [id]);

  useEffect(() => {
    if (!canAllocate) return;
    (async () => {
      try {
        const res = await apiClient.get('/users?role=TEAM_LEADER&limit=100&status=active');
        const list = (res.data as any).data?.users ?? (res.data as any).data ?? [];
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
      <div className="p-6 w-full pt-20 max-w-4xl mx-auto">
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
                <h3 className="text-xs  text-muted-foreground uppercase mb-1">Escalation</h3>
                <p className="text-lg  text-foreground">{signal.escalation_required || 'None'}</p>
            </div>
            <div className="bg-card border-2 border-border p-4">
                <h3 className="text-xs  text-muted-foreground uppercase mb-1">Related Person</h3>
                <p className="text-lg  text-foreground">{signal.related_person || 'N/A'}</p>
            </div>
        </div>

        <div className="space-y-6 pb-20">
            <div className="bg-card border-2 border-border p-6">
                <h2 className="text-xl  flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-primary" />
                    Observation Details
                </h2>
                <div className="bg-muted p-4 border-l-4 border-primary">
                    <p className="text-foreground text-lg">{signal.description}</p>
                </div>
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
                  <p className="text-lg ">{signal.pattern_concern || "None"}</p>
               </div>
               <div>
                  <h3 className="text-sm  text-muted-foreground uppercase">Happened Before</h3>
                  <p className="text-lg ">{signal.has_happened_before || "No"}</p>
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
                      This signal builds toward its <span className="font-medium text-foreground">pattern</span>. Promote from the cluster once it reaches the threshold — only High/Critical or Safeguarding signals can become a risk on their own.
                    </p>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
