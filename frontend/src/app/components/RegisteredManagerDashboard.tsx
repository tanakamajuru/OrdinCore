import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { Ambulance, Plus, AlertTriangle, Activity, Shield, FileText } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";



export function RegisteredManagerDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(1);
  const [house, setHouse] = useState<any>(null);
  const [isDeputyCover, setIsDeputyCover] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Oversight Data
  const [highPrioritySignals, setHighPrioritySignals] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [riskCandidates, setRiskCandidates] = useState<any[]>([]);
  const [openActions, setOpenActions] = useState<any[]>([]);
  const [effectivenessUpdates, setEffectivenessUpdates] = useState<any[]>([]);
  const [dailyNote, setDailyNote] = useState("");
  const [isSigningOff, setIsSigningOff] = useState(false);

  const [completedSection, setCompletedSection] = useState(0);
  const [riQueries, setRiQueries] = useState<any[]>([]);

  useEffect(() => { loadOversightData(); }, []);

  const loadOversightData = async () => {
    try {
      setIsLoading(true);
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : {};
      const userId = user.id;

      // 1. Determine House & Deputy Status
      const housesRes = await apiClient.get(`/users/${userId}/houses`);
      const houses = housesRes.data?.data || housesRes.data || [];
      const myHouse = houses[0];
      
      if (myHouse) {
        setHouse(myHouse);
        setIsDeputyCover(myHouse.deputy_rm_id === userId);
        const hid = myHouse.id;

        // 2. Fetch Oversight Board Sections & RI Queries
        const [signalsRes, clustersRes, candidatesRes, actionsRes, effRes, queriesRes] = await Promise.all([
          apiClient.get(`/pulses?house_id=${hid}&severity=High,Critical&review_status=New`),
          apiClient.get(`/governance/clusters?house_id=${hid}&status=Emerging`),
          apiClient.get(`/governance/risk-candidates?house_id=${hid}&status=New`),
          apiClient.get(`/risks/actions?house_id=${hid}&status=Open`),
          apiClient.get(`/governance/action-effectiveness?house_id=${hid}&limit=5`),
          apiClient.get(`/ri-governance/rm/queries?house_id=${hid}`)
        ]);

        setHighPrioritySignals(signalsRes.data?.pulses || signalsRes.data?.items || []);
        setClusters(clustersRes.data?.data || []);
        setRiskCandidates(candidatesRes.data?.data || []);
        setOpenActions(actionsRes.data?.data || []);
        setEffectivenessUpdates(effRes.data?.data || []);
        setRiQueries(queriesRes.data?.data || []);
      }
    } catch (err) {
      console.error('Oversight load error:', err);
      toast.error('Failed to load oversight board data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQueryResponse = async (queryId: string) => {
    const response = window.prompt("Enter your formal justification/response to the RI:");
    if (!response) return;

    try {
        await apiClient.post(`/ri-governance/queries/${queryId}/respond`, { response_text: response });
        toast.success("Response submitted to RI");
        loadOversightData();
    } catch (err) {
        toast.error("Failed to submit response");
    }
  };

  const handleSignOff = async () => {
    if (!dailyNote.trim()) {
      toast.error("Section 5: Daily Clinical Note is mandatory for sign-off.");
      return;
    }
    setIsSigningOff(true);
    try {
      // 1. Open/Find today's log
      const openRes = await apiClient.post('/governance/daily-log/open', { house_id: house.id });
      const logId = openRes.data?.data?.id;
      
      // 2. Complete the log
      await apiClient.post(`/governance/daily-log/${logId}/complete`, { 
        note: dailyNote,
        is_deputy_review: isDeputyCover
      });
      
      toast.success('Daily Governance Signed Off Successfully');
      loadOversightData();
      setActiveSection(1);
      setCompletedSection(0);
    } catch (err) {
      toast.error('Sign-off failed');
    } finally {
      setIsSigningOff(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
      <span className="font-black uppercase italic tracking-tighter">Syncing Oversight Board...</span>
    </div>
  );

  const sectionClass = "bg-white border-4 border-black p-8 shadow-[12px_12px_0px_rgba(0,0,0,1)]";
  const titleClass = "text-3xl font-black uppercase italic text-primary mb-6 tracking-tighter flex items-center gap-3";
  const badgeClass = "bg-black text-white px-3 py-1 text-xs font-black uppercase italic tracking-widest";

  const hasSafeguardingOverride = isDeputyCover && highPrioritySignals.length > 0;

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      <RoleBasedNavigation />
      
      {/* RI Governance Queries Alert */}
      {riQueries.length > 0 && (
        <div className="p-6 w-full max-w-6xl mx-auto mt-8">
            <div className="border-4 border-black bg-white shadow-[8px_8px_0px_rgba(255,0,0,1)] p-6">
                <div className="flex items-center gap-3 mb-6 text-destructive">
                    <Shield className="w-8 h-8" />
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Outstanding RI Governance Queries</h2>
                </div>
                <div className="space-y-4">
                    {riQueries.map(q => (
                        <div key={q.id} className="p-6 border-4 border-black bg-muted/10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="max-w-[80%]">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">WE: {new Date(q.week_ending).toLocaleDateString()} | Review Forensic Query</span>
                                    <p className="text-lg font-bold italic">"{q.query_text}"</p>
                                </div>
                                <button 
                                    onClick={() => handleQueryResponse(q.id)}
                                    className="bg-black text-white px-6 py-3 font-black uppercase italic tracking-widest hover:bg-primary transition-all"
                                >
                                    Justify
                                </button>
                            </div>
                            <div className="bg-white border-2 border-black p-4 italic text-xs text-muted-foreground">
                                <span className="block font-black uppercase not-italic text-[9px] mb-1">Your Narrative context</span>
                                {q.governance_narrative}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      <div className={`p-6 w-full ${isDeputyCover || riQueries.length > 0 ? 'pt-8' : 'pt-24'} max-w-6xl mx-auto`}>
        
        {/* Progress Indicator */}
        <div className="mb-12 flex justify-between items-center relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-black/10 -translate-y-1/2 -z-10" />
          {[
            { id: 1, name: 'Triage' },
            { id: 2, name: 'Patterns' },
            { id: 3, name: 'Candidates' },
            { id: 4, name: 'Effectiveness' },
            { id: 5, name: 'Sign-Off' }
          ].map(s => (
            <div key={s.id} className="flex flex-col items-center gap-2">
              <button 
                onClick={() => {
                   if (s.id <= completedSection + 1) setActiveSection(s.id);
                }}
                disabled={s.id > completedSection + 1}
                className={`w-12 h-12 flex items-center justify-center border-4 border-black font-black transition-all ${
                  activeSection === s.id ? 'bg-primary text-white shadow-[4px_4px_0px_rgba(0,0,0,1)]' : 
                  s.id <= completedSection ? 'bg-black text-white' : 'bg-white text-black/20'
                }`}
              >
                {s.id <= completedSection ? '✓' : s.id}
              </button>
              <span className={`text-[10px] font-black uppercase tracking-widest ${activeSection === s.id ? 'text-primary' : 'text-muted-foreground'}`}>
                {s.name}
              </span>
            </div>
          ))}
        </div>

        <div className="mb-8 flex justify-between items-end border-b-8 border-black pb-8">
          <div>
            <h1 className="text-6xl font-black uppercase italic tracking-tighter text-primary">Daily Oversight</h1>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-muted-foreground mt-2">
              Service: {house?.name} | {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex gap-2">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Oversight Sequence Enforcement Active</span>
          </div>
        </div>

        {/* Active Section Content */}
        <div className="min-h-[500px]">
          {activeSection === 1 && (
            <div className={sectionClass}>
              <h2 className={titleClass}><AlertTriangle className="w-8 h-8"/> 1: High Priority Triage</h2>
              <div className="space-y-4">
                {highPrioritySignals.length > 0 ? highPrioritySignals.map(s => (
                  <div key={s.id} className="p-6 border-4 border-black bg-muted/20 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-destructive text-white px-3 py-1 text-[10px] font-black uppercase italic tracking-widest">{s.severity}</span>
                        <span className={badgeClass}>{s.signal_type}</span>
                        <span className="text-xs font-bold text-muted-foreground italic">{new Date(s.entry_date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xl font-bold italic tracking-tight">{s.description}</p>
                    </div>
                    <button 
                      onClick={() => navigate(`/signals/${s.id}`)}
                      className="bg-black text-white px-8 py-3 font-black uppercase italic tracking-widest hover:bg-primary transition-all shadow-[4px_4px_0px_rgba(255,0,0,1)]"
                    >
                      Review
                    </button>
                  </div>
                )) : (
                  <div className="py-20 text-center border-4 border-dashed border-black">
                     <p className="text-2xl font-black uppercase italic text-muted-foreground">All Priority Signals Triaged</p>
                     <button 
                      onClick={() => { setCompletedSection(Math.max(completedSection, 1)); setActiveSection(2); }}
                      className="mt-6 px-10 py-4 bg-primary text-white font-black uppercase italic tracking-widest shadow-[8px_8px_0px_rgba(0,0,0,1)]"
                    >
                      Next: Patterns
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 2 && (
            <div className={sectionClass}>
              <h2 className={titleClass}><Activity className="w-8 h-8"/> 2: Pattern Signal Clusters</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {clusters.length > 0 ? clusters.map(c => (
                   <div key={c.id} className="p-6 border-4 border-black">
                      <div className="flex justify-between items-start mb-4">
                         <span className={badgeClass}>{c.risk_domain}</span>
                         <span className="font-black italic text-destructive text-xl">{c.signal_count}x</span>
                      </div>
                      <h3 className="text-lg font-black uppercase italic mb-2">{c.cluster_label}</h3>
                      <div className="bg-black h-2 w-full mb-4">
                         <div className="bg-primary h-full" style={{ width: `${Math.min(c.signal_count * 20, 100)}%` }}></div>
                      </div>
                      <button 
                        onClick={() => navigate(`/governance/clusters/${c.id}`)}
                        className="w-full py-3 border-2 border-black font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all"
                      >
                        Analyse Cluster
                      </button>
                   </div>
                 )) : (
                    <div className="col-span-2 py-20 text-center border-4 border-dashed border-black">
                      <p className="text-2xl font-black uppercase italic text-muted-foreground">No emerging patterns requiring review</p>
                      <button 
                        onClick={() => { setCompletedSection(Math.max(completedSection, 2)); setActiveSection(3); }}
                        className="mt-6 px-10 py-4 bg-primary text-white font-black uppercase italic tracking-widest shadow-[8px_8px_0px_rgba(0,0,0,1)]"
                      >
                        Next: Candidates
                      </button>
                    </div>
                 )}
              </div>
            </div>
          )}

          {activeSection === 3 && (
            <div className={sectionClass}>
              <h2 className={titleClass}><Shield className="w-8 h-8"/> 3: Risk Candidates</h2>
              <div className="space-y-4">
                {riskCandidates.length > 0 ? riskCandidates.map(rc => (
                  <div key={rc.id} className="p-6 border-4 border-black bg-destructive/5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="bg-destructive text-white px-3 py-1 text-[10px] font-black uppercase italic tracking-widest mb-2 inline-block">
                          {rc.candidate_type}
                        </span>
                        <h3 className="text-2xl font-black uppercase italic tracking-tighter">{rc.risk_domain} Risk Candidate</h3>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] font-black uppercase text-muted-foreground">Detected</span>
                        <span className="font-bold">{new Date(rc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => navigate(`/risk-promotion?candidate_id=${rc.id}`)}
                        className="flex-1 py-4 bg-destructive text-white font-black uppercase italic tracking-widest hover:bg-black transition-all shadow-[4px_4px_0px_rgba(0,0,0,1)]"
                      >
                        Promote to Risk Register
                      </button>
                      <button className="px-8 py-4 border-4 border-black font-black uppercase italic tracking-widest hover:bg-muted transition-all">
                        Dismiss
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center border-4 border-dashed border-black">
                    <p className="text-2xl font-black uppercase italic text-muted-foreground">No pending risk candidates</p>
                    <button 
                      onClick={() => { setCompletedSection(Math.max(completedSection, 3)); setActiveSection(4); }}
                      className="mt-6 px-10 py-4 bg-primary text-white font-black uppercase italic tracking-widest shadow-[8px_8px_0px_rgba(0,0,0,1)]"
                    >
                      Next: Effectiveness
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 4 && (
            <div className={sectionClass}>
              <h2 className={titleClass}><FileText className="w-8 h-8"/> 4: Actions & Effectiveness</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                 <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-4 text-muted-foreground">Open Mitigation Actions</h3>
                    <div className="space-y-4">
                       {openActions.map(a => (
                         <div key={a.id} className="p-4 border-2 border-black">
                            <p className="font-black italic">{a.title}</p>
                            <p className="text-[10px] font-black uppercase text-muted-foreground">Due: {new Date(a.due_date).toLocaleDateString()}</p>
                         </div>
                       ))}
                    </div>
                 </div>
                 <div>
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] mb-4 text-muted-foreground">Recent Effectiveness Outcomes</h3>
                    <div className="space-y-4">
                       {effectivenessUpdates.map(e => (
                         <div key={e.id} className={`p-4 border-2 border-black ${
                           e.outcome === 'Effective' ? 'bg-success/10 border-success' : 
                           e.outcome === 'Ineffective' ? 'bg-destructive/10 border-destructive' : 'bg-muted/20'
                         }`}>
                            <div className="flex justify-between items-center mb-1">
                               <p className="font-black italic uppercase text-xs">{e.risk_domain}</p>
                               <span className={`text-[10px] font-black uppercase px-2 py-0.5 ${
                                 e.outcome === 'Effective' ? 'bg-success text-white' : 
                                 e.outcome === 'Ineffective' ? 'bg-destructive text-white' : 'bg-black text-white'
                               }`}>{e.outcome}</span>
                            </div>
                            <p className="text-[10px] font-bold text-muted-foreground">Based on post-action signal frequency</p>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
              <div className="text-center">
                <button 
                  onClick={() => { setCompletedSection(Math.max(completedSection, 4)); setActiveSection(5); }}
                  className="px-10 py-4 bg-primary text-white font-black uppercase italic tracking-widest shadow-[8px_8px_0px_rgba(0,0,0,1)]"
                >
                  Next: Sign-Off
                </button>
              </div>
            </div>
          )}

          {activeSection === 5 && (
            <div className={sectionClass}>
              <h2 className={titleClass}><Plus className="w-8 h-8"/> 5: Close Loop & Sign-Off</h2>
              
              {hasSafeguardingOverride && (
                <div className="p-6 border-4 border-destructive bg-destructive/10 mb-8 animate-pulse">
                   <p className="text-destructive font-black uppercase italic text-lg mb-2">SAFEGUARDING OVERRIDE DETECTED</p>
                   <p className="font-bold text-sm">
                     High/Critical signals exist while Deputy RM is reviewing. 
                     Signing off will trigger an IMMEDIATE director notification and 
                     flag this log for ENHANCED OVERSIGHT.
                   </p>
                </div>
              )}

              <div className="mb-8">
                <label className="block mb-4 text-sm font-black uppercase tracking-widest text-muted-foreground">Daily Governance Narrative (Mandatory)</label>
                <textarea 
                  value={dailyNote}
                  onChange={e => setDailyNote(e.target.value)}
                  className="w-full h-64 p-6 border-4 border-black text-xl font-medium focus:outline-none focus:ring-0 shadow-[8px_8px_0px_rgba(0,0,0,1)]"
                  placeholder="Considering all triage, clusters, and candidates above—what is the service position today?"
                />
              </div>
              <div className="p-6 border-4 border-black bg-black text-white mb-8">
                 <p className="font-black uppercase italic text-lg mb-2 underline decoration-primary decoration-4 underline-offset-4">Governance Attestation</p>
                 <p className="font-bold opacity-80 text-sm">
                   I {isDeputyCover ? 'as Deputy RM ' : ''}hereby certify that I have reviewed all mandatory oversight sections for {house?.name} today. 
                   All high-priority signals have been triaged, and risk candidates have been evaluated. 
                   This entry constitutes a forensic audit point for CQC Well-Led inspections.
                 </p>
              </div>
              <button 
                onClick={handleSignOff}
                disabled={isSigningOff || !dailyNote.trim()}
                className="w-full py-6 bg-primary text-white font-black uppercase italic text-2xl tracking-widest shadow-[12px_12px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50"
              >
                {isSigningOff ? 'SIGNING OFF...' : 'SIGN-OFF DAILY GOVERNANCE'}
              </button>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="mt-12 flex justify-between items-center pb-20">
           <button 
            onClick={() => setActiveSection(prev => Math.max(1, prev - 1))}
            disabled={activeSection === 1}
            className="px-10 py-4 border-4 border-black font-black uppercase italic tracking-widest disabled:opacity-20"
           >
             Previous
           </button>
           <button 
            onClick={() => {
              if (activeSection <= completedSection) {
                setActiveSection(prev => Math.min(5, prev + 1));
              } else {
                toast.error(`Complete Section ${activeSection} to unlock the next phase.`);
              }
            }}
            disabled={activeSection === 5}
            className="px-10 py-4 bg-black text-white font-black uppercase italic tracking-widest disabled:opacity-20 shadow-[6px_6px_0px_rgba(255,0,0,1)]"
           >
             Next
           </button>
        </div>
      </div>
    </div>
  );
}
