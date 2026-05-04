import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { Ambulance, Plus, AlertTriangle, Activity, Shield, FileText } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

export function RegisteredManagerOversightBoard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(1);
  const [house, setHouse] = useState<any>(null);
  const [isDeputyCover, setIsDeputyCover] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Oversight Data
  const [highPrioritySignals, setHighPrioritySignals] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [riskCandidates, setRiskCandidates] = useState<any[]>([]);
  const [candidatePage, setCandidatePage] = useState(1);
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [candidateFilter, setCandidateFilter] = useState<'New' | 'Dismissed'>('New');
  const [openActions, setOpenActions] = useState<any[]>([]);
  const [effectivenessUpdates, setEffectivenessUpdates] = useState<any[]>([]);
  const [dailyNote, setDailyNote] = useState("");
  const [isSigningOff, setIsSigningOff] = useState(false);

  const [completedSection, setCompletedSection] = useState(0);
  const [riQueries, setRiQueries] = useState<any[]>([]);
  const [availableHouses, setAvailableHouses] = useState<any[]>([]);

  useEffect(() => { loadOversightData(); }, []);

  const loadOversightData = async (selectedHouseId?: string) => {
    try {
      setIsLoading(true);
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : {};
      const userId = user.id;

      // 1. Determine House & Deputy Status
      const housesRes = await apiClient.get(`/users/${userId}/houses`);
      const houses = housesRes.data?.data || housesRes.data || [];
      setAvailableHouses(houses);
      
      const myHouse = selectedHouseId ? houses.find((h: any) => h.id === selectedHouseId) : houses[0];
      
      if (myHouse) {
        setHouse(myHouse);
        setIsDeputyCover(myHouse.deputy_rm_id === userId);
        const hid = myHouse.id;

        // 2. Fetch Oversight Board Sections & RI Queries
        const [signalsRes, clustersRes, candidatesRes, actionsRes, effRes, queriesRes] = await Promise.all([
          apiClient.get(`/pulses?house_id=${hid}&severity=High,Critical&review_status=New`),
          apiClient.get(`/governance/clusters?house_id=${hid}&status=Emerging`),
          apiClient.get(`/governance/risk-candidates?house_id=${hid}&status=New&page=1&limit=5`),
          apiClient.get(`/risks/actions?house_id=${hid}&status=Open`),
          apiClient.get(`/governance/action-effectiveness?house_id=${hid}&limit=5`),
          apiClient.get(`/ri-governance/rm/queries?house_id=${hid}`)
        ]);

        setHighPrioritySignals(signalsRes.data?.pulses || signalsRes.data?.items || (Array.isArray(signalsRes.data) ? signalsRes.data : []));
        setClusters(Array.isArray(clustersRes.data) ? clustersRes.data : clustersRes.data?.data || []);
        
        const candidateData = candidatesRes.data?.data || (Array.isArray(candidatesRes.data) ? candidatesRes.data : []);
        setRiskCandidates(candidateData);
        setTotalCandidates(candidatesRes.data?.meta?.total || candidateData.length);
        setCandidatePage(1);

        setOpenActions(Array.isArray(actionsRes.data) ? actionsRes.data : actionsRes.data?.data || []);
        setEffectivenessUpdates(Array.isArray(effRes.data) ? effRes.data : effRes.data?.data || []);
        setRiQueries(Array.isArray(queriesRes.data) ? queriesRes.data : queriesRes.data?.data || []);
      }
    } catch (err) {
      console.error('Oversight load error:', err);
      toast.error('Failed to load oversight board data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRiskCandidates = async (page: number, status: 'New' | 'Dismissed' = candidateFilter) => {
    if (!house) return;
    setCandidateFilter(status);
    try {
      const res = await apiClient.get(`/governance/risk-candidates?house_id=${house.id}&status=${status}&page=${page}&limit=5`);
      const data = res.data?.data || [];
      setRiskCandidates(data);
      setTotalCandidates(res.data?.meta?.total || data.length);
      setCandidatePage(page);
    } catch (err) {
      toast.error("Failed to load risk candidates");
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
      const logId = openRes.data?.id || openRes.data?.data?.id;
      
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
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
      <span className=" uppercase  tracking-tighter">Syncing Oversight Board...</span>
    </div>
  );

  const sectionClass = "bg-card border-4 border-border p-8 ";
  const titleClass = "text-xl  uppercase  text-primary mb-6 tracking-tighter flex items-center gap-3";
  const badgeClass = "bg-primary text-primary-foreground px-3 py-1 text-xs  uppercase  tracking-widest";

  const hasSafeguardingOverride = isDeputyCover && highPrioritySignals.length > 0;

  const nextLabels: Record<number, string> = {
    1: "Next: Patterns",
    2: "Next: Candidates",
    3: "Next: Effectiveness",
    4: "Next: Sign-Off"
  };

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      
      {riQueries.length > 0 && (
        <div className="p-6 w-full max-w-6xl mx-auto mt-8">
            <div className="border-4 border-border bg-card  p-6">
                <div className="flex items-center gap-3 mb-6 text-destructive">
                    <Shield className="w-8 h-8" />
                    <h2 className="text-lg  uppercase  tracking-tighter">Outstanding RI Governance Queries</h2>
                </div>
                <div className="space-y-4">
                    {riQueries.map(q => (
                        <div key={q.id} className="p-6 border-4 border-border bg-muted/10">
                            <div className="flex justify-between items-start mb-4">
                                <div className="max-w-[80%]">
                                    <span className="text-[10px]  uppercase tracking-widest text-muted-foreground mb-2 block">WE: {new Date(q.week_ending).toLocaleDateString()} | Review Forensic Query</span>
                                    <p className="text-lg  ">"{q.query_text}"</p>
                                </div>
                                <button 
                                    onClick={() => handleQueryResponse(q.id)}
                                    className="bg-primary text-primary-foreground px-6 py-3  uppercase  tracking-widest hover:bg-primary transition-all"
                                >
                                    Justify
                                </button>
                            </div>
                            <div className="bg-card border-2 border-border p-4  text-xs text-muted-foreground">
                                <span className="block  uppercase not- text-[9px] mb-1">Your Narrative context</span>
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
          <div className="absolute top-1/2 left-0 w-full h-1 bg-primary/10 -translate-y-1/2 -z-10" />
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
                className={`w-12 h-12 flex items-center justify-center border-4 border-border  transition-all ${
                  activeSection === s.id ? 'bg-primary text-primary-foreground ' : 
                  s.id <= completedSection ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground/20'
                }`}
              >
                {s.id <= completedSection ? '✓' : s.id}
              </button>
              <span className={`text-[10px]  uppercase tracking-widest ${activeSection === s.id ? 'text-primary' : 'text-muted-foreground'}`}>
                {s.name}
              </span>
            </div>
          ))}
        </div>

        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-4 border-primary pb-6">
          <div>
            <h1 className="text-2xl  text-primary tracking-tighter uppercase  leading-none">Oversight Board</h1>
            <p className="text-muted-foreground  mt-2 tracking-wide uppercase text-sm">
              Service: <span className="text-primary">{house?.name}</span> | {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            {availableHouses.length > 1 && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px]  uppercase text-muted-foreground tracking-widest">Select Service</label>
                <select 
                  value={house?.id} 
                  onChange={(e) => loadOversightData(e.target.value)}
                  className="bg-card border-2 border-primary px-4 py-2  uppercase  text-sm outline-none cursor-pointer"
                >
                  {availableHouses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-2">
                <span className="text-xs  uppercase tracking-widest text-muted-foreground">Oversight Sequence Enforcement Active</span>
            </div>
          </div>
        </div>

        {/* Active Section Content */}
        <div className="min-h-[500px]">
          {activeSection === 1 && (
            <div className={sectionClass}>
              <h2 className={titleClass}><AlertTriangle className="w-8 h-8"/> 1: High Priority Triage</h2>
              <div className="space-y-4">
                {highPrioritySignals.length > 0 ? (
                  highPrioritySignals.map(s => (
                    <div key={s.id} className="p-6 border-4 border-border bg-muted/20 flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-destructive text-primary-foreground px-3 py-1 text-[10px]  uppercase  tracking-widest">{s.severity}</span>
                          <span className={badgeClass}>{s.signal_type}</span>
                          <span className="text-xs  text-muted-foreground ">{new Date(s.entry_date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xl   tracking-tight">{s.description}</p>
                      </div>
                      <button 
                        onClick={() => navigate(`/signals/${s.id}`)}
                        className="bg-primary text-primary-foreground px-8 py-3  uppercase  tracking-widest hover:bg-primary transition-all "
                      >
                        Review
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center border-4 border-dashed border-border">
                     <p className="text-lg  uppercase  text-muted-foreground">All Priority Signals Triaged</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === 2 && (
            <div className={sectionClass}>
              <h2 className={titleClass}><Activity className="w-8 h-8"/> 2: Pattern Signal Clusters</h2>
              {clusters.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  {clusters.map(c => (
                    <div key={c.id} className="p-6 border-4 border-border">
                        <div className="flex justify-between items-start mb-4">
                            <span className={badgeClass}>{c.risk_domain}</span>
                            <span className="  text-destructive text-xl">{c.signal_count}x</span>
                        </div>
                        <div className="flex flex-col gap-1 mb-2">
                            <h3 className="text-lg  uppercase  m-0">{c.cluster_label}</h3>
                            {c.linked_person && (
                                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-sm w-fit uppercase font-bold tracking-wider border border-primary/20">
                                    Ref: {c.linked_person}
                                </span>
                            )}
                        </div>
                        <div className="bg-primary h-2 w-full mb-4">
                            <div className="bg-primary h-full" style={{ width: `${Math.min(c.signal_count * 20, 100)}%` }}></div>
                        </div>
                        <button 
                            onClick={() => navigate(`/risks/promote?cluster_id=${c.id}`)}
                            className="w-full py-3 border-2 border-border  uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all"
                        >
                            Analyse Cluster
                        </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center border-4 border-dashed border-border">
                  <p className="text-lg  uppercase  text-muted-foreground">No emerging patterns requiring review</p>
                </div>
              )}
            </div>
          )}

          {activeSection === 3 && (
            <div className={sectionClass}>
              <div className="flex justify-between items-center mb-6">
                <h2 className={titleClass} style={{ marginBottom: 0 }}><Shield className="w-8 h-8"/> 3: Risk Candidates</h2>
                <div className="flex border-2 border-border overflow-hidden">
                  <button 
                    onClick={() => fetchRiskCandidates(1, 'New')}
                    className={`px-4 py-2 text-[10px] uppercase tracking-widest transition-all ${candidateFilter === 'New' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
                  >
                    Active
                  </button>
                  <button 
                    onClick={() => fetchRiskCandidates(1, 'Dismissed')}
                    className={`px-4 py-2 text-[10px] uppercase tracking-widest transition-all ${candidateFilter === 'Dismissed' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
                  >
                    Dismissed
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {riskCandidates.length > 0 ? (
                  riskCandidates.map(rc => (
                    <div 
                      key={rc.id} 
                      onClick={() => navigate(`/risks/promote?candidate_id=${rc.id}`)}
                      className={`p-6 border-4 border-border cursor-pointer transition-colors ${candidateFilter === 'Dismissed' ? 'bg-muted/30 grayscale' : 'bg-destructive/5 hover:bg-destructive/10'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`${candidateFilter === 'Dismissed' ? 'bg-muted' : 'bg-destructive'} text-primary-foreground px-3 py-1 text-[10px]  uppercase  tracking-widest mb-2 inline-block`}>
                            {rc.candidate_type}
                          </span>
                          <h3 className="text-lg  uppercase  tracking-tighter">
                            {rc.risk_domain} Risk Candidate
                            {rc.linked_person && (
                              <span className="ml-3 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-sm uppercase font-bold tracking-wider border border-primary/20">
                                {rc.linked_person}
                              </span>
                            )}
                          </h3>
                          {candidateFilter === 'Dismissed' && (
                            <p className="text-xs text-muted-foreground mt-1 italic">Reason: {rc.dismissal_reason || 'No reason provided'}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px]  uppercase text-muted-foreground">Detected</span>
                          <span className="">{new Date(rc.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center border-4 border-dashed border-border">
                    <p className="text-lg  uppercase  text-muted-foreground">No {candidateFilter === 'New' ? 'pending' : 'dismissed'} risk candidates</p>
                  </div>
                )}
              </div>

              {totalCandidates > 5 && (
                <div className="mt-8 flex justify-center items-center gap-6 pt-6 border-t-2 border-border/10">
                  <button 
                    onClick={() => fetchRiskCandidates(candidatePage - 1)}
                    disabled={candidatePage === 1}
                    className="p-2 border-2 border-border hover:bg-muted disabled:opacity-20 transition-all uppercase text-[10px] tracking-widest"
                  >
                    Previous
                  </button>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    Page {candidatePage} of {Math.ceil(totalCandidates / 5)}
                  </span>
                  <button 
                    onClick={() => fetchRiskCandidates(candidatePage + 1)}
                    disabled={candidatePage * 5 >= totalCandidates}
                    className="p-2 border-2 border-border hover:bg-muted disabled:opacity-20 transition-all uppercase text-[10px] tracking-widest"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}

          {activeSection === 4 && (
            <div className={sectionClass}>
              <h2 className={titleClass}><FileText className="w-8 h-8"/> 4: Actions & Effectiveness</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                 <div>
                    <h3 className="text-sm  uppercase tracking-[0.2em] mb-4 text-muted-foreground">Open Mitigation Actions</h3>
                    <div className="space-y-4">
                       {openActions.map(a => (
                         <div key={a.id} className="p-4 border-2 border-border">
                            <p className=" ">{a.title}</p>
                            <p className="text-[10px]  uppercase text-muted-foreground">Due: {new Date(a.due_date).toLocaleDateString()}</p>
                         </div>
                       ))}
                    </div>
                 </div>
                 <div>
                    <h3 className="text-sm  uppercase tracking-[0.2em] mb-4 text-muted-foreground">Recent Effectiveness Outcomes</h3>
                    <div className="space-y-4">
                       {effectivenessUpdates.map(e => (
                         <div key={e.id} className={`p-4 border-2 border-border ${
                           e.outcome === 'Effective' ? 'bg-success/10 border-success' : 
                           e.outcome === 'Ineffective' ? 'bg-destructive/10 border-destructive' : 'bg-muted/20'
                         }`}>
                            <div className="flex justify-between items-center mb-1">
                               <p className="  uppercase text-xs">{e.risk_domain}</p>
                               <span className={`text-[10px]  uppercase px-2 py-0.5 ${
                                 e.outcome === 'Effective' ? 'bg-success text-primary-foreground' : 
                                 e.outcome === 'Ineffective' ? 'bg-destructive text-primary-foreground' : 'bg-primary text-primary-foreground'
                               }`}>{e.outcome}</span>
                            </div>
                            <p className="text-[10px]  text-muted-foreground">Based on post-action signal frequency</p>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeSection === 5 && (
            <div className={sectionClass}>
              <h2 className={titleClass}><Plus className="w-8 h-8"/> 5: Close Loop & Sign-Off</h2>
              
              {hasSafeguardingOverride && (
                <div className="p-6 border-4 border-destructive bg-destructive/10 mb-8 animate-pulse">
                   <p className="text-destructive  uppercase  text-lg mb-2">SAFEGUARDING OVERRIDE DETECTED</p>
                   <p className=" text-sm">
                     High/Critical signals exist while Deputy RM is reviewing. 
                     Signing off will trigger an IMMEDIATE director notification and 
                     flag this log for ENHANCED OVERSIGHT.
                   </p>
                </div>
              )}

              <div className="mb-8">
                <label className="block mb-4 text-sm  uppercase tracking-widest text-muted-foreground">Daily Governance Narrative (Mandatory)</label>
                <textarea 
                  value={dailyNote}
                  onChange={e => setDailyNote(e.target.value)}
                  className="w-full h-64 p-6 border-4 border-border text-xl  focus:outline-none focus:ring-0 "
                  placeholder="Considering all triage, clusters, and candidates above—what is the service position today?"
                />
              </div>
              <div className="p-6 border-4 border-border bg-primary text-primary-foreground mb-8">
                 <p className=" uppercase  text-lg mb-2 underline decoration-primary decoration-4 underline-offset-4">Governance Attestation</p>
                 <p className=" opacity-80 text-sm">
                   I {isDeputyCover ? 'as Deputy RM ' : ''}hereby certify that I have reviewed all mandatory oversight sections for {house?.name} today. 
                   All high-priority signals have been triaged, and risk candidates have been evaluated. 
                   This entry constitutes a forensic audit point for CQC Well-Led inspections.
                 </p>
              </div>
              <button 
                onClick={handleSignOff}
                disabled={isSigningOff || !dailyNote.trim()}
                className="w-full py-6 bg-primary text-primary-foreground  uppercase  text-lg tracking-widest  hover: hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50"
              >
                {isSigningOff ? 'SIGNING OFF...' : 'SIGN-OFF DAILY GOVERNANCE'}
              </button>
            </div>
          )}
        </div>

        {/* Global Navigation Row */}
        <div className="mt-12 flex justify-between items-center pb-20">
           <button 
             onClick={() => setActiveSection(prev => Math.max(1, prev - 1))}
             disabled={activeSection === 1}
             className="px-10 py-4 border-4 border-border  uppercase  tracking-widest disabled:opacity-20 hover:bg-muted transition-all"
           >
             Previous
           </button>
           
           {activeSection < 5 ? (
             <button 
               onClick={() => {
                 setCompletedSection(Math.max(completedSection, activeSection));
                 setActiveSection(activeSection + 1);
               }}
               className="px-10 py-4 bg-primary text-primary-foreground  uppercase  tracking-widest  hover: hover:translate-x-1 hover:translate-y-1 transition-all"
             >
               {nextLabels[activeSection]}
             </button>
           ) : (
             <div className="w-[180px]" />
           )}
        </div>
      </div>
    </div>
  );
}
