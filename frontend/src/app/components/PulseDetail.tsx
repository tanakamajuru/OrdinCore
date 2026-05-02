import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, CheckCircle, Shield, Calendar, User, MapPin } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/services/apiClient";

interface Answer {
  question_id: string;
  question_text: string;
  answer: string;
  flagged: boolean;
}

interface PulseDetail {
  id: string;
  house_id: string;
  house_name: string;
  status: string;
  due_date: string;
  completed_at: string;
  completed_by_name: string;
  answers: Answer[];
}

export function PulseDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [pulse, setPulse] = useState<PulseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPulseDetails(id);
    }
  }, [id]);

  const loadPulseDetails = async (pulseId: string) => {
    try {
      setIsLoading(true);
      const res = await apiClient.get(`/governance/pulses/${pulseId}`);
      const data = (res.data as any).data || (res.data as any);
      setPulse(data);
    } catch (error) {
      console.error('Failed to load pulse details:', error);
      toast.error('Failed to load pulse details');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleString('en-GB') : 'N/A';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading pulse details...</p>
        </div>
      </div>
    );
  }

  if (!pulse) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-4">Pulse record not found</h2>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-[#008394] transition-colors"
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
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors mb-6 underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>

        <div className="mb-6 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-semibold text-foreground">Governance Pulse Review</h1>
              <span className="px-3 py-1 bg-primary text-primary-foreground flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {pulse.status}
              </span>
            </div>
            <p className="text-muted-foreground">
              {pulse.house_name} • Submitted {formatDate(pulse.completed_at)}
            </p>
          </div>
          <div className="text-right">
            <div className="bg-muted border-2 border-border p-4 flex flex-col gap-1 shadow-sm">
                <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Submitted By</span>
                <span className="text-foreground font-bold flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {pulse.completed_by_name || 'Team Leader'}
                </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-card border-2 border-border p-4 flex items-center gap-4">
                <Calendar className="w-8 h-8 text-primary" />
                <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase">Due Date</h3>
                    <p className="text-lg font-bold text-foreground">{new Date(pulse.due_date).toLocaleDateString('en-GB')}</p>
                </div>
            </div>
            <div className="bg-card border-2 border-border p-4 flex items-center gap-4">
                <CheckCircle className="w-8 h-8 text-success" />
                <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase">Compliance Status</h3>
                    <p className="text-lg font-bold text-foreground">Audit Verified</p>
                </div>
            </div>
        </div>

        <div className="space-y-4 pb-20">
          <h2 className="text-xl font-bold text-foreground border-b-2 border-border pb-2 mb-4">Submission Details</h2>
          {pulse.answers && pulse.answers.length > 0 ? (
            pulse.answers.map((answer, idx) => (
              <div key={answer.question_id || idx} className={`p-6 border-2 ${answer.flagged ? 'border-destructive bg-destructive/5' : 'border-border bg-card shadow-sm'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-foreground">{idx + 1}. {answer.question_text || 'Question'}</h3>
                  {answer.flagged && <span className="text-xs bg-destructive text-destructive-foreground px-2 py-1 font-bold">FLAGGED</span>}
                </div>
                <div className="p-3 bg-muted border-2 border-dashed border-border">
                    <p className="text-foreground font-medium">{answer.answer || 'No answer provided'}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 border-2 border-dashed border-border">
              <p className="text-muted-foreground italic">No answers found for this pulse record.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
