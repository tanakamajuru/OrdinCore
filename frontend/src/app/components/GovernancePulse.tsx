import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { AlertTriangle, Plus, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

interface House { id: string; name: string; address: string; }
interface PulseTemplate { id: string; name: string; }
interface Question { id: string; question: string; question_type: string; options: string[]; required: boolean; order_index: number; }
interface Pulse { id: string; status: string; due_date: string; completed_at: string | null; compliance_score: number | null; }

const riskKeywords = ['risk', 'safeguarding', 'incident', 'deterioration', 'error', 'pressure', 'concern', 'escalation'];

export function GovernancePulse() {
  const navigate = useNavigate();
  const userRole = (localStorage.getItem('userRole') || '').toUpperCase();
  const userId = JSON.parse(localStorage.getItem('user') || '{}').id;

  const [house, setHouse] = useState<House | null>(null);
  const [template, setTemplate] = useState<PulseTemplate | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
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

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      // 1. Get house
      let myHouse: House | null = null;
      if (userRole === 'REGISTERED_MANAGER') {
        const hRes = await apiClient.get(`/users/${userId}/houses`);
        const hData = (hRes.data as any).data || (hRes.data as any) || [];
        myHouse = Array.isArray(hData) ? hData[0] : hData;
      } else {
        // RI/Director: fetch all houses
        const hRes = await apiClient.get('/houses');
        const hData = (hRes.data as any).data || (hRes.data as any) || {};
        const list = hData.houses || hData.items || (Array.isArray(hData) ? hData : []);
        myHouse = list[0];
      }
      if (!myHouse) { setIsLoading(false); return; }
      setHouse(myHouse);

      // 2. House settings for pulse days
      try {
        const settingsRes = await apiClient.get(`/houses/${myHouse.id}/settings`);
        const settings = (settingsRes.data as any).data || (settingsRes.data as any) || {};
        if (settings.settings?.pulse_days) setPulseDays(settings.settings.pulse_days);
      } catch { /* use defaults */ }

      // 3. Get governance template
      const tRes = await apiClient.get('/governance/templates');
      const tData = (tRes.data as any).data || (tRes.data as any) || {};
      const templates = tData.templates || tData.items || (Array.isArray(tData) ? tData : []);
      const tmpl = templates[0];
      if (tmpl) {
        setTemplate(tmpl);
        // 4. Load questions
        const qRes = await apiClient.get(`/governance/templates/${tmpl.id}/questions`);
        const qData = (qRes.data as any).data || (qRes.data as any) || {};
        const qs = qData.questions || qData.items || (Array.isArray(qData) ? qData : []);
        const sorted = [...qs].sort((a: Question, b: Question) => a.order_index - b.order_index);
        setQuestions(sorted);
        // Init answers
        const initAnswers: Record<string, string> = {};
        sorted.forEach((q: Question) => { initAnswers[q.id] = ''; });
        setAnswers(initAnswers);
      }

      // 5. Load pulses for this house
      const pRes = await apiClient.get(`/governance/pulses?house_id=${myHouse.id}&limit=20`);
      const pData = (pRes.data as any).data || (pRes.data as any) || {};
      const pulses: Pulse[] = pData.pulses || pData.items || (Array.isArray(pData) ? pData : []);

      const todayStr = new Date().toDateString();
      const today = pulses.find(p => new Date(p.due_date).toDateString() === todayStr);
      const completed = pulses.filter(p => p.status === 'completed').sort((a, b) =>
        new Date(b.completed_at || b.due_date).getTime() - new Date(a.completed_at || a.due_date).getTime()
      );
      const upcoming = pulses.filter(p => p.status === 'pending' && new Date(p.due_date) > new Date());

      setTodayPulse(today || null);
      setLastPulse(completed[0] || null);
      if (upcoming.length > 1) {
        setNextPulseDate(new Date(upcoming[1].due_date).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'short' }));
      }

      if (today?.status === 'completed') setSubmitted(true);
    } catch (err: any) {
      console.error('GovernancePulse load error:', err);
      toast.error('Failed to load pulse data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const checkForRiskFlag = () => {
    // Check if any yes_no answer flagged a risk or major concern
    for (const q of questions) {
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
    const unanswered = questions.filter(q => q.required && !answers[q.id]);
    if (unanswered.length > 0) {
      toast.error(`Please answer all required questions (${unanswered.length} remaining)`);
      return;
    }

    const hasRiskFlag = checkForRiskFlag();
    if (hasRiskFlag && !showRiskPrompt) {
      // Find which questions were flagged to pre-fill description if needed
      const flaggedQs = questions.filter(q => q.question_type === 'yes_no' && answers[q.id] === 'yes' && riskKeywords.some(kw => q.question.toLowerCase().includes(kw)));
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
      if (!pulseId && house && template) {
        const createRes = await apiClient.post('/governance/pulse', {
          house_id: house.id,
          template_id: template.id,
          due_date: new Date().toISOString(),
          status: 'pending'
        });
        const created = (createRes.data as any).data || (createRes.data as any);
        pulseId = created.id;
      }

      if (!pulseId) throw new Error('No pulse to submit');

      // Submit answers
      const answersPayload = questions.map(q => ({
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
            severity: 'high',
            status: 'open',
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
      <div className="p-6 w-full pt-20 max-w-3xl">
        {/* Header */}
        <div className="mb-8 border-b-2 border-border pb-6">
          <h1 className="text-3xl font-semibold text-primary mb-2">Governance Pulse</h1>
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
        {questions.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border-2 border-gray-300 p-6">
            <p>No pulse template configured yet.</p>
            <p className="text-sm mt-2">Contact your Admin to set up governance questions.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id} className="bg-card border-2 border-border p-4 shadow-sm">
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

            <div className="flex justify-end mt-8">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 shadow-sm"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Governance Pulse'}
              </button>
            </div>
          </div>
        )}

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
    </div>
  );
}
