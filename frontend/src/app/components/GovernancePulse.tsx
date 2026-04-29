import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { 
  AlertCircle, 
  CheckCircle, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Activity, 
  Shield, 
  FileText, 
  ShieldAlert, 
  RotateCcw, 
  TrendingUp, 
  Send,
  Upload
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
import { useAuth } from "@/hooks/useAuth";

interface House { id: string; name: string; }

export function GovernancePulse() {
  const navigate = useNavigate();
  const { user } = useAuth();
 
  const [sites, setSites] = useState<House[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form State - 12 Field Sequence
  const [formData, setFormData] = useState({
    entry_date: new Date().toISOString().split('T')[0],
    entry_time: new Date().toTimeString().slice(0, 5),
    house_id: '',
    related_person: '',
    signal_type: 'Observation',
    risk_domain: [] as string[],
    description: '',
    immediate_action: '',
    severity: 'Low',
    has_happened_before: 'No',
    pattern_concern: 'None',
    escalation_required: 'No escalation',
    evidence_url: ''
  });

  useEffect(() => { 
    loadData(); 
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    try {
      const hRes = await apiClient.get('/houses');
      const hData = (hRes.data as any).data || (hRes.data as any) || [];
      const list = Array.isArray(hData) ? hData : (hData.houses || []);
      setSites(list);

      if (user.assigned_house_id) {
        setFormData(prev => ({ ...prev, house_id: user.assigned_house_id }));
      } else if (list.length > 0) {
        setFormData(prev => ({ ...prev, house_id: list[0].id }));
      }
    } catch (err) {
      toast.error('Failed to load services');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDomainToggle = (domain: string) => {
    setFormData(prev => ({
      ...prev,
      risk_domain: prev.risk_domain.includes(domain)
        ? prev.risk_domain.filter(d => d !== domain)
        : [...prev.risk_domain, domain]
    }));
  };

  const validateDescription = (text: string) => {
    const opinionWords = ['i think', 'maybe', 'possibly', 'lazy', 'bad', 'wrong', 'should have', 'ought to'];
    const found = opinionWords.filter(word => text.toLowerCase().includes(word));
    if (found.length > 0) {
      toast.warning(`Warning: Factual language preferred. Found subjective terms: ${found.join(', ')}`);
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.house_id) return toast.error("Please select a service/house");
    if (!formData.description.trim()) return toast.error("Description is mandatory (Field 6)");
    if (!formData.immediate_action.trim()) return toast.error("Immediate Action Taken is mandatory (Field 7)");
    if (formData.risk_domain.length === 0) return toast.error("Select at least one Risk Domain (Field 5)");

    validateDescription(formData.description);

    setIsSubmitting(true);
    try {
      await apiClient.post('/pulses', formData);
      toast.success('Governance Signal Recorded Successfully');
      setSubmitted(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit signal');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-background flex items-center justify-center pt-20">
      <div className="text-center max-w-md p-8 bg-card border-2 border-primary shadow-2xl">
        <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
        <h2 className="text-3xl font-black text-primary mb-2 italic tracking-tighter uppercase">SIGNAL RECORDED</h2>
        <p className="text-muted-foreground font-bold mb-6">The observation has been logged for management review.</p>
        <button onClick={() => navigate('/dashboard')} className="w-full py-3 bg-primary text-primary-foreground font-black uppercase italic tracking-widest hover:bg-primary/90 transition-all">
          Return to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 md:px-12 lg:px-24 pt-28 pb-20 max-w-5xl mx-auto">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b-4 border-primary pb-6">
          <div>
            <h1 className="text-5xl font-black text-primary tracking-tighter uppercase italic leading-none">Governance Pulse</h1>
            <p className="text-muted-foreground font-bold mt-2 tracking-wide uppercase text-sm">Daily Structured Observation Form</p>
          </div>
          <div className="flex gap-4">
             <div className="bg-card border-2 border-border px-4 py-2 flex items-center gap-3">
               <Calendar className="w-5 h-5 text-primary" />
               <span className="font-black text-lg">{new Date().toLocaleDateString('en-GB')}</span>
             </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Section 1: Context */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                <Clock className="w-4 h-4" /> 1. Observation Time
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="date" 
                  value={formData.entry_date} 
                  onChange={e => setFormData(prev => ({ ...prev, entry_date: e.target.value }))}
                  className="bg-card border-2 border-border p-3 font-bold focus:border-primary outline-none"
                />
                <input 
                  type="time" 
                  value={formData.entry_time} 
                  onChange={e => setFormData(prev => ({ ...prev, entry_time: e.target.value }))}
                  className="bg-card border-2 border-border p-3 font-bold focus:border-primary outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                <MapPin className="w-4 h-4" /> 2. Service / House
              </label>
              <select 
                value={formData.house_id}
                onChange={e => setFormData(prev => ({ ...prev, house_id: e.target.value }))}
                className="w-full bg-card border-2 border-border p-3 font-bold focus:border-primary outline-none appearance-none"
              >
                <option value="">Select Service...</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                <User className="w-4 h-4" /> 3. Related Person (Initials/ID)
              </label>
              <input 
                type="text" 
                placeholder="e.g. JD or ID-402"
                value={formData.related_person}
                onChange={e => setFormData(prev => ({ ...prev, related_person: e.target.value }))}
                className="w-full bg-card border-2 border-border p-3 font-bold focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                <Activity className="w-4 h-4" /> 4. Signal Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Incident', 'Concern', 'Observation', 'Safeguarding', 'Medication', 'Staffing', 'Environment', 'Positive signal'].map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, signal_type: type }))}
                    className={`py-2 px-1 text-[10px] font-black uppercase border-2 transition-all ${formData.signal_type === type ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/50'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                <Shield className="w-4 h-4" /> 5. Risk Domain(s)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Behaviour', 'Medication', 'Staffing', 'Physical health', 'Mental health', 'Safeguarding', 'Environment', 'Governance'].map(domain => (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => handleDomainToggle(domain)}
                    className={`py-2 px-1 text-[10px] font-black uppercase border-2 transition-all ${formData.risk_domain.includes(domain) ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]' : 'bg-card border-border hover:border-primary/50 opacity-60'}`}
                  >
                    {domain}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                <FileText className="w-4 h-4" /> 6. Description (Factual Observation Only)
              </label>
              <textarea 
                rows={4}
                placeholder="Describe exactly what happened or what was observed. Avoid opinions or interpretations."
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-card border-2 border-border p-4 font-bold focus:border-primary outline-none resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
                <ShieldAlert className="w-4 h-4" /> 7. Immediate Action Taken (Mandatory)
              </label>
              <textarea 
                rows={3}
                placeholder="What did staff do immediately to ensure safety?"
                value={formData.immediate_action}
                onChange={e => setFormData(prev => ({ ...prev, immediate_action: e.target.value }))}
                className="w-full bg-card border-2 border-primary/30 p-4 font-bold focus:border-primary outline-none resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                8. Severity
              </label>
              <div className="flex flex-col gap-1">
                {['Low', 'Moderate', 'High', 'Critical'].map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, severity: level }))}
                    className={`py-2 px-4 text-xs font-black uppercase border-2 text-left transition-all ${formData.severity === level ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/50'}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                9. Happened Before?
              </label>
              <div className="flex flex-col gap-1">
                {['Yes', 'No', 'Unsure'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, has_happened_before: val }))}
                    className={`py-2 px-4 text-xs font-black uppercase border-2 text-left transition-all ${formData.has_happened_before === val ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/50'}`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                10. Pattern Concern
              </label>
              <div className="flex flex-col gap-1">
                {['None', 'Possible repeat', 'Clear repeat', 'Escalating'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, pattern_concern: val }))}
                    className={`py-2 px-4 text-xs font-black uppercase border-2 text-left transition-all ${formData.pattern_concern === val ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/50'}`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
                11. Escalation Required
              </label>
              <div className="flex flex-col gap-1">
                {['No escalation', 'Manager review', 'Urgent review', 'Immediate escalation'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, escalation_required: val }))}
                    className={`py-2 px-4 text-xs font-black uppercase border-2 text-left transition-all ${formData.escalation_required === val ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary/50'}`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
               12. Evidence / Attachments (Optional)
            </label>
            <div className="bg-muted border-2 border-dashed border-border p-8 text-center hover:border-primary/50 transition-all cursor-pointer group">
              <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-2 group-hover:text-primary transition-colors" />
              <p className="text-sm font-bold text-muted-foreground uppercase">Upload observation photos or documents</p>
            </div>
          </div>

          <div className="pt-10 border-t-4 border-border flex justify-end gap-6">
            <button 
              type="button" 
              onClick={() => navigate('/dashboard')}
              className="px-8 py-4 border-2 border-border font-black uppercase tracking-widest hover:bg-muted transition-all"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="px-12 py-4 bg-primary text-primary-foreground font-black uppercase italic tracking-widest hover:bg-primary/90 transition-all shadow-xl flex items-center gap-3 disabled:opacity-50"
            >
              {isSubmitting ? <RotateCcw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              {isSubmitting ? "RECORDING..." : "COMMIT SIGNAL"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
