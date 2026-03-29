import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { AlertTriangle, Plus, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";
import { useAuth } from "@/hooks/useAuth";

interface House { id: string; name: string; address: string; }
interface PulseTemplate { id: string; name: string; }
interface Question { id: string; question: string; question_type: string; options: string[]; required: boolean; order_index: number; }
interface Pulse { id: string; status: string; due_date: string; completed_at: string | null; compliance_score: number | null; }

const HARDCODED_QUESTIONS: Question[] = [
  { 
    id: '00000000-0000-0000-0000-000000000011', 
    question: 'Have any new risks emerged since the last pulse?', 
    question_type: 'yes_no', 
    options: [], 
    required: true, 
    order_index: 0 
  },
  { 
    id: '00000000-0000-0000-0000-000000000012', 
    question: 'Are any existing risks increasing or deteriorating?', 
    question_type: 'yes_no', 
    options: [], 
    required: true, 
    order_index: 1 
  },
  { 
    id: '00000000-0000-0000-0000-000000000013', 
    question: 'Any safeguarding concerns or indicators this week?', 
    question_type: 'yes_no', 
    options: [], 
    required: true, 
    order_index: 2 
  },
  { 
    id: '00000000-0000-0000-0000-000000000014', 
    question: 'Any operational pressures affecting service stability?', 
    question_type: 'multiple_choice', 
    options: ['Staffing pressure', 'Behavioural support challenges', 'Medication concerns', 'Environmental issue', 'None'], 
    required: true, 
    order_index: 3 
  },
  { 
    id: '00000000-0000-0000-0000-000000000015', 
    question: 'Does anything require leadership attention?', 
    question_type: 'yes_no', 
    options: [], 
    required: true, 
    order_index: 4 
  }
];

const SYSTEM_TEMPLATE_ID = '00000000-0000-0000-0000-000000000001';

export function GovernancePulse() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = (user?.role || '').toUpperCase();
  const userId = user?.id;
 
  const [house, setHouse] = useState<House | null>(null);
  const [todayPulse, setTodayPulse] = useState<Pulse | null>(null);
  const [lastPulse, setLastPulse] = useState<Pulse | null>(null);
  const [nextPulseDate, setNextPulseDate] = useState<string>('');
  const [pulseDays, setPulseDays] = useState<string[]>(['Monday', 'Wednesday', 'Friday']);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRiskPrompt, setShowRiskPrompt] = useState(false);
  const [riskDescription, setRiskDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
 
  const currentDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
  });
 
  useEffect(() => { 
    // Init answers for hardcoded questions
    const initAnswers: Record<string, string> = {};
    HARDCODED_QUESTIONS.forEach(q => { initAnswers[q.id] = ''; });
    setAnswers(initAnswers);
    
    loadData(); 
  }, [user]);

  const loadData = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      // 1. Get house
      let myHouse: House | null = null;
      
      if (user.assigned_house_id) {
        myHouse = { 
          id: user.assigned_house_id, 
          name: user.assigned_house_name || 'Assigned House',
          address: '' 
        };
      } else if (['REGISTERED_MANAGER', 'RM', 'TEAM_LEADER', 'TL'].includes(userRole)) {
        const hRes = await apiClient.get(`/users/${userId}/houses`);
        const hData = (hRes.data as any).data || (hRes.data as any) || [];
        const houses = Array.isArray(hData) ? hData : [];
        if (houses.length > 0) {
          myHouse = houses[0];
        }
      } 
      
      // Fallback: If still no house, try fetching all company houses
      if (!myHouse) {
        const hRes = await apiClient.get('/houses');
        const hData = (hRes.data as any).data || (hRes.data as any) || {};
        const list = hData.houses || hData.items || (Array.isArray(hData) ? hData : []);
        if (list.length > 0) {
          myHouse = list[0];
        }
      }
      if (!myHouse) { setIsLoading(false); return; }
      setHouse(myHouse);

      // 2. House settings for pulse days
      try {
        const settingsRes = await apiClient.get(`/houses/${myHouse.id}/settings`);
        const settings = (settingsRes.data as any).data || (settingsRes.data as any) || {};
        if (settings.settings?.pulse_days) setPulseDays(settings.settings.pulse_days);
      } catch { /* use defaults */ }

      // 3. Load pulses for this house
      const pRes = await apiClient.get(`/governance/pulses?house_id=${myHouse.id}&limit=20`);
      const pData = (pRes.data as any).data || (pRes.data as any) || {};
      const pulses: Pulse[] = pData.pulses || pData.items || (Array.isArray(pData) ? pData : []);

      const todayStr = new Date().toDateString();
      const today = pulses.find(p => new Date(p.due_date).toDateString() === todayStr);
      const completed = pulses.filter(p => ['SUBMITTED', 'LOCKED', 'completed'].includes(p.status)).sort((a, b) =>
        new Date(b.completed_at || b.due_date).getTime() - new Date(a.completed_at || a.due_date).getTime()
      );
      const upcoming = pulses.filter(p => (p.status === 'DRAFT' || p.status === 'pending') && new Date(p.due_date) > new Date());

      setTodayPulse(today || null);
      setLastPulse(completed[0] || null);
      if (upcoming.length > 1) {
        setNextPulseDate(new Date(upcoming[1].due_date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' }));
      }

      if (today?.status === 'SUBMITTED' || today?.status === 'LOCKED' || today?.status === 'completed') setSubmitted(true);
    } catch (err: any) {
      console.error('GovernancePulse load error:', err);
      // Don't show toast error if it's just missing pulses for a brand new house
      if (err.response?.status !== 404) {
        toast.error('Failed to load pulse history');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string, isMulti?: boolean) => {
    if (isMulti) {
      const current = answers[questionId] ? answers[questionId].split(',') : [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      setAnswers(prev => ({ ...prev, [questionId]: updated.join(',') }));
    } else {
      setAnswers(prev => ({ ...prev, [questionId]: value }));
    }
  };

  const riskKeywords = ['risk', 'safeguarding', 'incident', 'deterioration', 'error', 'pressure', 'concern', 'escalation'];

  const checkForRiskFlag = () => {
    // Check if any yes_no answer flagged a risk or major concern
    for (const q of HARDCODED_QUESTIONS) {
      if (q.question_type === 'yes_no' && answers[q.id] === 'yes') {
        const qText = q.question.toLowerCase();
        if (riskKeywords.some(kw => qText.includes(kw))) {
          return true;
        }
      }
    }
    return false;
  };

  const handleSubmit = async () => {
    // Validate required questions answered
    const unanswered = HARDCODED_QUESTIONS.filter(q => q.required && !answers[q.id]);
    if (unanswered.length > 0) {
      toast.error(`Please answer all required questions (${unanswered.length} remaining)`);
      return;
    }

    const hasRiskFlag = checkForRiskFlag();
    if (hasRiskFlag && !showRiskPrompt) {
      // Find which questions were flagged to pre-fill description if needed
      const flaggedQs = HARDCODED_QUESTIONS.filter(q => q.question_type === 'yes_no' && answers[q.id] === 'yes' && riskKeywords.some(kw => q.question.toLowerCase().includes(kw)));
      const initialDesc = flaggedQs.map(q => `${q.question}: ${answers[`${q.id}_detail`] || 'No detail provided'}`).join('\n');
      setRiskDescription(initialDesc);
      setShowRiskPrompt(true);
      return;
    }

    await submitPulse();
  };

  const submitPulse = async () => {
    setIsSubmitting(true);
    try {
      let pulseId = todayPulse?.id;

      // Create pulse if none exists for today
      if (!pulseId && house) {
        const createRes = await apiClient.post('/governance/pulse', {
          house_id: house.id,
          template_id: SYSTEM_TEMPLATE_ID,
          due_date: new Date().toISOString(),
          status: 'pending'
        });
        const created = (createRes.data as any).data || (createRes.data as any);
        pulseId = created.id;
      }

      if (!pulseId) throw new Error('No pulse to submit');

      // Submit answers
      const answersPayload = HARDCODED_QUESTIONS.map(q => ({
        question_id: q.id,
        answer: answers[q.id] || '',
        answer_value: { value: answers[q.id] },
        flagged: q.question_type === 'yes_no' && answers[q.id] === 'yes',
      }));

      await apiClient.post(`/governance/pulses/${pulseId}/submit`, { answers: answersPayload });

      // Create risk if flagged and description given
      if (showRiskPrompt && riskDescription && house) {
        try {
          await apiClient.post('/risks', {
            house_id: house.id,
            title: 'Risk from Governance Pulse',
            description: riskDescription,
            severity: 'High',
            status: 'Open',
            likelihood: 3,
            impact: 4,
          });
          toast.success('Risk created in Risk Register');
        } catch { toast.error('Risk created in pulse but failed to add to register'); }
      }

      toast.success('Governance Pulse submitted successfully!');
      setSubmitted(true);
      setShowRiskPrompt(false);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit pulse');
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
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 pt-20 flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-primary mb-2">Pulse Submitted!</h2>
          <p className="text-muted-foreground mb-4">Your governance pulse for today has been recorded.</p>
          <button onClick={() => navigate('/dashboard')} className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 md:px-12 lg:px-20 w-full pt-28 max-w-none">
        {/* Header */}
        <div className="mb-10 border-b-2 border-border pb-8">
          <h1 className="text-4xl font-bold text-primary mb-2 tracking-tight">Governance Pulse</h1>
          <div className="flex justify-between items-center mt-4">
            <div>
              <span className="text-muted-foreground">House: </span>
              <span className="font-medium text-foreground">{house?.name || '—'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Date: </span>
              <span className="font-medium text-foreground">{currentDate}</span>
            </div>
          </div>
        </div>

        {/* Pulse Schedule Info */}
        <div className="mb-8 bg-muted border-2 border-border p-4 shadow-sm">
          <div className="flex justify-between text-sm flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Pulse days: </span>
              <span className="font-medium text-foreground">{pulseDays.join(', ')}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Last completed: </span>
              <span className="font-medium text-foreground">
                {lastPulse ? new Date(lastPulse.completed_at || lastPulse.due_date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) : 'None yet'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Next due: </span>
              <span className="font-medium text-foreground">{nextPulseDate || '—'}</span>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {HARDCODED_QUESTIONS.map((q, idx) => (
            <div key={q.id} className={`bg-card border-2 border-border p-8 shadow-sm hover:shadow-md transition-all duration-300 ${q.question_type === 'text' ? 'lg:col-span-2' : ''}`}>
                <h3 className="font-semibold text-foreground mb-3">
                  {idx + 1}. {q.question}
                  {q.required && <span className="text-destructive ml-1">*</span>}
                </h3>

                {q.question_type === 'yes_no' && (
                  <div className="space-y-2">
                    {['no', 'yes'].map(val => (
                      <label key={val} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name={q.id}
                          value={val}
                          checked={answers[q.id] === val}
                          onChange={() => handleAnswerChange(q.id, val)}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <span className="text-foreground">{val === 'yes' ? 'Yes' : 'No'}</span>
                      </label>
                    ))}
                    {answers[q.id] === 'yes' && (
                      <textarea
                        placeholder="Please provide details..."
                        value={answers[`${q.id}_detail`] || ''}
                        onChange={e => handleAnswerChange(`${q.id}_detail`, e.target.value)}
                        className="w-full h-20 px-3 py-2 bg-input-background border-2 border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none mt-2"
                      />
                    )}
                  </div>
                )}

                {q.question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    {(q.options || []).map(opt => (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => handleAnswerChange(q.id, opt)}
                          className="w-4 h-4 text-primary focus:ring-primary"
                        />
                        <span className="text-foreground">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.question_type === 'multi_select' && (
                  <div className="space-y-2">
                    {(q.options || []).map(opt => (
                      <label key={opt} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          name={q.id}
                          value={opt}
                          checked={answers[q.id]?.split(',').includes(opt)}
                          onChange={() => handleAnswerChange(q.id, opt, true)}
                          className="w-4 h-4 text-primary focus:ring-primary rounded"
                        />
                        <span className="text-foreground">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.question_type === 'text' && (
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={e => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Your observations..."
                    className="w-full h-24 px-3 py-2 bg-input-background border-2 border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none"
                  />
                )}

                {q.question_type === 'scale' && (
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        onClick={() => handleAnswerChange(q.id, String(n))}
                        className={`w-10 h-10 border-2 font-semibold transition-colors ${
                          answers[q.id] === String(n) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:border-primary text-foreground'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                    <span className="text-sm text-muted-foreground self-center ml-2">1=Low, 5=High</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-12 pb-20">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Governance Pulse'}
            </button>
          </div>
        </div>

        {/* Risk Creation Prompt */}
        {showRiskPrompt && (
          <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card border-2 border-border p-6 w-full max-w-md mx-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-warning" />
                <h3 className="text-xl font-semibold text-primary">Create Risk Register Entry?</h3>
              </div>
              <p className="text-muted-foreground mb-4">
                A risk was identified in this pulse. Add it to the Risk Register for tracking?
              </p>
              <textarea
                value={riskDescription}
                onChange={e => setRiskDescription(e.target.value)}
                placeholder="Describe the risk in detail..."
                className="w-full h-24 px-3 py-2 bg-input-background border-2 border-border focus:outline-none focus:ring-2 focus:ring-primary text-foreground resize-none mb-4"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowRiskPrompt(false); submitPulse(); }}
                  className="px-4 py-2 bg-card text-foreground border-2 border-border hover:bg-muted transition-colors"
                >
                  Skip
                </button>
                <button
                  onClick={() => submitPulse()}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  {isSubmitting ? 'Submitting...' : 'Submit + Create Risk'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
}
