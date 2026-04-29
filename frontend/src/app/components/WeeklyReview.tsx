import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { WeeklyReviewStepNav } from "../../components/WeeklyReviewStepNav";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
import { Shield, Clock, Activity, FileText, AlertTriangle } from "lucide-react";

export function WeeklyReview() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [completedStep, setCompletedStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    step10_risk_analysis: [],
    step13_new_actions: []
  });
  const [status, setStatus] = useState<"Draft" | "Submitted" | "Locked">("Draft");

  useEffect(() => {
    loadReviewData();
  }, [id]);

  const loadReviewData = async () => {
    try {
      setIsLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      let houseId = user.assigned_house_id;

      if (!houseId || houseId === '1') {
        const hRes = await apiClient.get('/houses');
        const hData = hRes.data?.data || hRes.data || [];
        const houses = Array.isArray(hData) ? hData : (hData.items || []);
        if (houses.length > 0) {
          houseId = houses[0].id;
        } else {
          toast.error("No houses found.");
          setIsLoading(false);
          return;
        }
      }
      
      const weekEnding = new Date().toISOString().split('T')[0];
      const previewRes = await apiClient.get(`/weekly-reviews/prepare?house_id=${houseId}&week_ending=${weekEnding}`);
      const auto = previewRes.data?.data?.auto_population || {};
      setPreviewData(previewRes.data?.data || {});
      
      if (id && id !== 'new') {
        const reviewRes = await apiClient.get(`/weekly-reviews/${id}`);
        const reviewData = reviewRes.data?.data || reviewRes.data;
        setFormData(reviewData.content || {});
        setCurrentStep(reviewData.step_reached - 1 || 0);
        setCompletedStep(reviewData.step_reached - 1 || 0);
        setStatus(reviewData.status || 'Draft');
      } else {
        // Pre-fill Step 1-7 from auto-population
        setFormData((prev: any) => ({
          ...prev,
          step1_services: [houseId],
          step2_period: `${previewRes.data?.data?.week_range?.start} to ${previewRes.data?.data?.week_range?.end}`,
          step3_pulse_count: auto.pulse_count,
          step4_signals: auto.signals,
          step5_repeats: auto.repeats,
          step6_worsening: auto.worsening,
          step7_improvements: auto.improvements,
          // Initialize Step 10 from active risks
          step10_risk_analysis: auto.active_risks?.map((r: any) => ({
            risk_id: r.id,
            title: r.title,
            trajectory: r.current_trajectory || 'Stable',
            controls_effective: r.last_effectiveness === 'Effective' ? 'Yes' : 'Partially'
          })) || []
        }));
      }
    } catch (error) {
      console.error('Failed to load review:', error);
      toast.error('Failed to prepare review data');
    } finally {
      setIsLoading(false);
    }
  };

  const validateStep = (step: number) => {
    if (step === 7 && !formData.step8_interpretation) {
      toast.error("Step 8: Interpretation is mandatory");
      return false;
    }
    if (step === 10) {
      const hasIneffective = formData.step10_risk_analysis.some((r: any) => r.controls_effective === 'Partially' || r.controls_effective === 'No');
      if (hasIneffective && !formData.step11_control_failures) {
        toast.error("Step 11: Control failure analysis is mandatory when controls are ineffective");
        return false;
      }
    }
    if (step === 11 && !formData.step12_decisions) {
      toast.error("Step 12: Decisions required is mandatory");
      return false;
    }
    if (step === 13 && !formData.step14_overall_position) {
      toast.error("Step 14: Overall service position is mandatory");
      return false;
    }
    return true;
  };

  const handleNextStep = async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < 14) {
      const nextStepIndex = currentStep + 1;
      setIsSaving(true);
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const weekEnding = new Date().toISOString().split('T')[0];
        
        const saveRes = await apiClient.post(`/weekly-reviews`, {
          house_id: formData.step1_services?.[0],
          week_ending: weekEnding,
          content: formData,
          step_reached: nextStepIndex + 1
        });
        
        if (nextStepIndex === 14) {
          // Refresh narrative from server response if we just reached Step 15
          setFormData((prev: any) => ({
            ...prev,
            step15_narrative: saveRes.data?.data?.content?.step15_narrative || prev.step15_narrative
          }));
        }

        setCurrentStep(nextStepIndex);
        if (nextStepIndex > completedStep) {
          setCompletedStep(nextStepIndex);
        }
        window.scrollTo(0, 0);
      } catch (error) {
        toast.error('Failed to save progress');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmitAndLock = async () => {
    setIsSaving(true);
    try {
        const weekEnding = new Date().toISOString().split('T')[0];
        await apiClient.post(`/weekly-reviews`, {
          house_id: formData.step1_services?.[0],
          week_ending: weekEnding,
          content: formData,
          status: 'LOCKED',
          step_reached: 15
        });
        toast.success('Governance Review Locked & Published');
        navigate('/reports/weekly');
    } catch (error) {
      toast.error('Failed to lock review');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    const sectionClass = "bg-white border-2 border-black p-6 shadow-[8px_8px_0px_rgba(0,0,0,1)]";
    const titleClass = "text-xl font-black uppercase italic text-primary mb-6 flex items-center gap-2";
    const labelClass = "block mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground";
    const inputClass = "w-full px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-0 text-lg font-medium shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-4";
    const areaClass = "w-full h-32 px-4 py-3 bg-white border-2 border-black focus:outline-none focus:ring-0 text-lg font-medium resize-none shadow-[4px_4px_0px_rgba(0,0,0,1)] mb-4";

    switch(currentStep) {
      case 0: return (
        <div className={sectionClass}>
          <h2 className={titleClass}><Shield className="w-6 h-6"/> Step 1: Service Scope</h2>
          <label className={labelClass}>Assigned Service(s)</label>
          <div className="flex flex-wrap gap-2 mb-4">
             {formData.step1_services?.map((s: string) => (
               <span key={s} className="bg-black text-white px-3 py-1 text-xs font-black uppercase italic tracking-widest">
                 {previewData?.house_name || 'Your Service'}
               </span>
             ))}
          </div>
        </div>
      );
      case 1: return (
        <div className={sectionClass}>
          <h2 className={titleClass}><Clock className="w-6 h-6"/> Step 2: Review Period</h2>
          <label className={labelClass}>Reporting Window</label>
          <input readOnly value={formData.step2_period} className={inputClass} />
        </div>
      );
      case 2: return (
        <div className={sectionClass}>
          <h2 className={titleClass}><Activity className="w-6 h-6"/> Step 3: Pulse Compliance</h2>
          <label className={labelClass}>Entries Reviewed</label>
          <div className="text-6xl font-black italic tracking-tighter mb-4">{formData.step3_pulse_count}</div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Daily governance pulses recorded this week</p>
        </div>
      );
      case 3: return (
        <div className={sectionClass}>
          <h2 className={titleClass}><FileText className="w-6 h-6"/> Step 4: Signal Registry</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {formData.step4_signals?.map((s: any) => (
              <div key={s.id} className="p-4 border-2 border-black bg-muted/20">
                <div className="flex justify-between items-start mb-2">
                  <span className="bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase italic tracking-widest">{s.signal_type}</span>
                  <span className="font-bold text-xs">{new Date(s.entry_date).toLocaleDateString()}</span>
                </div>
                <p className="text-sm font-medium">{s.description}</p>
                <div className="mt-2 flex gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  <span>Domain: {s.risk_domain}</span>
                  <span>Severity: {s.severity}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      case 4: return (
        <div className={sectionClass}>
          <h2 className={titleClass}><AlertTriangle className="w-6 h-6"/> Step 5: Repeating Issues</h2>
          <label className={labelClass}>Identified Pattern Clusters</label>
          <textarea 
            value={formData.step5_repeats || ''} 
            onChange={e => setFormData({...formData, step5_repeats: e.target.value})}
            className={areaClass}
            placeholder="No clusters identified automatically..."
          />
        </div>
      );
      case 5: return (
        <div className={sectionClass}>
          <h2 className={titleClass}><AlertTriangle className="w-6 h-6 text-destructive"/> Step 6: Worsening Trends</h2>
          <label className={labelClass}>Escalating or Increased Severity</label>
          <textarea 
            value={formData.step6_worsening || ''} 
            onChange={e => setFormData({...formData, step6_worsening: e.target.value})}
            className={areaClass}
            placeholder="No worsening trends identified automatically..."
          />
        </div>
      );
      case 6: return (
        <div className={sectionClass}>
          <h2 className={titleClass}><Shield className="w-6 h-6 text-success"/> Step 7: Improvements</h2>
          <label className={labelClass}>Stabilised or Reduced Risks</label>
          <textarea 
            value={formData.step7_improvements || ''} 
            onChange={e => setFormData({...formData, step7_improvements: e.target.value})}
            className={areaClass}
          />
        </div>
      );
      case 7: return (
        <div className={sectionClass}>
          <h2 className={titleClass}>Step 8: Governance Interpretation</h2>
          <label className={labelClass}>What does this pattern mean for the service? (Mandatory)</label>
          <textarea 
            value={formData.step8_interpretation || ''} 
            onChange={e => setFormData({...formData, step8_interpretation: e.target.value})}
            className={`${areaClass} h-64 border-primary`}
            placeholder="Considering repetition and escalation, what is the current risk position?"
          />
        </div>
      );
      case 8: return (
        <div className={sectionClass}>
          <h2 className={titleClass}>Step 9: Affected Risks</h2>
          <p className="text-sm font-bold text-muted-foreground mb-4 italic">Show existing risks linked to signals this week.</p>
          {/* Mocked multi-select list for risks */}
          <div className="space-y-2">
            {formData.step10_risk_analysis?.map((r: any) => (
               <div key={r.risk_id} className="p-3 bg-black text-white text-sm font-black uppercase italic tracking-widest">
                 {r.title}
               </div>
            ))}
          </div>
        </div>
      );
      case 9: return (
        <div className={sectionClass}>
          <h2 className={titleClass}>Step 10: Risk Analysis Table</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-2 text-[10px] font-black uppercase tracking-widest">Risk</th>
                  <th className="text-left py-2 text-[10px] font-black uppercase tracking-widest">Trajectory</th>
                  <th className="text-left py-2 text-[10px] font-black uppercase tracking-widest">Controls Effective?</th>
                </tr>
              </thead>
              <tbody>
                {formData.step10_risk_analysis?.map((r: any, idx: number) => (
                  <tr key={r.risk_id} className="border-b border-gray-200">
                    <td className="py-4 font-bold text-sm">{r.title}</td>
                    <td className="py-4">
                      <select 
                        value={r.trajectory}
                        onChange={e => {
                          const newList = [...formData.step10_risk_analysis];
                          newList[idx].trajectory = e.target.value;
                          setFormData({...formData, step10_risk_analysis: newList});
                        }}
                        className="bg-transparent font-bold text-xs uppercase"
                      >
                        <option>Improving</option>
                        <option>Stable</option>
                        <option>Deteriorating</option>
                        <option>Critical</option>
                      </select>
                    </td>
                    <td className="py-4">
                      <select 
                        value={r.controls_effective}
                        onChange={e => {
                          const newList = [...formData.step10_risk_analysis];
                          newList[idx].controls_effective = e.target.value;
                          setFormData({...formData, step10_risk_analysis: newList});
                        }}
                        className={`bg-transparent font-bold text-xs uppercase ${r.controls_effective === 'No' ? 'text-destructive' : ''}`}
                      >
                        <option>Yes</option>
                        <option>Partially</option>
                        <option>No</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
      case 10: return (
        <div className={sectionClass}>
          <h2 className={titleClass}>Step 11: Control Failure Analysis</h2>
          <label className={labelClass}>Where did controls fail? (Mandatory if Ineffective)</label>
          <textarea 
            value={formData.step11_control_failures || ''} 
            onChange={e => setFormData({...formData, step11_control_failures: e.target.value})}
            className={areaClass}
            placeholder="e.g. PRN protocol not followed, escalation missed..."
          />
        </div>
      );
      case 11: return (
        <div className={sectionClass}>
          <h2 className={titleClass}>Step 12: Decisions Required</h2>
          <label className={labelClass}>What actions are needed now? (Mandatory)</label>
          <textarea 
            value={formData.step12_decisions || ''} 
            onChange={e => setFormData({...formData, step12_decisions: e.target.value})}
            className={areaClass}
            placeholder="e.g. increase monitoring, review care plans..."
          />
        </div>
      );
      case 12: return (
        <div className={sectionClass}>
          <h2 className={titleClass}>Step 13: Action Tracker</h2>
          <button className="w-full py-4 border-2 border-dashed border-black text-sm font-black uppercase tracking-widest hover:bg-muted mb-6">
            + Create New Governance Action
          </button>
          <div className="space-y-4">
             {formData.step13_new_actions?.map((a: any, idx: number) => (
                <div key={idx} className="p-4 border-2 border-black">
                  <p className="font-bold">{a.title}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Assignee: {a.owner} | Due: {a.due}</p>
                </div>
             ))}
          </div>
        </div>
      );
      case 13: return (
        <div className={sectionClass}>
          <h2 className={titleClass}>Step 14: Overall Service Position</h2>
          <div className="grid grid-cols-1 gap-2">
            {['Stable', 'Watch', 'Concern', 'Escalating', 'Serious Concern'].map(p => (
              <button
                key={p}
                onClick={() => setFormData({...formData, step14_overall_position: p})}
                className={`py-4 px-6 text-left font-black uppercase italic border-2 border-black transition-all ${
                  formData.step14_overall_position === p ? 'bg-black text-white shadow-[4px_4px_0px_rgba(255,0,0,1)]' : 'bg-white hover:bg-muted'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      );
      case 14: return (
        <div className={sectionClass}>
          <h2 className={titleClass}>Step 15: Governance Narrative</h2>
          <label className={labelClass}>Review & Finalise Paragraph (Mandatory)</label>
          <textarea 
            value={formData.step15_narrative || ''} 
            onChange={e => setFormData({...formData, step15_narrative: e.target.value})}
            className={`${areaClass} h-80 font-serif leading-relaxed text-base`}
          />
          <p className="text-[10px] font-bold text-muted-foreground italic">This narrative will be pushed to the Director and NI Dashboards upon locking.</p>
        </div>
      );
      default: return null;
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3" />
      <span className="font-black uppercase tracking-widest italic">Syncing Doctrine Logic...</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB]">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-24 max-w-4xl mx-auto">
        <div className="mb-12 border-b-4 border-black pb-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-5xl font-black uppercase italic tracking-tighter text-primary">Governance Review</h1>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground mt-2">RM Sequential Oversight | Phase {currentStep + 1} of 15</p>
            </div>
            <div className="text-right">
               <span className="block text-[10px] font-black uppercase text-muted-foreground">Status</span>
               <span className="inline-block px-3 py-1 bg-black text-white text-xs font-black uppercase italic tracking-widest">{status}</span>
            </div>
          </div>
        </div>

        <WeeklyReviewStepNav activeStep={currentStep} completedStep={completedStep} />

        <div className="mb-12">
          {renderStepContent()}
        </div>

        <div className="flex justify-between items-center mt-12 pb-12">
          <button
            onClick={handlePrevStep}
            disabled={currentStep === 0 || isSaving}
            className="py-4 px-8 bg-white text-black border-2 border-black hover:bg-gray-100 transition-colors font-black uppercase tracking-widest disabled:opacity-50 shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            Previous
          </button>
          
          {currentStep < 14 ? (
            <button
              onClick={handleNextStep}
              disabled={isSaving || status === 'Locked'}
              className="py-4 px-10 bg-black text-white hover:bg-primary transition-all font-black uppercase italic tracking-widest disabled:opacity-50 shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              {isSaving ? 'Synching...' : 'Validate & Proceed'}
            </button>
          ) : (
            <button
              onClick={handleSubmitAndLock}
              disabled={isSaving || status === 'Locked'}
              className="py-4 px-10 bg-destructive text-white hover:bg-black transition-all font-black uppercase italic tracking-widest disabled:opacity-50 shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px]"
            >
              {isSaving ? 'Locking...' : 'LOCK & PUBLISH GOVERNANCE'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
