import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, AlertCircle, Shield, Clock, User, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/services/api";

interface SignalDetail {
  id: string;
  house_id: string;
  house_name: string;
  creator_name: string;
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
}

export function SignalDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [signal, setSignal] = useState<SignalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadSignalDetails(id);
    }
  }, [id]);

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
          <h2 className="text-xl font-semibold text-foreground mb-4">Signal record not found</h2>
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
          className="flex items-center gap-2 text-foreground hover:text-muted-foreground transition-colors mb-6 underline font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-6 flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-black text-primary tracking-tighter uppercase italic">Signal Details</h1>
              <span className={`px-3 py-1 text-sm font-bold flex items-center gap-2 ${
                signal.review_status === 'New' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                <AlertCircle className="w-4 h-4" />
                {signal.review_status}
              </span>
            </div>
            <p className="text-muted-foreground font-medium">
              {signal.house_name} • Logged on {formatDate(signal.entry_date)} at {signal.entry_time.slice(0, 5)}
            </p>
          </div>
          <div className="bg-card border-2 border-border p-4 shadow-sm w-full md:w-auto">
              <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block mb-1">Submitted By</span>
              <span className="text-foreground font-bold flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {signal.creator_name || 'Team Leader'}
              </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border-2 border-border p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-1">Signal Type</h3>
                <p className="text-lg font-bold text-foreground">{signal.signal_type}</p>
            </div>
            <div className="bg-card border-2 border-border p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-1">Severity</h3>
                <p className={`text-lg font-bold ${signal.severity === 'High' || signal.severity === 'Critical' ? 'text-destructive' : 'text-foreground'}`}>
                    {signal.severity}
                </p>
            </div>
            <div className="bg-card border-2 border-border p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-1">Escalation</h3>
                <p className="text-lg font-bold text-foreground">{signal.escalation_required || 'None'}</p>
            </div>
            <div className="bg-card border-2 border-border p-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-1">Related Person</h3>
                <p className="text-lg font-bold text-foreground">{signal.related_person || 'N/A'}</p>
            </div>
        </div>

        <div className="space-y-6 pb-20">
            <div className="bg-card border-2 border-border p-6">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                    <Shield className="w-5 h-5 text-primary" />
                    Observation Details
                </h2>
                <div className="bg-muted p-4 border-l-4 border-primary">
                    <p className="text-foreground text-lg">{signal.description}</p>
                </div>
            </div>

            {signal.immediate_action && (
                <div className="bg-card border-2 border-border p-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-warning" />
                        Immediate Action Taken
                    </h2>
                    <p className="text-foreground">{signal.immediate_action}</p>
                </div>
            )}

            <div className="bg-card border-2 border-border p-6 flex justify-between">
               <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase">Pattern Concern</h3>
                  <p className="text-lg font-bold">{signal.pattern_concern}</p>
               </div>
               <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase">Happened Before</h3>
                  <p className="text-lg font-bold">{signal.has_happened_before}</p>
               </div>
               <div>
                  <h3 className="text-sm font-bold text-muted-foreground uppercase">Risk Domains</h3>
                  <p className="text-lg font-bold">{Array.isArray(signal.risk_domain) ? signal.risk_domain.join(', ') : signal.risk_domain}</p>
               </div>
            </div>
            
            {signal.review_status === 'New' && (
                <div className="flex justify-end mt-8">
                    <button 
                        onClick={async () => {
                            try {
                                await apiClient.patch(`/pulses/${signal.id}/status`, { review_status: 'Reviewed' });
                                toast.success('Signal marked as reviewed');
                                navigate('/dashboard');
                            } catch {
                                toast.error('Failed to update status');
                            }
                        }}
                        className="bg-primary text-primary-foreground px-6 py-3 font-bold hover:bg-primary/90 transition-colors"
                    >
                        Mark as Reviewed
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
