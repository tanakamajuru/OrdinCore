import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Calendar, 
  User, 
  FileText, 
  ShieldAlert, 
  Zap, 
  Layers,
  ArrowRight,
  ArrowLeft,
  Save,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { RoleBasedNavigation } from "./RoleBasedNavigation";

// Types from Spec
type SignalType = 'Incident' | 'Concern' | 'Observation' | 'Safeguarding' | 'Medication' | 'Staffing' | 'Environment' | 'Positive';
type SeverityType = 'Low' | 'Moderate' | 'High' | 'Critical';
type HappenedBeforeType = 'Yes' | 'No' | 'Unsure';
type PatternConcernType = 'None' | 'Possible' | 'Clear' | 'Escalating';
type EscalationType = 'None' | 'Manager Review' | 'Urgent Review' | 'Immediate Escalation';

const DOMAINS = ['Behaviour', 'Medication', 'Staffing', 'Physical', 'Mental', 'Safeguarding', 'Environment', 'Governance'];

interface House { id: string; name: string; }

const FieldWrapper = ({ step, title, icon: Icon, children, currentStep, nextStep, prevStep, validateStep, handleSubmit, isSubmitting }: any) => (
    <div className={`transition-all duration-500 ${currentStep === step ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none hidden'}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary/10 rounded-xl text-primary">
          <Icon size={24} />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Step {step} of 11</span>
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        </div>
      </div>
      <div className="bg-card border-2 border-border p-8 shadow-xl">
        {children}
        <div className="mt-8 flex justify-between items-center">
          <div>
            {step > 1 && (
              <button 
                  onClick={prevStep}
                  className="flex items-center gap-2 px-6 py-3 bg-muted text-muted-foreground hover:bg-muted/80 transition-all font-bold"
              >
                <ArrowLeft size={20} /> Previous
              </button>
            )}
          </div>
          <div>
            {step < 11 ? (
               <button 
                  onClick={nextStep}
                  disabled={!validateStep(step)}
                  className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all font-bold"
               >
                 Next <ArrowRight size={20} />
               </button>
            ) : (
              <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting || !validateStep(11)}
                  className="flex items-center gap-2 px-8 py-3 bg-success text-primary-foreground hover:bg-success/90 disabled:opacity-50 transition-all font-bold"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Signal'} <Save size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  
export function SignalCaptureForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [houses, setHouses] = useState<House[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    entry_time: new Date().toTimeString().slice(0, 5),
    house_id: '',
    signal_type: '' as SignalType,
    risk_domain: [] as string[],
    description: '',
    immediate_action: '',
    severity: '' as SeverityType,
    has_happened_before: '' as HappenedBeforeType,
    pattern_concern: '' as PatternConcernType,
    escalation_required: '' as EscalationType,
    evidence_url: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadHouses();
  }, []);

  const loadHouses = async () => {
    try {
      // RMs and TLs should only see their assigned houses if possible
      const housesRes = await apiClient.get('/houses?limit=100');
      const hData = (housesRes as any).data || (housesRes as any) || [];
      const housesList = Array.isArray(hData) ? hData : [];
      
      setHouses(housesList);
      if (housesList.length > 0) {
        setFormData(prev => ({ ...prev, house_id: housesList[0].id }));
      }
    } catch (err) {
      console.error('Failed to load houses', err);
      toast.error("Failed to load houses");
    }
  };

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleDomain = (domain: string) => {
    setFormData(prev => ({
      ...prev,
      risk_domain: prev.risk_domain.includes(domain)
        ? prev.risk_domain.filter(d => d !== domain)
        : [...prev.risk_domain, domain]
    }));
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 11));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const validateStep = (step: number) => {
    switch (step) {
      case 1: return !!formData.entry_date;
      case 2: return !!formData.entry_time;
      case 3: return !!formData.house_id;
      case 4: return !!formData.signal_type;
      case 5: return formData.risk_domain.length > 0;
      case 6: return formData.description.length > 10;
      case 7: return true; // immediate_action optional? Spec says 'description' NOT NULL, others silent.
      case 8: return !!formData.severity;
      case 9: return !!formData.has_happened_before;
      case 10: return !!formData.pattern_concern;
      case 11: return !!formData.escalation_required;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await apiClient.post('/pulses', formData);
      toast.success("Signal submitted successfully");
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit signal");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Removed redundant internal FieldWrapper to prevent re-render focus issues

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="max-w-3xl mx-auto pt-32 p-6">
        
        {/* Progress Bar */}
        <div className="w-full bg-muted h-2 mb-12 flex">
           <div 
             className="bg-primary h-full transition-all duration-700" 
             style={{ width: `${(currentStep / 11) * 100}%` }} 
           />
        </div>

        {/* Step 1: Date */}
        <FieldWrapper currentStep={currentStep} nextStep={nextStep} prevStep={prevStep} validateStep={validateStep} handleSubmit={handleSubmit} isSubmitting={isSubmitting} step={1} title="Date of Observation" icon={Calendar}>
          <input 
            type="date" 
            value={formData.entry_date} 
            onChange={e => handleFieldChange('entry_date', e.target.value)}
            className="w-full bg-input-background border-b-4 border-primary p-4 text-2xl focus:outline-none"
          />
        </FieldWrapper>

        {/* Step 2: Time */}
        <FieldWrapper currentStep={currentStep} nextStep={nextStep} prevStep={prevStep} validateStep={validateStep} handleSubmit={handleSubmit} isSubmitting={isSubmitting} step={2} title="Time of Observation" icon={Clock}>
          <input 
            type="time" 
            value={formData.entry_time} 
            onChange={e => handleFieldChange('entry_time', e.target.value)}
            className="w-full bg-input-background border-b-4 border-primary p-4 text-2xl focus:outline-none"
          />
        </FieldWrapper>

        {/* Step 3: House */}
        <FieldWrapper currentStep={currentStep} nextStep={nextStep} prevStep={prevStep} validateStep={validateStep} handleSubmit={handleSubmit} isSubmitting={isSubmitting} step={3} title="Service House" icon={Layers}>
          <select 
            value={formData.house_id} 
            onChange={e => handleFieldChange('house_id', e.target.value)}
            className="w-full bg-input-background border-b-4 border-primary p-4 text-2xl focus:outline-none appearance-none"
          >
            {houses.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </FieldWrapper>

        {/* Step 4: Signal Type */}
        <FieldWrapper currentStep={currentStep} nextStep={nextStep} prevStep={prevStep} validateStep={validateStep} handleSubmit={handleSubmit} isSubmitting={isSubmitting} step={4} title="What did you observe?" icon={Zap}>
          <div className="grid grid-cols-2 gap-4">
            {['Incident', 'Concern', 'Observation', 'Safeguarding', 'Medication', 'Staffing', 'Environment', 'Positive'].map(type => (
              <button
                key={type}
                onClick={() => handleFieldChange('signal_type', type)}
                className={`p-4 border-2 transition-all font-bold ${formData.signal_type === type ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/50'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </FieldWrapper>

        {/* Step 5: Risk Domains */}
        <FieldWrapper currentStep={currentStep} nextStep={nextStep} prevStep={prevStep} validateStep={validateStep} handleSubmit={handleSubmit} isSubmitting={isSubmitting} step={5} title="Which risk domains apply?" icon={ShieldAlert}>
          <div className="grid grid-cols-2 gap-4">
            {DOMAINS.map(domain => (
              <button
                key={domain}
                onClick={() => toggleDomain(domain)}
                className={`p-4 border-2 transition-all font-bold ${formData.risk_domain.includes(domain) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/50'}`}
              >
                {domain}
              </button>
            ))}
          </div>
        </FieldWrapper>

        {/* Step 6: Description */}
        <FieldWrapper currentStep={currentStep} nextStep={nextStep} prevStep={prevStep} validateStep={validateStep} handleSubmit={handleSubmit} isSubmitting={isSubmitting} step={6} title="Describe the observation" icon={FileText}>
          <textarea 
            value={formData.description}
            onChange={e => handleFieldChange('description', e.target.value)}
            placeholder="Provide factual details only..."
            className="w-full h-48 bg-input-background border-b-4 border-primary p-4 text-xl focus:outline-none resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">Minimum 10 characters required for defensible governance.</p>
        </FieldWrapper>

        {/* Step 7: Immediate Action */}
        <FieldWrapper currentStep={currentStep} nextStep={nextStep} prevStep={prevStep} validateStep={validateStep} handleSubmit={handleSubmit} isSubmitting={isSubmitting} step={7} title="Immediate Action Taken" icon={Check}>
          <textarea 
            value={formData.immediate_action}
            onChange={e => handleFieldChange('immediate_action', e.target.value)}
            placeholder="What was done at the time?"
            className="w-full h-32 bg-input-background border-b-4 border-primary p-4 text-xl focus:outline-none resize-none"
          />
        </FieldWrapper>

        {/* Step 8: Severity */}
        <FieldWrapper currentStep={currentStep} nextStep={nextStep} prevStep={prevStep} validateStep={validateStep} handleSubmit={handleSubmit} isSubmitting={isSubmitting} step={8} title="Potential Severity" icon={AlertTriangle}>
          <div className="flex flex-col gap-3">
            {['Low', 'Moderate', 'High', 'Critical'].map(sev => (
              <button
                key={sev}
                onClick={() => handleFieldChange('severity', sev)}
                className={`p-4 border-2 text-left font-bold transition-all ${formData.severity === sev ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}
              >
                {sev}
              </button>
            ))}
          </div>
        </FieldWrapper>

        {/* Step 9: Happened Before */}
        <FieldWrapper currentStep={currentStep} nextStep={nextStep} prevStep={prevStep} validateStep={validateStep} handleSubmit={handleSubmit} isSubmitting={isSubmitting} step={9} title="Has this happened before?" icon={Clock}>
          <div className="flex gap-4">
            {['Yes', 'No', 'Unsure'].map(val => (
              <button
                key={val}
                onClick={() => handleFieldChange('has_happened_before', val)}
                className={`flex-1 p-4 border-2 font-bold transition-all ${formData.has_happened_before === val ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}
              >
                {val}
              </button>
            ))}
          </div>
        </FieldWrapper>

        {/* Step 10: Pattern Concern */}
        <FieldWrapper currentStep={currentStep} nextStep={nextStep} prevStep={prevStep} validateStep={validateStep} handleSubmit={handleSubmit} isSubmitting={isSubmitting} step={10} title="Level of Pattern Concern" icon={Layers}>
          <div className="flex flex-col gap-3">
            {['None', 'Possible', 'Clear', 'Escalating'].map(val => (
              <button
                key={val}
                onClick={() => handleFieldChange('pattern_concern', val)}
                className={`p-4 border-2 text-left font-bold transition-all ${formData.pattern_concern === val ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}
              >
                {val}
              </button>
            ))}
          </div>
        </FieldWrapper>

        {/* Step 11: Escalation */}
        <FieldWrapper currentStep={currentStep} nextStep={nextStep} prevStep={prevStep} validateStep={validateStep} handleSubmit={handleSubmit} isSubmitting={isSubmitting} step={11} title="Escalation Required" icon={ShieldAlert}>
          <div className="flex flex-col gap-3">
            {['None', 'Manager Review', 'Urgent Review', 'Immediate Escalation'].map(val => (
              <button
                key={val}
                onClick={() => handleFieldChange('escalation_required', val)}
                className={`p-4 border-2 text-left font-bold transition-all ${formData.escalation_required === val ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border'}`}
              >
                {val}
              </button>
            ))}
          </div>
        </FieldWrapper>

      </div>
    </div>
  );
}
