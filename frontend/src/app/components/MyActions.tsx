import { useState, useEffect } from "react";
import { RoleBasedNavigation } from "./RoleBasedNavigation";
import { useNavigate } from "react-router";
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, MessageSquare, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { apiClient } from "@/services/api";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface AssignedAction {
  id: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  risk_title: string;
  assigned_by_name: string;
  risk_id: string;
}

export function MyActions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [actions, setActions] = useState<AssignedAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState<AssignedAction | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [outcome, setOutcome] = useState("");
  const [rationale, setRationale] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    fetchActions();
  }, []);

  const fetchActions = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.get("/actions/my");
      setActions(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch assigned actions:", error);
      toast.error("Failed to load assigned actions.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteClick = (action: AssignedAction) => {
    setSelectedAction(action);
    setShowModal(true);
  };

  const submitCompletion = async () => {
    if (!outcome || !rationale) {
      toast.error("Please provide both outcome and rationale.");
      return;
    }

    if (rationale.length < 10) {
      toast.error("Rationale must be at least 10 characters.");
      return;
    }

    try {
      await apiClient.patch(`/actions/${selectedAction?.id}/complete`, {
        completion_outcome: outcome,
        completion_rationale: rationale,
        completion_note: note
      });
      toast.success("Action marked as completed.");
      setShowModal(false);
      setOutcome("");
      setRationale("");
      setNote("");
      fetchActions();
    } catch (error: any) {
      console.error("Failed to complete action:", error);
      toast.error(error.response?.data?.message || "Failed to complete action.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RoleBasedNavigation />
      <div className="p-6 w-full pt-20">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate("/dashboard")} className="hover:bg-primary hover:text-white">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl text-primary uppercase tracking-tighter">My Action Tracker</h1>
            <p className="text-muted-foreground">Governance implementation and risk mitigation tasks assigned to you.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {actions.length === 0 ? (
            <div className="bg-card border-2 border-dashed border-border p-12 text-center rounded-lg">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <p className="text-xl text-muted-foreground uppercase tracking-widest opacity-40">No active actions assigned to you.</p>
            </div>
          ) : (
            actions.map((action) => (
              <Card key={action.id} className="border-2 border-border hover:border-primary/40 transition-colors">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-foreground">{action.title}</h3>
                        <span className={`px-3 py-1 text-[10px] uppercase tracking-widest font-bold rounded-full ${
                          action.status === 'Completed' ? 'bg-success/10 text-success border border-success/30' :
                          action.status === 'Overdue' ? 'bg-destructive/10 text-destructive border border-destructive/30' :
                          'bg-warning/10 text-warning border border-warning/30'
                        }`}>
                          {action.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{action.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <AlertCircle className="w-4 h-4 text-primary" />
                          <span>Risk: {action.risk_title || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MessageSquare className="w-4 h-4 text-primary" />
                          <span>Assigned by: {action.assigned_by_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 text-primary" />
                          <span>Due: {new Date(action.due_date).toLocaleDateString('en-GB')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center gap-3">
                      {action.status !== 'Completed' ? (
                        <Button 
                          onClick={() => handleCompleteClick(action)}
                          className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg tracking-tighter"
                        >
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          COMPLETE ACTION
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          onClick={() => navigate(`/risk-register/${action.risk_id}`)}
                          className="border-border hover:bg-muted"
                        >
                          View Related Risk
                          <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Completion Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border-2 border-primary w-full max-w-2xl shadow-2xl overflow-hidden rounded-lg animate-in fade-in zoom-in duration-200">
            <div className="bg-primary p-6">
              <h2 className="text-2xl font-bold text-primary-foreground uppercase tracking-tighter">Complete Action</h2>
              <p className="text-primary-foreground/70">{selectedAction?.title}</p>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Completion Outcome</label>
                <select 
                  className="w-full p-4 bg-muted border-2 border-border focus:border-primary outline-none transition-all rounded"
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                >
                  <option value="">Select Outcome...</option>
                  <option value="No change">No change - Systemic failure persists</option>
                  <option value="Partial improvement">Partial improvement - Further action required</option>
                  <option value="Risk reduced">Risk reduced - Controls verified as effective</option>
                  <option value="Risk escalated">Risk escalated - Situation beyond scope of current controls</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Governance Rationale (Min 10 chars)</label>
                <textarea 
                  className="w-full p-4 bg-muted border-2 border-border focus:border-primary outline-none transition-all min-h-[120px] rounded"
                  placeholder="Explain why this outcome was achieved and provide evidence of implementation..."
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Additional Notes (Optional)</label>
                <input 
                  type="text"
                  className="w-full p-4 bg-muted border-2 border-border focus:border-primary outline-none transition-all rounded"
                  placeholder="Any extra context for the Registered Manager..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1 py-6 border-border">CANCEL</Button>
                <Button onClick={submitCompletion} className="flex-1 py-6 bg-primary text-primary-foreground hover:bg-primary/90">SUBMIT COMPLETION</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
